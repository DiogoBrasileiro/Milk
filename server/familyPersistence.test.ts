import assert from 'node:assert/strict';
import test from 'node:test';
import { FamilySnapshotStore, FamilyWriteQueue, StoredFamilySnapshot, familySnapshotData,
  mergeFamilyEnvelope, persistFamilySnapshot } from './familyPersistence';

const at = '2026-11-01T10:00:00.000Z';
const record = (id: string, extra = {}) => ({ id, timestamp: at, updatedAt: at, ...extra });

function memoryStore(initial: StoredFamilySnapshot | null = null) {
  let row = structuredClone(initial);
  let writes = 0;
  const store: FamilySnapshotStore = {
    async read() { return structuredClone(row); },
    async insert(_key, value, updatedAt) {
      writes++;
      if (row) return false;
      row = { value: structuredClone(value), updatedAt };
      return true;
    },
    async replace(_key, revision, value, updatedAt) {
      writes++;
      if (!row || row.updatedAt !== revision) return false;
      row = { value: structuredClone(value), updatedAt };
      return true;
    },
  };
  return { store, get row() { return row; }, get writes() { return writes; } };
}

test('stale and empty snapshots preserve feeding/diaper history and each historical envelope', () => {
  for (const envelope of ['data', 'familyData', null]) {
    const app = { feedings: [record('original-feeding')], diapers: [record('original-diaper')],
      baby: { id: 'test-baby', name: 'Test', updatedAt: at } };
    const original = envelope ? { [envelope]: app, extraMetadata: 'preserved' } : app;
    const result = mergeFamilyEnvelope('test-family', original, {
      data: { feedings: [], diapers: [record('new-diaper')] },
    });
    assert.deepEqual(familySnapshotData(result).feedings.map(x => x.id), ['original-feeding']);
    assert.deepEqual(new Set(familySnapshotData(result).diapers.map(x => x.id)),
      new Set(['original-diaper', 'new-diaper']));
    if (envelope) {
      assert.ok(result[envelope]);
      assert.equal(result.extraMetadata, 'preserved');
      if (envelope === 'familyData') assert.equal(result.data, undefined);
    } else assert.equal(result.data, undefined);
  }
});

test('two independent server writers retry the CAS conflict and retain both new records', async () => {
  const db = memoryStore({ value: { data: { feedings: [record('old')], diapers: [] } }, updatedAt: at });
  const read = db.store.read;
  let reads = 0;
  let release!: () => void;
  const barrier = new Promise<void>(resolve => { release = resolve; });
  db.store.read = async key => {
    const snapshot = await read(key);
    reads++;
    if (reads === 2) release();
    if (reads <= 2) await barrier;
    return snapshot;
  };
  await Promise.all([
    persistFamilySnapshot(db.store, 'test-family', { data: { feedings: [record('new-feeding')] } }),
    persistFamilySnapshot(db.store, 'test-family', { data: { diapers: [record('new-diaper')] } }),
  ]);
  assert.ok(db.writes >= 3, 'the losing writer must retry rather than overwrite');
  const final = familySnapshotData(db.row!.value);
  assert.deepEqual(new Set(final.feedings.map(x => x.id)), new Set(['old', 'new-feeding']));
  assert.deepEqual(final.diapers.map(x => x.id), ['new-diaper']);
});

test('concurrent first writes merge after one insert loses the unique-key race', async () => {
  const db = memoryStore();
  await Promise.all([
    persistFamilySnapshot(db.store, 'test-family', { data: { feedings: [record('feeding')] } }),
    persistFamilySnapshot(db.store, 'test-family', { data: { diapers: [record('diaper')] } }),
  ]);
  const final = familySnapshotData(db.row!.value);
  assert.equal(final.feedings[0].id, 'feeding');
  assert.equal(final.diapers[0].id, 'diaper');
});

test('database read failure never becomes a write to an assumed empty family', async () => {
  const db = memoryStore({ value: { feedings: [record('original')] }, updatedAt: at });
  db.store.read = async () => { throw new Error('network unavailable'); };
  await assert.rejects(persistFamilySnapshot(db.store, 'test-family', { feedings: [] }), /network unavailable/);
  assert.equal(db.writes, 0);
  assert.equal(db.row!.value.feedings[0].id, 'original');
});

test('permission errors and zero-row updates cannot produce a success acknowledgement', async () => {
  const db = memoryStore({ value: { feedings: [record('original')] }, updatedAt: at });
  db.store.replace = async () => { throw new Error('permission denied'); };
  await assert.rejects(persistFamilySnapshot(db.store, 'test-family', { feedings: [] }), /permission denied/);
  let failedAttempts = 0;
  db.store.replace = async () => { failedAttempts++; return false; };
  await assert.rejects(persistFamilySnapshot(db.store, 'test-family', { feedings: [] }, 3), /not be confirmed/);
  assert.equal(failedAttempts, 3);
  assert.equal(db.row!.value.feedings[0].id, 'original');
});

test('newer edits and deletions survive stale device snapshots without discarding legacy entries', () => {
  const newer = '2026-11-02T10:00:00.000Z';
  const restored = '2026-11-03T10:00:00.000Z';
  const result = mergeFamilyEnvelope('test-family', {
    familyData: { feedings: [record('edited', { updatedAt: newer, consumedMl: 90 }), { legacy: true }],
      diapers: [], deletedItemIds: { removed: newer } },
  }, {
    data: { feedings: [record('edited', { consumedMl: 10 })],
      diapers: [record('removed'), record('restored', { updatedAt: restored })],
      deletedItemIds: { removed: at, restored: newer } },
  });
  const app = familySnapshotData(result);
  assert.equal(app.feedings.find(x => x.id === 'edited').consumedMl, 90);
  assert.ok(app.feedings.some(x => x.legacy));
  assert.equal(app.deletedItemIds.removed, newer);
  assert.deepEqual(app.diapers.map(x => x.id), ['restored']);
});

test('a malformed existing snapshot and a mismatched family are preserved, never overwritten', async () => {
  const db = memoryStore({ value: { data: [] }, updatedAt: at });
  await assert.rejects(persistFamilySnapshot(db.store, 'test-family', { data: { feedings: [] } }), /Invalid family/);
  assert.equal(db.writes, 0);
  assert.throws(() => mergeFamilyEnvelope('test-family', null, {
    familyId: 'other-family', data: { feedings: [] },
  }), /destination/);
});

test('family queue orders writes, permits other families, and recovers from failed writes', async () => {
  const queue = new FamilyWriteQueue();
  const events: string[] = [];
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const first = queue.run('one', async () => { events.push('one-start'); await held; throw new Error('offline'); });
  const handled = assert.rejects(first, /offline/);
  const second = queue.run('one', async () => { events.push('one-next'); return true; });
  await queue.run('two', async () => { events.push('two'); });
  assert.ok(!events.includes('one-next'));
  release();
  await handled;
  assert.equal(await second, true);
  assert.deepEqual(events, ['one-start', 'two', 'one-next']);
});
