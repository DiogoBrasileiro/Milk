import { mergeFamilySnapshots, mergeRecordLists } from '../src/lib/familyPersistence';

type Snapshot = Record<string, any>;

export interface StoredFamilySnapshot {
  value: Snapshot;
  updatedAt: string | null;
}

/** The adapter must distinguish an inaccessible database from a missing row. */
export interface FamilySnapshotStore {
  read(key: string): Promise<StoredFamilySnapshot | null>;
  insert(key: string, value: Snapshot, updatedAt: string): Promise<boolean>;
  replace(key: string, previousRevision: string | null, value: Snapshot, updatedAt: string): Promise<boolean>;
}

function object(value: any): value is Snapshot {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function familySnapshotData(snapshot: any): Snapshot {
  if (!object(snapshot)) throw new Error('Invalid family snapshot; existing data was preserved.');
  const data = snapshot.data ?? snapshot.familyData ?? snapshot;
  if (!object(data)) throw new Error('Invalid family data; existing data was preserved.');
  return data;
}

/** Preserve each historical envelope while merging records, never replacing lists. */
export function mergeFamilyEnvelope(familyId: string, previous: Snapshot | null, incoming: Snapshot): Snapshot {
  const incomingData = familySnapshotData(incoming);
  if ((incoming.familyId && incoming.familyId !== familyId)
    || (incoming.family?.id && incoming.family.id !== familyId)
    || (incomingData.familyId && incomingData.familyId !== familyId)) {
    throw new Error('Family snapshot does not match its destination.');
  }
  const existing = previous ?? {};
  const mergedData = mergeFamilySnapshots(familySnapshotData(existing), incomingData);
  mergedData.familyId = familyId;

  const envelopeKey = object(existing.data) ? 'data'
    : object(existing.familyData) ? 'familyData'
    : previous === null && object(incoming.data) ? 'data'
    : previous === null && object(incoming.familyData) ? 'familyData' : null;
  const result = envelopeKey
    ? { ...(previous ?? incoming), [envelopeKey]: mergedData }
    : { ...mergedData };

  if (object(existing.family) || object(incoming.family)) {
    result.family = { ...(existing.family ?? {}), ...(incoming.family ?? {}), id: familyId };
  }
  if (Array.isArray(existing.babies) || Array.isArray(incoming.babies)) {
    result.babies = mergeRecordLists(existing.babies ?? [], incoming.babies ?? [], mergedData.deletedItemIds);
    if (mergedData.baby?.id) {
      result.babies = mergeRecordLists(result.babies, [mergedData.baby], mergedData.deletedItemIds);
    }
  }
  result.familyId = familyId;
  result._source = 'milkflow_app';
  result._syncedAt = new Date().toISOString();
  return result;
}

function nextRevision(previous: string | null): string {
  const prior = previous ? Date.parse(previous) : 0;
  // Every successful update changes the revision, even two saves in one ms.
  return new Date(Math.max(Date.now(), Number.isFinite(prior) ? prior + 1 : 0)).toISOString();
}

/**
 * Compare-and-swap protects against other tabs, processes and server replicas.
 * A failed read never becomes an upsert, and a zero-row update is never an ACK.
 */
export async function persistFamilySnapshot(
  store: FamilySnapshotStore,
  familyId: string,
  incoming: Snapshot,
  attempts = 6,
): Promise<Snapshot> {
  if (!familyId) throw new Error('Family ID is required.');
  familySnapshotData(incoming);
  const key = `family_data_${familyId}`;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const previous = await store.read(key);
    const merged = mergeFamilyEnvelope(familyId, previous?.value ?? null, incoming);
    const revision = nextRevision(previous?.updatedAt ?? null);
    const acknowledged = previous
      ? await store.replace(key, previous.updatedAt, merged, revision)
      : await store.insert(key, merged, revision);
    if (acknowledged) return merged;
    // A concurrent writer won. Re-read its records before trying again.
  }
  throw new Error('Concurrent family updates could not be confirmed. The pending changes must be retried.');
}

/** Keep one writer per family in this process; CAS still protects other processes. */
export class FamilyWriteQueue {
  private pending = new Map<string, Promise<unknown>>();

  run<T>(familyId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.pending.get(familyId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    this.pending.set(familyId, next);
    void next.finally(() => {
      if (this.pending.get(familyId) === next) this.pending.delete(familyId);
    }).catch(() => undefined);
    return next;
  }
}
