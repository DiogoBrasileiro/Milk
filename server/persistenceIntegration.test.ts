import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const tsxLoader = import.meta.resolve('tsx');
const at = '2026-11-01T10:00:00.000Z';

test('legacy HTTP sync acknowledges the database, retains failed writes and retries without duplicates', async t => {
  const workdir = await mkdtemp(path.join(tmpdir(), 'milk-persistence-'));
  t.after(() => rm(workdir, { recursive: true, force: true }));
  let deny = true;
  let row = { key: 'family_data_test-family', updated_at: at,
    value: { data: { familyId: 'test-family', feedings: [{ id: 'historical', timestamp: at }], diapers: [] } } };
  const database = createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (deny) {
      response.writeHead(403);
      response.end(JSON.stringify({ code: '42501', message: 'simulated permission failure' }));
      return;
    }
    const url = new URL(request.url!, 'http://localhost');
    if (url.pathname !== '/rest/v1/milkflow_store') {
      response.writeHead(404); response.end('{}'); return;
    }
    if (request.method === 'GET') {
      response.end(JSON.stringify([row]));
      return;
    }
    let body = '';
    for await (const part of request) body += part;
    if (request.method === 'PATCH') {
      if (url.searchParams.get('updated_at') === 'eq.' + row.updated_at) {
        row = { ...row, ...JSON.parse(body) };
        response.end(JSON.stringify([{ key: row.key }]));
      } else response.end('[]');
      return;
    }
    response.writeHead(409);
    response.end(JSON.stringify({ code: '23505', message: 'simulated duplicate' }));
  });
  database.listen(0, '127.0.0.1');
  await once(database, 'listening');
  t.after(() => new Promise<void>(resolve => { database.close(() => resolve()); database.closeAllConnections(); }));
  const address = database.address();
  assert.ok(address && typeof address !== 'string');

  const child = spawn(process.execPath, ['--import', tsxLoader, path.join(projectRoot, 'server.ts')], {
    cwd: workdir,
    env: { ...process.env, NODE_ENV: 'production', PORT: '0',
      SUPABASE_URL: `http://127.0.0.1:${address.port}`,
      SUPABASE_ANON_KEY: 'test_public_key', SUPABASE_PUBLISHABLE_KEY: 'test_public_key' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
  });
  let diagnostics = '';
  child.stderr.on('data', data => { diagnostics += data.toString(); });
  const port = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Test server did not start: ' + diagnostics)), 15000);
    child.stdout.on('data', data => {
      const match = data.toString().match(/http:\/\/0\.0\.0\.0:(\d+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    });
    child.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error('Test server exited: ' + code + ' ' + diagnostics));
    });
  });
  const endpoint = `http://127.0.0.1:${port}/api/family/test-family/sync`;
  const pending = { data: { familyId: 'test-family',
    feedings: [{ id: 'pending-feeding', timestamp: at }], diapers: [{ id: 'pending-diaper', timestamp: at }] } };
  const send = () => fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending) });

  const failed = await send();
  assert.equal(failed.status, 503);
  assert.equal((await failed.json()).supabaseSynced, false);
  const local = JSON.parse(await readFile(path.join(workdir, 'data/milkflow_cloud_database.json'), 'utf8'));
  assert.equal(local.familyData['test-family'].feedings[0].id, 'pending-feeding');
  assert.equal(local.familyData['test-family'].diapers[0].id, 'pending-diaper');
  assert.deepEqual(row.value.data.feedings.map(item => item.id), ['historical']);
  const unavailableRead = await (await fetch(endpoint)).json();
  assert.equal(unavailableRead.supabaseActive, false);

  deny = false;
  const acknowledged = await send();
  assert.equal(acknowledged.status, 200);
  const result = await acknowledged.json();
  assert.equal(result.success, true);
  assert.equal(result.supabaseSynced, true);
  assert.deepEqual(new Set(row.value.data.feedings.map(item => item.id)), new Set(['historical', 'pending-feeding']));
  assert.deepEqual(row.value.data.diapers.map(item => item.id), ['pending-diaper']);
  assert.equal((await (await fetch(endpoint)).json()).supabaseActive, true);
  assert.equal((await send()).status, 200);
  assert.equal(row.value.data.feedings.length, 2);
  assert.equal(row.value.data.diapers.length, 1);
});

test('a corrupt local database is left untouched instead of being reset to seed data', async () => {
  const workdir = await mkdtemp(path.join(tmpdir(), 'milk-corrupt-'));
  const dbFile = path.join(workdir, 'data/milkflow_cloud_database.json');
  try {
    await mkdir(path.dirname(dbFile));
    const original = '{"familyData": {"unfinished-write"';
    await writeFile(dbFile, original);
    const child = spawnSync(process.execPath, ['--import', tsxLoader, '--input-type=module', '--eval',
      `await import(${JSON.stringify(pathToFileURL(path.join(projectRoot, 'server/cloudStore.ts')).href)})`], {
      cwd: workdir, encoding: 'utf8', timeout: 10000,
    });
    assert.notEqual(child.status, 0);
    assert.match(child.stderr, /arquivo original foi preservado/);
    assert.equal(await readFile(dbFile, 'utf8'), original);
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
});
