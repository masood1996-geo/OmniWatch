import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { HistoryStore } from '../src/store/history';
import type { OmniEvent, SweepResult } from '../src/types';

const tmpFiles: string[] = [];

function tempDbPath(): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'omniwatch-test-')), 'history.db');
  tmpFiles.push(file);
  return file;
}

function makeEvent(id: string, overrides: Partial<OmniEvent> = {}): OmniEvent {
  return {
    id,
    source: 'usgs',
    title: `Event ${id}`,
    severity: 'moderate',
    coordinates: { longitude: 1, latitude: 2 },
    timestamp: '2026-09-27T10:00:00.000Z',
    sourceTimestamp: '2026-09-27T09:00:00.000Z',
    fetchedAt: '2026-09-27T10:00:00.000Z',
    eventType: 'earthquake',
    metadata: { magnitude: 4.2 },
    provenance: {
      fetchClass: 'live',
      fetchedAt: '2026-09-27T10:00:00.000Z',
      sourceTimestamp: '2026-09-27T09:00:00.000Z',
      provider: 'USGS',
      sourceId: 'usgs',
      license: 'Public domain',
      attribution: 'USGS',
      confidence: 0.98,
    },
    ...overrides,
  };
}

function makeSweep(timestamp: string, events: OmniEvent[]): SweepResult {
  return {
    events,
    timestamp,
    durationMs: 1234,
    sources: {
      usgs: { status: 'ok', count: events.length, fetchClass: 'live', latencyMs: 100, lastSuccessAt: timestamp, lastErrorAt: null, consecutiveFailures: 0 },
    },
    totalSources: 49,
    liveSources: 40,
    disabledSources: 9,
    errorSources: 0,
  };
}

afterEach(() => {
  for (const file of tmpFiles.splice(0)) {
    try { fs.rmSync(path.dirname(file), { recursive: true, force: true }); } catch { /* best effort */ }
  }
});

describe('HistoryStore', () => {
  it('records sweeps and events and reads them back with provenance', () => {
    const store = new HistoryStore(':memory:');
    store.recordSweep(makeSweep('2026-09-27T10:00:00.000Z', [makeEvent('a'), makeEvent('b')]));
    const page = store.getEvents();
    expect(page.total).toBe(2);
    expect(page.items[0].provenance?.fetchClass).toBe('live');
    expect(store.getSweeps(5)[0].eventCount).toBe(2);
    store.close();
  });

  it('survives a restart (file-backed)', () => {
    const dbPath = tempDbPath();
    const first = new HistoryStore(dbPath);
    first.recordSweep(makeSweep('2026-09-27T10:00:00.000Z', [makeEvent('persisted')]));
    first.close();

    const second = new HistoryStore(dbPath);
    expect(second.countEvents()).toBe(1);
    expect(second.getEventById('persisted')?.title).toBe('Event persisted');
    second.close();
  });

  it('paginates with a stable cursor', () => {
    const store = new HistoryStore(':memory:');
    const events = Array.from({ length: 10 }, (_, i) => makeEvent(`e${i}`));
    store.recordSweep(makeSweep('2026-09-27T10:00:00.000Z', events));
    const first = store.getEvents({ limit: 4 });
    expect(first.items).toHaveLength(4);
    expect(first.nextCursor).toBeTruthy();
    const second = store.getEvents({ limit: 4, cursor: first.nextCursor! });
    expect(second.items).toHaveLength(4);
    const ids = new Set([...first.items, ...second.items].map(e => e.id));
    expect(ids.size).toBe(8);
    store.close();
  });

  it('purges everything older than the retention window on record', () => {
    const store = new HistoryStore(':memory:', 30);
    const old = new Date(Date.now() - 40 * 86400000).toISOString();
    store.recordSweep(makeSweep(old, [makeEvent('old')]));
    expect(store.getEventById('old')).toBeNull();
    expect(store.getSweeps(5)).toHaveLength(0);
    store.recordSweep(makeSweep(new Date().toISOString(), [makeEvent('fresh')]));
    expect(store.getEventById('fresh')).not.toBeNull();
    store.close();
  });

  it('filters history by source and severity', () => {
    const store = new HistoryStore(':memory:');
    store.recordSweep(makeSweep('2026-09-27T10:00:00.000Z', [
      makeEvent('m1', { severity: 'minor' }),
      makeEvent('c1', { severity: 'critical', source: 'gdelt' }),
    ]));
    expect(store.getEvents({ severity: 'critical' }).total).toBe(1);
    expect(store.getEvents({ source: 'usgs' }).total).toBe(1);
    store.close();
  });
});
