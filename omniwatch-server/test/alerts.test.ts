import { describe, expect, it } from 'vitest';
import { AlertEngine, eventMatchesConditions } from '../src/alerts/engine';
import type { AlertChannel } from '../src/alerts/channels';
import { HistoryStore } from '../src/store/history';
import type { OmniEvent } from '../src/types';

function event(overrides: Partial<OmniEvent> = {}): OmniEvent {
  return {
    id: 'evt-1',
    source: 'usgs',
    title: 'M 6.1 - Offshore earthquake',
    severity: 'major',
    coordinates: { longitude: 10, latitude: 20 },
    timestamp: '2026-09-27T10:00:00.000Z',
    sourceTimestamp: '2026-09-27T10:00:00.000Z',
    eventType: 'earthquake',
    metadata: { description: 'Strong shaking reported' },
    provenance: {
      fetchClass: 'live',
      fetchedAt: '2026-09-27T10:01:00.000Z',
      sourceTimestamp: '2026-09-27T10:00:00.000Z',
      provider: 'USGS',
      sourceId: 'usgs',
      license: 'Public domain',
      attribution: 'USGS',
      confidence: 0.98,
    },
    ...overrides,
  };
}

describe('alert condition matching', () => {
  it('matches on minimum severity', () => {
    expect(eventMatchesConditions(event(), { minSeverity: 'major' })).toBe(true);
    expect(eventMatchesConditions(event({ severity: 'minor' }), { minSeverity: 'major' })).toBe(false);
  });

  it('matches keywords case-insensitively', () => {
    expect(eventMatchesConditions(event(), { keywords: ['earthquake'] })).toBe(true);
    expect(eventMatchesConditions(event(), { keywords: ['tsunami'] })).toBe(false);
  });

  it('matches bounding boxes', () => {
    expect(eventMatchesConditions(event(), { bbox: [0, 0, 30, 30] })).toBe(true);
    expect(eventMatchesConditions(event(), { bbox: [50, 50, 60, 60] })).toBe(false);
    expect(eventMatchesConditions(event({ coordinates: null }), { bbox: [0, 0, 30, 30] })).toBe(false);
  });

  it('matches on source and event type', () => {
    expect(eventMatchesConditions(event(), { sources: ['usgs'] })).toBe(true);
    expect(eventMatchesConditions(event(), { sources: ['gdelt'] })).toBe(false);
    expect(eventMatchesConditions(event(), { eventTypes: ['earthquake'] })).toBe(true);
    expect(eventMatchesConditions(event(), { eventTypes: ['fire'] })).toBe(false);
  });
});

describe('AlertEngine', () => {
  function build() {
    const store = new HistoryStore(':memory:');
    const sent: string[] = [];
    const channel: AlertChannel = {
      id: 'test-channel',
      label: 'Test channel',
      send: async ({ event: evt }) => { sent.push(evt.id); },
    };
    const engine = new AlertEngine([channel], store.db);
    return { store, engine, sent };
  }

  it('creates, updates, lists, and deletes rules', () => {
    const { engine, store } = build();
    const rule = engine.createRule({ name: 'Majors', conditions: { minSeverity: 'major' } });
    expect(engine.listRules()).toHaveLength(1);
    const updated = engine.updateRule(rule.id, { enabled: false });
    expect(updated?.enabled).toBe(false);
    expect(engine.deleteRule(rule.id)).toBe(true);
    expect(engine.listRules()).toHaveLength(0);
    store.close();
  });

  it('delivers matching events exactly once (persisted dedupe)', async () => {
    const { engine, sent, store } = build();
    engine.createRule({ name: 'Majors', conditions: { minSeverity: 'major' } });
    const first = await engine.evaluate([event()]);
    const second = await engine.evaluate([event()]);
    expect(first.sent).toBe(1);
    expect(second.sent).toBe(0);
    expect(sent).toEqual(['evt-1']);
    expect(engine.wasDelivered(engine.listRules()[0].id, 'evt-1', 'test-channel')).toBe(true);
    store.close();
  });

  it('records delivery errors without crashing the sweep', async () => {
    const store = new HistoryStore(':memory:');
    const failing: AlertChannel = {
      id: 'failing',
      label: 'Failing channel',
      send: async () => { throw new Error('boom'); },
    };
    const engine = new AlertEngine([failing], store.db);
    engine.createRule({ name: 'All', conditions: {} });
    const result = await engine.evaluate([event()]);
    expect(result.errors).toBe(1);
    expect(result.sent).toBe(0);
    store.close();
  });

  it('sendTest reports per-channel results', async () => {
    const { engine, sent, store } = build();
    const results = await engine.sendTest(event({ id: 'test-event' }));
    expect(results).toEqual([{ channel: 'test-channel', status: 'sent' }]);
    expect(sent).toContain('test-event');
    store.close();
  });
});
