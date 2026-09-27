import { describe, expect, it } from 'vitest';
import { ApiKeyStore, hashApiKey, safeCompare } from '../src/store/api-keys';
import { HistoryStore } from '../src/store/history';

describe('API key store', () => {
  it('issues a key once and verifies it by hash', () => {
    const store = new HistoryStore(':memory:');
    const keys = new ApiKeyStore(store.db);
    const { key, record } = keys.issue('journalist', ['read']);
    expect(key).toMatch(/^ow_[0-9a-f]{48}$/);
    expect(record.scopes).toEqual(['read']);
    expect(keys.verify(key)?.id).toBe(record.id);
    store.close();
  });

  it('never stores the plaintext key', () => {
    const store = new HistoryStore(':memory:');
    const keys = new ApiKeyStore(store.db);
    const { key } = keys.issue('tester', ['read']);
    const row = store.db.prepare('SELECT key_hash FROM api_keys').get() as any;
    expect(row.key_hash).toBe(hashApiKey(key));
    expect(row.key_hash).not.toContain(key);
    store.close();
  });

  it('rejects unknown and revoked keys', () => {
    const store = new HistoryStore(':memory:');
    const keys = new ApiKeyStore(store.db);
    const { key, record } = keys.issue('tester', ['read']);
    expect(keys.verify('ow_deadbeef')).toBeNull();
    keys.revoke(record.id);
    expect(keys.verify(key)).toBeNull();
    store.close();
  });

  it('supports admin scope and hides hashes in listings', () => {
    const store = new HistoryStore(':memory:');
    const keys = new ApiKeyStore(store.db);
    keys.issue('ops', ['read', 'admin']);
    const list = keys.list();
    expect(list[0].scopes).toContain('admin');
    expect(JSON.stringify(list)).not.toContain('key_hash');
    store.close();
  });

  it('safeCompare handles equal and different lengths', () => {
    expect(safeCompare('abc', 'abc')).toBe(true);
    expect(safeCompare('abc', 'abd')).toBe(false);
    expect(safeCompare('abc', 'abcd')).toBe(false);
  });
});
