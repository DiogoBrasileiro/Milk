import test from 'node:test';
import assert from 'node:assert/strict';
import { FamilyOutbox, mergeFamilySnapshots, mergeDeletionMaps, readPendingFamilyWrites, uniqueRecordId } from './familyPersistence';

class MemoryStorage {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const record = (id: string, updatedAt = '2026-01-01T10:00:00.000Z') => ({ id, updatedAt, timestamp: updatedAt });
const ids = (values: { id: string }[]) => values.map(value => value.id).sort();

test('a stale or empty remote snapshot preserves unsent feedings and diapers', () => {
  const local = { feedings: [record('feeding-local')], diapers: [record('diaper-local')] };
  const remote = { feedings: [], diapers: [], weights: [record('weight-remote')] };
  const result = mergeFamilySnapshots(local, remote);
  assert.deepEqual(ids(result.feedings), ['feeding-local']);
  assert.deepEqual(ids(result.diapers), ['diaper-local']);
  assert.deepEqual(ids(result.weights), ['weight-remote']);
  assert.equal(local.feedings.length, 1);
});

test('concurrent devices retain distinct records and the newest edit of the same record', () => {
  const old = { ...record('same'), consumedMl: 50 };
  const recent = { ...record('same', '2026-01-01T11:00:00.000Z'), consumedMl: 80 };
  const a = { feedings: [recent, record('phone-a')] };
  const b = { feedings: [old, record('phone-b')] };
  for (const result of [mergeFamilySnapshots(a, b), mergeFamilySnapshots(b, a)]) {
    assert.deepEqual(ids(result.feedings), ['phone-a', 'phone-b', 'same']);
    assert.equal(result.feedings.find((r: any) => r.id === 'same').consumedMl, 80);
  }
});

test('only explicit deletions remove records; stale tombstones cannot replace newer ones', () => {
  const deleted = mergeDeletionMaps({ gone: '2026-01-02T00:00:00Z' }, { gone: '2026-01-01T00:00:00Z' });
  assert.equal(deleted.gone, '2026-01-02T00:00:00Z');
  const result = mergeFamilySnapshots({ diapers: [record('gone'), record('kept')], deletedItemIds: deleted }, { diapers: [] });
  assert.deepEqual(ids(result.diapers), ['kept']);
  const restored = mergeFamilySnapshots(result, { diapers: [record('gone', '2026-01-03T00:00:00Z')] });
  assert.deepEqual(ids(restored.diapers), ['gone', 'kept']);
});

test('legacy envelopes and ID-less historical entries survive normalization', () => {
  const result = mergeFamilySnapshots({ familyData: { feedings: [{ note: 'historical' }, record('a')] } }, { data: { feedings: [record('b')] } });
  assert.equal(result.feedings.length, 3);
  assert.ok(result.feedings.some((r: any) => r.note === 'historical'));
});

test('a stale profile and settings snapshot cannot overwrite a newer one', () => {
  const local = { lastUpdatedAt: '2026-01-03T00:00:00Z', customReminderIntervalMinutes: 180, baby: { ...record('baby', '2026-01-03T00:00:00Z'), name: 'Updated' } };
  const incoming = { lastUpdatedAt: '2026-01-01T00:00:00Z', customReminderIntervalMinutes: 120, baby: { ...record('baby'), name: 'Old' } };
  const result = mergeFamilySnapshots(local, incoming);
  assert.equal(result.baby.name, 'Updated');
  assert.equal(result.customReminderIntervalMinutes, 180);
});

test('failed database confirmation survives reload and retries without a new user action', async () => {
  const storage = new MemoryStorage();
  const first = new FamilyOutbox(storage, 'family-a', 'tab-a');
  first.enqueue({ feedings: [record('feeding-a')], diapers: [record('diaper-a')] });
  await assert.rejects(first.flush(async () => { throw new Error('database unavailable'); }));
  assert.equal(readPendingFamilyWrites(storage, 'family-a').length, 1);
  const reloaded = new FamilyOutbox(storage, 'family-a', 'tab-after-reload');
  let saved: any;
  await reloaded.flush(async data => { saved = data; });
  assert.deepEqual(ids(saved.feedings), ['feeding-a']);
  assert.deepEqual(ids(saved.diapers), ['diaper-a']);
  assert.equal(readPendingFamilyWrites(storage, 'family-a').length, 0);
});

test('an old acknowledgement never clears a feeding recorded while a request was in flight', async () => {
  const storage = new MemoryStorage();
  const queue = new FamilyOutbox(storage, 'family-a', 'tab-a');
  queue.enqueue({ feedings: [record('first')] });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const sent: any[] = [];
  let calls = 0;
  const flushing = queue.flush(async data => { sent.push(data); if (++calls === 1) await gate; });
  queue.enqueue({ feedings: [record('second')] });
  // A simultaneous flush joins the same writer instead of starting a second request.
  const joined = queue.flush(async () => { throw new Error('parallel sender must not run'); });
  release();
  await Promise.all([flushing, joined]);
  assert.equal(sent.length, 2);
  assert.deepEqual(ids(sent[1].feedings), ['first', 'second']);
  assert.equal(queue.pending().length, 0);
});

test('independent tabs have durable slots and do not overwrite one another', async () => {
  const storage = new MemoryStorage();
  const a = new FamilyOutbox(storage, 'family-a', 'tab-a');
  const b = new FamilyOutbox(storage, 'family-a', 'tab-b');
  a.enqueue({ feedings: [record('from-a')] });
  b.enqueue({ diapers: [record('from-b')] });
  assert.equal(readPendingFamilyWrites(storage, 'family-a').length, 2);
  let database: any = {};
  await a.flush(async data => { database = mergeFamilySnapshots(database, data); });
  assert.deepEqual(ids(database.feedings), ['from-a']);
  assert.deepEqual(ids(database.diapers), ['from-b']);
});

test('an account change leaves pending writes intact and isolates family B', async () => {
  const storage = new MemoryStorage();
  const a = new FamilyOutbox(storage, 'family-a', 'tab');
  const b = new FamilyOutbox(storage, 'family-b', 'tab');
  a.enqueue({ feedings: [record('a-only')] });
  b.enqueue({ diapers: [record('b-only')] });
  let active = true;
  await a.flush(async () => { active = false; }, () => active);
  assert.equal(readPendingFamilyWrites(storage, 'family-a').length, 1);
  assert.equal(b.pending()[0].data.feedings, undefined);
  await b.flush(async data => { assert.deepEqual(ids(data.diapers), ['b-only']); });
  assert.equal(readPendingFamilyWrites(storage, 'family-a').length, 1);
});

test('a local storage failure retains an in-memory copy until the DB confirms', async () => {
  const storage = new MemoryStorage();
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const queue = new FamilyOutbox(storage, 'family-a', 'tab');
  assert.throws(() => queue.enqueue({ feedings: [record('keep')] }), /Quota/);
  assert.equal(queue.pending().length, 1);
  await queue.flush(async data => { assert.deepEqual(ids(data.feedings), ['keep']); });
  assert.equal(queue.pending().length, 0);
});

test('new records have different IDs even in the same millisecond', () => {
  const keys = Array.from({ length: 100 }, () => uniqueRecordId('feed'));
  assert.equal(new Set(keys).size, 100);
});
