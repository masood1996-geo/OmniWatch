import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import type Database from 'better-sqlite3';
import { getHistoryStore } from './history';
import { config } from '../config';

export type ApiScope = 'read' | 'admin';

export interface ApiKeyRecord {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: ApiScope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export class ApiKeyStore {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getHistoryStore(config).db;
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        scopes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT,
        revoked_at TEXT
      );
    `);
  }

  issue(name: string, scopes: ApiScope[] = ['read']): { key: string; record: ApiKeyRecord } {
    const key = `ow_${randomBytes(24).toString('hex')}`;
    const now = new Date().toISOString();
    const info = this.db.prepare(`
      INSERT INTO api_keys (name, key_hash, key_prefix, scopes, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, hashApiKey(key), key.slice(0, 11), JSON.stringify(scopes), now);
    const record = this.getById(Number(info.lastInsertRowid));
    if (!record) throw new Error('Failed to create API key');
    return { key, record };
  }

  verify(key: string): ApiKeyRecord | null {
    const hash = hashApiKey(key);
    const row = this.db.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL').get(hash) as any;
    if (!row) return null;
    this.db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
    return this.rowToRecord(row);
  }

  list(): ApiKeyRecord[] {
    const rows = this.db.prepare('SELECT * FROM api_keys ORDER BY id DESC').all() as any[];
    return rows.map(r => this.rowToRecord(r));
  }

  revoke(id: number): boolean {
    const info = this.db.prepare('UPDATE api_keys SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
      .run(new Date().toISOString(), id);
    return info.changes > 0;
  }

  private getById(id: number): ApiKeyRecord | null {
    const row = this.db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id) as any;
    return row ? this.rowToRecord(row) : null;
  }

  private rowToRecord(row: any): ApiKeyRecord {
    return {
      id: row.id,
      name: row.name,
      keyPrefix: row.key_prefix,
      scopes: JSON.parse(row.scopes),
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      revokedAt: row.revoked_at,
    };
  }
}
