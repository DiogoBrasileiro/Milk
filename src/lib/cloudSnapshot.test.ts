import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCloudSnapshot } from './cloudSnapshot';

test('reads nested legacy data envelope without dropping records', () => {
  const record = { family: { name: 'Família Teste' }, babies: [
    {id:'baby-a',name:'Nome antigo',birthDate:'2026-01-01'}
  ], data: {
    baby: {id:'baby-a',name:'Nome atualizado',birthDate:'2026-01-01'},
    feedings: [{id:'f1'},{id:'f2'}],
    pumpings: [{id:'p1'}],
    diapers: [{id:'d1'}],
  }};
  const result = normalizeCloudSnapshot(record);
  assert.equal(result.babies[0].name,'Nome atualizado');
  assert.equal(result.app.feedings.length,2);
  assert.equal(result.app.pumpings.length,1);
  assert.equal(result.app.diapers.length,1);
  assert.equal(result.storedFamily.name,'Família Teste');
});

test('accepts raw family data without a wrapper', () => {
  const result = normalizeCloudSnapshot({baby:{id:'b2',name:'Bebê Teste'},feedings:[{id:'f3'}]});
  assert.equal(result.babies[0].id,'b2');
  assert.equal(result.app.feedings[0].id,'f3');
});

test('rejects a missing baby instead of silently creating a new family', () => {
  assert.throws(() => normalizeCloudSnapshot({data:{feedings:[]}}),/Nenhum perfil/);
});
