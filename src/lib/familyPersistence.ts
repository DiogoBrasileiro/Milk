// Shared by the browser and server. Missing records in a stale snapshot are
// never deletions: only an explicit, newer tombstone can remove a record.
export type FamilySnapshot = Record<string, any>;
export type DeletionMap = Record<string, string>;

export const FAMILY_RECORD_LISTS = [
  'batches', 'transactions', 'feedings', 'pumpings', 'diapers',
  'discomforts', 'weights', 'sleepLogs', 'medications', 'medicationLogs',
  'diaperStockItems', 'diaperStockTransactions', 'diaperShoppingItems',
  'feedingPhases', 'auditLogs', 'caregivers', 'aiInsights',
] as const;

const object = (value: any): value is FamilySnapshot =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function snapshotData(value: any): FamilySnapshot {
  if (!object(value)) return {};
  return object(value.data) ? value.data : object(value.familyData) ? value.familyData : value;
}

const time = (value: any): number => {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
};

export const recordModifiedAt = (item: any): number => time(
  item?.updatedAt || item?.createdAt || item?.timestamp || item?.extractedAt ||
  item?.startTime || item?.administeredAt || item?.dateTime || item?.date,
);

const eventTime = (item: any): number => time(
  item?.timestamp || item?.startTime || item?.extractedAt || item?.administeredAt ||
  item?.dateTime || item?.date || item?.createdAt || item?.updatedAt,
);

export function mergeDeletionMaps(...maps: (DeletionMap | undefined)[]): DeletionMap {
  const result: DeletionMap = {};
  for (const map of maps) {
    if (!object(map)) continue;
    for (const [id, deletedAt] of Object.entries(map)) {
      if (time(deletedAt) > time(result[id])) result[id] = deletedAt;
    }
  }
  return result;
}

export function mergeRecordLists<T>(local: T[] = [], incoming: T[] = [], deleted: DeletionMap = {}): T[] {
  const records = new Map<string, T>();
  const legacy = new Map<string, T>();
  for (const item of [...local, ...incoming]) {
    const id = (item as any)?.id;
    // Do not silently discard historical entries that cannot be merged by ID.
    if (typeof id !== 'string' || !id) {
      legacy.set(JSON.stringify(item), item);
      continue;
    }
    if (deleted[id] && recordModifiedAt(item) <= time(deleted[id])) continue;
    const existing = records.get(id);
    if (!existing || recordModifiedAt(item) >= recordModifiedAt(existing)) records.set(id, item);
  }
  return [...records.values(), ...legacy.values()].sort((a, b) => eventTime(b) - eventTime(a));
}

export function mergeFamilySnapshots(localValue: any, incomingValue: any): FamilySnapshot {
  const local = snapshotData(localValue);
  const incoming = snapshotData(incomingValue);
  const incomingIsNewer = time(incoming.lastUpdatedAt) >= time(local.lastUpdatedAt);
  const merged = incomingIsNewer ? { ...local, ...incoming } : { ...incoming, ...local };
  const deleted = mergeDeletionMaps(local.deletedItemIds, incoming.deletedItemIds);
  merged.deletedItemIds = deleted;
  for (const key of FAMILY_RECORD_LISTS) {
    if (Array.isArray(local[key]) || Array.isArray(incoming[key])) {
      merged[key] = mergeRecordLists(
        Array.isArray(local[key]) ? local[key] : [],
        Array.isArray(incoming[key]) ? incoming[key] : [],
        deleted,
      );
    }
  }
  if (object(local.baby) && object(incoming.baby)) {
    merged.baby = recordModifiedAt(incoming.baby) >= recordModifiedAt(local.baby)
      ? { ...local.baby, ...incoming.baby } : { ...incoming.baby, ...local.baby };
  }
  return merged;
}

export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PendingFamilyWrite {
  familyId: string;
  revision: string;
  data: FamilySnapshot;
  key: string;
}

export function uniqueRecordId(prefix: string): string {
  return `${prefix}_${globalThis.crypto.randomUUID()}`;
}

const outboxPrefix = (familyId: string) => `milkflow_outbox_v1:${encodeURIComponent(familyId)}:`;

export function readPendingFamilyWrites(storage: StorageLike, familyId: string): PendingFamilyWrite[] {
  const prefix = outboxPrefix(familyId);
  const result: PendingFamilyWrite[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const value = storage.getItem(key);
    if (!value) continue;
    const entry = JSON.parse(value);
    if (entry.familyId !== familyId || !object(entry.data) || typeof entry.revision !== 'string') {
      throw new Error('Há um envio pendente inválido. Preserve o backup deste navegador.');
    }
    result.push({ ...entry, key });
  }
  return result;
}

// Each tab has its own durable slot. An acknowledgement can remove only the
// exact revision sent, never a newer mutation recorded while it was in flight.
export class FamilyOutbox {
  private key: string;
  private inFlight: Promise<void> | null = null;
  private memory: PendingFamilyWrite | null = null;

  constructor(private storage: StorageLike, readonly familyId: string, writerId = uniqueRecordId('tab')) {
    this.key = outboxPrefix(familyId) + writerId;
  }

  pending(): PendingFamilyWrite[] {
    const entries = readPendingFamilyWrites(this.storage, this.familyId);
    if (this.memory && !entries.some(entry => entry.revision === this.memory!.revision)) {
      return [...entries.filter(entry => entry.key !== this.key), this.memory];
    }
    return entries;
  }

  enqueue(data: FamilySnapshot): void {
    const previous = this.pending().find(entry => entry.key === this.key);
    const entry = {
      key: this.key, familyId: this.familyId, revision: uniqueRecordId('write'),
      data: mergeFamilySnapshots(previous?.data, data),
    };
    this.memory = entry;
    this.storage.setItem(this.key, JSON.stringify(entry));
  }

  flush(send: (data: FamilySnapshot) => Promise<void>, active: () => boolean = () => true): Promise<void> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = (async () => {
      while (active()) {
        const entry = this.pending()[0];
        if (!entry) return;
        await send(entry.data);
        if (!active()) return;
        const current = this.storage.getItem(entry.key);
        if (current && JSON.parse(current).revision === entry.revision) this.storage.removeItem(entry.key);
        if (this.memory?.revision === entry.revision) this.memory = null;
      }
    })().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }
}
