import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifySupabaseFailure, unconfirmedReadMessage, unconfirmedWriteMessage,
} from './syncDiagnostics';

test('distinguishes Supabase RLS and authentication from connectivity', () => {
  assert.equal(classifySupabaseFailure({ code: '42501', message: 'permission denied for table' }), 'permission_denied');
  assert.equal(classifySupabaseFailure({ status: 401 }), 'permission_denied');
  assert.equal(classifySupabaseFailure({ status: 403 }), 'permission_denied');
  assert.equal(classifySupabaseFailure({ status: 429 }), 'rate_limited');
  assert.equal(classifySupabaseFailure(new Error('Too many requests')), 'rate_limited');
  assert.equal(classifySupabaseFailure({ code: 'PGRST003', status: 504 }), 'unavailable');
  assert.equal(classifySupabaseFailure(new Error('Connection reset')), 'unavailable');
});

test('visible-record absence does not claim that family history was deleted', () => {
  const message = unconfirmedReadMessage('not_visible');
  assert.match(message, /falta de acesso ou um registro ausente/);
  assert.match(message, /histórico local foi preservado/);
  assert.doesNotMatch(message, /apagado|excluído/);
});

test('an outdated server is differentiated from a permission problem', () => {
  assert.match(unconfirmedWriteMessage('outdated_server'), /atualizar o backend/);
  assert.match(unconfirmedWriteMessage('permission_denied'), /permissão\/RLS/);
  assert.match(unconfirmedReadMessage('rate_limited'), /limitou as consultas/);
});

test('unknown database errors never reveal underlying connection details', () => {
  assert.equal(unconfirmedWriteMessage('secret_database_message'), unconfirmedWriteMessage('not_confirmed'));
  assert.equal(unconfirmedReadMessage('secret_database_message'), unconfirmedReadMessage('unavailable'));
});

test('Invalid API key is NOT an RLS error and takes priority over 401', () => {
  assert.equal(classifySupabaseFailure({ status: 401, message: 'Invalid API key' }), 'invalid_api_key');
  assert.equal(classifySupabaseFailure({ status: 401, message: 'invalid apikey' }), 'invalid_api_key');
  assert.equal(classifySupabaseFailure({ code: 'MILK_PUBLIC_KEY_MISSING' }), 'missing_configuration');
  assert.equal(classifySupabaseFailure({ code: 'MILK_UNSAFE_KEY_TYPE' }), 'unsafe_key_type');
  assert.equal(classifySupabaseFailure({ code: 'PGRST205' }), 'missing_table');
  assert.match(unconfirmedWriteMessage('invalid_api_key'), /Chave API inválida/);
  assert.match(unconfirmedReadMessage('invalid_api_key'), /Chave API inválida/);
  assert.doesNotMatch(unconfirmedWriteMessage('invalid_api_key'), /permissão\/RLS/);
});
