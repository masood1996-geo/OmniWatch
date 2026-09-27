import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { config } from '../config';
import type { OmniEvent, SweepResult } from '../types';

export interface EventQuery {
  source?: string;
  severity?: string;
  eventType?: string;
  since?: string;
  until?: string;
  limit?: number;
  cursor?: string;
}

export interface EventPage {
  items: OmniEvent[];
  nextCursor: string | null;
  total: number;
}

export interface SweepRow {
  id: number;
  timestamp: string;
  durationMs: number;
  totalSources: number;
  liveSources: number;
  disabledSources: number;
  errorSources: number;
  eventCount: number;
}

function encodeCursor(firstSeenAt: string, id: string): string {
  return Buffer.from(`${firstSeenAt}|${id}`).toString('base64url');
}

function decodeCursor(cursor: string): { firstSeenAt: string; id: string } | null {
  try {
    const [firstSeenAt, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    if (!firstSeenAt || !id) return null;
    return { firstSeenAt, id };
  } catch {
    return null;
  }
}

export class HistoryStore {
  readonly db: Database.Database;
  private retentionDays: number;

  constructor(dbPath: string, retentionDays = 30) {
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.retentionDays = retentionDays;
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sweeps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        total_sources INTEGER NOT NULL,
        live_sources INTEGER NOT NULL,
        disabled_sources INTEGER NOT NULL,
        error_sources INTEGER NOT NULL,
        event_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        source TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        event_type TEXT NOT NULL,
        longitude REAL,
        latitude REAL,
        source_timestamp TEXT,
        fetched_at TEXT NOT NULL,
        provenance TEXT,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_events_first_seen ON events (first_seen_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_events_source ON events (source);
      CREATE INDEX IF NOT EXISTS idx_events_severity ON events (severity);
      CREATE TABLE IF NOT EXISTS source_health (
        source_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        count INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL,
        last_success_at TEXT,
        last_error_at TEXT,
        consecutive_failures INTEGER NOT NULL,
        reason TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  recordSweep(result: SweepResult): void {
    const insertSweep = this.db.prepare(`
      INSERT INTO sweeps (timestamp, duration_ms, total_sources, live_sources, disabled_sources, error_sources, event_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const upsertEvent = this.db.prepare(`
      INSERT INTO events (id, first_seen_at, last_seen_at, source, severity, title, event_type, longitude, latitude, source_timestamp, fetched_at, provenance, metadata)
      VALUES (@id, @firstSeenAt, @lastSeenAt, @source, @severity, @title, @eventType, @longitude, @latitude, @sourceTimestamp, @fetchedAt, @provenance, @metadata)
      ON CONFLICT(id) DO UPDATE SET
        last_seen_at = excluded.last_seen_at,
        severity = excluded.severity,
        title = excluded.title,
        fetched_at = excluded.fetched_at,
        provenance = excluded.provenance,
        metadata = excluded.metadata
    `);

    const tx = this.db.transaction((sweep: SweepResult) => {
      insertSweep.run(
        sweep.timestamp,
        sweep.durationMs,
        sweep.totalSources,
        sweep.liveSources,
        sweep.disabledSources,
        sweep.errorSources,
        sweep.events.length,
      );
      const now = sweep.timestamp;
      for (const event of sweep.events) {
        upsertEvent.run({
          id: event.id,
          firstSeenAt: now,
          lastSeenAt: now,
          source: event.source,
          severity: event.severity,
          title: event.title,
          eventType: event.eventType,
          longitude: event.coordinates?.longitude ?? null,
          latitude: event.coordinates?.latitude ?? null,
          sourceTimestamp: event.sourceTimestamp ?? null,
          fetchedAt: event.fetchedAt || now,
          provenance: event.provenance ? JSON.stringify(event.provenance) : null,
          metadata: JSON.stringify(event.metadata || {}),
        });
      }
      const upsertHealth = this.db.prepare(`
        INSERT INTO source_health (source_id, status, count, latency_ms, last_success_at, last_error_at, consecutive_failures, reason, updated_at)
        VALUES (@sourceId, @status, @count, @latencyMs, @lastSuccessAt, @lastErrorAt, @consecutiveFailures, @reason, @updatedAt)
        ON CONFLICT(source_id) DO UPDATE SET
          status = excluded.status, count = excluded.count, latency_ms = excluded.latency_ms,
          last_success_at = excluded.last_success_at, last_error_at = excluded.last_error_at,
          consecutive_failures = excluded.consecutive_failures, reason = excluded.reason, updated_at = excluded.updated_at
      `);
      for (const [sourceId, stats] of Object.entries(sweep.sources)) {
        upsertHealth.run({
          sourceId,
          status: stats.status,
          count: stats.count,
          latencyMs: stats.latencyMs,
          lastSuccessAt: stats.lastSuccessAt,
          lastErrorAt: stats.lastErrorAt,
          consecutiveFailures: stats.consecutiveFailures,
          reason: stats.reason ?? null,
          updatedAt: now,
        });
      }
    });
    tx(result);
    this.purgeOld();
  }

  getSweeps(limit = 20): SweepRow[] {
    const rows = this.db.prepare(`
      SELECT id, timestamp, duration_ms, total_sources, live_sources, disabled_sources, error_sources, event_count
      FROM sweeps ORDER BY id DESC LIMIT ?
    `).all(limit) as any[];
    return rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      durationMs: r.duration_ms,
      totalSources: r.total_sources,
      liveSources: r.live_sources,
      disabledSources: r.disabled_sources,
      errorSources: r.error_sources,
      eventCount: r.event_count,
    }));
  }

  getEvents(query: EventQuery = {}): EventPage {
    const limit = Math.min(Math.max(query.limit || 100, 1), 500);
    const clauses: string[] = [];
    const params: Record<string, any> = { limit: limit + 1 };
    if (query.source) { clauses.push('source = @source'); params.source = query.source; }
    if (query.severity) { clauses.push('severity = @severity'); params.severity = query.severity; }
    if (query.eventType) { clauses.push('event_type = @eventType'); params.eventType = query.eventType; }
    if (query.since) { clauses.push('first_seen_at >= @since'); params.since = query.since; }
    if (query.until) { clauses.push('first_seen_at <= @until'); params.until = query.until; }
    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      if (decoded) {
        clauses.push('(first_seen_at < @cursorSeen OR (first_seen_at = @cursorSeen AND id < @cursorId))');
        params.cursorSeen = decoded.firstSeenAt;
        params.cursorId = decoded.id;
      }
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const filterClauses = clauses.filter(c => !c.includes('@cursorSeen'));
    const countWhere = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';
    const countParams: Record<string, any> = {};
    for (const key of ['source', 'severity', 'eventType', 'since', 'until']) {
      if (params[key] !== undefined) countParams[key] = params[key];
    }
    const totalRow = this.db.prepare(`SELECT COUNT(*) AS n FROM events ${countWhere}`).get(countParams) as any;
    const rows = this.db.prepare(`
      SELECT * FROM events ${where}
      ORDER BY first_seen_at DESC, id DESC
      LIMIT @limit
    `).all(params) as any[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items = pageRows.map(r => this.rowToEvent(r));
    const last = pageRows[pageRows.length - 1];
    return {
      items,
      nextCursor: hasMore && last ? encodeCursor(last.first_seen_at, last.id) : null,
      total: totalRow?.n || 0,
    };
  }

  getEventById(id: string): OmniEvent | null {
    const row = this.db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
    return row ? this.rowToEvent(row) : null;
  }

  getEventsFirstSeenSince(iso: string): OmniEvent[] {
    const rows = this.db.prepare(`
      SELECT * FROM events WHERE first_seen_at >= ? ORDER BY first_seen_at DESC LIMIT 500
    `).all(iso) as any[];
    return rows.map(r => this.rowToEvent(r));
  }

  countEvents(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM events').get() as any;
    return row?.n || 0;
  }

  purgeOld(): number {
    const cutoff = new Date(Date.now() - this.retentionDays * 86400000).toISOString();
    const events = this.db.prepare('DELETE FROM events WHERE last_seen_at < ?').run(cutoff);
    const sweeps = this.db.prepare('DELETE FROM sweeps WHERE timestamp < ?').run(cutoff);
    return events.changes + sweeps.changes;
  }

  close(): void {
    this.db.close();
  }

  private rowToEvent(row: any): OmniEvent {
    return {
      id: row.id,
      source: row.source,
      title: row.title,
      severity: row.severity,
      coordinates: row.longitude !== null && row.latitude !== null
        ? { longitude: row.longitude, latitude: row.latitude }
        : null,
      timestamp: row.source_timestamp || row.first_seen_at,
      sourceTimestamp: row.source_timestamp,
      fetchedAt: row.fetched_at,
      eventType: row.event_type,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      provenance: row.provenance ? JSON.parse(row.provenance) : undefined,
    };
  }
}

let store: HistoryStore | null = null;

export function getHistoryStore(cfg = config): HistoryStore {
  if (!store) {
    store = new HistoryStore(cfg.historyDbPath, cfg.historyRetentionDays);
  }
  return store;
}

export function resetHistoryStore(): void {
  store?.close();
  store = null;
}
