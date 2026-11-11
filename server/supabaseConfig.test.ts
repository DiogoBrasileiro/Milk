import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePublicSupabaseConfig } from './supabase';

const url = 'https://poagmqrrbscemlqqccfe.supabase.co';

test('supports modern publishable and legacy anon public keys', () => {
  assert.doesNotThrow(() => validatePublicSupabaseConfig(url, 'sb_publishable_public_test_value'));
  assert.doesNotThrow(() => validatePublicSupabaseConfig(url, 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.fake-signature'));
});

test('fails closed when a public API key is missing', () => {
  assert.throws(() => validatePublicSupabaseConfig(url, ''), { code: 'MILK_PUBLIC_KEY_MISSING' });
  assert.throws(() => validatePublicSupabaseConfig('', 'sb_publishable_any'), { code: 'MILK_PROJECT_URL_MISSING' });
});

test('rejects secret or legacy elevated keys to avoid bypassing family RLS', () => {
  assert.throws(() => validatePublicSupabaseConfig(url, 'sb_secret_should_never_be_used'), { code: 'MILK_UNSAFE_KEY_TYPE' });
  const jwt = [
    'eyJhbGciOiJIUzI1NiJ9',
    Buffer.from(JSON.stringify({ role: 'service_role' }), 'utf8').toString('base64url'),
    'test-signature',
  ].join('.');
  assert.throws(() => validatePublicSupabaseConfig(url, jwt), { code: 'MILK_UNSAFE_KEY_TYPE' });
});
