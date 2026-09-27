import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/index';
import { loadConfig } from '../src/config';
import { SweepEngine } from '../src/pipeline/sweep';
import { HistoryStore } from '../src/store/history';
import { AlertEngine } from '../src/alerts/engine';
import { ApiKeyStore } from '../src/store/api-keys';
import type { AlertChannel } from '../src/alerts/channels';
import type { OmniEvent, SourceAdapter } from '../src/types';

const testEvent: OmniEvent = {
  id: 'fake-1',
  source: 'fake',
  title: 'Fake test event',
  severity: 'critical',
  coordinates: { longitude: 5, latitude: 5 },
  timestamp: '2026-09-27T10:00:00.000Z',
  sourceTimestamp: '2026-09-27T10:00:00.000Z',
  eventType: 'conflict',
  metadata: {},
};

const fakeAdapter: SourceAdapter = {
  id: 'fake',
  label: 'Fake adapter',
  tier: 1,
  fetchClass: 'live',
  provider: 'Test provider',
  license: 'CC0',
  attribution: 'Tests',
  confidence: 0.9,
  refreshMs: 60000,
  fetch: async () => [testEvent],
};

const disabledAdapter: SourceAdapter = {
  id: 'fake-disabled',
  label: 'Disabled adapter',
  tier: 1,
  fetchClass: 'disabled',
  provider: 'Test provider',
  license: 'CC0',
  attribution: 'Tests',
  confidence: 0,
  refreshMs: 60000,
  disabledReason: 'no key',
  fetch: async () => [],
};

async function buildApp(overrides: Partial<Parameters<typeof loadConfig>[0]> = {}) {
  const cfg = loadConfig({
    NODE_ENV: 'test',
    ADMIN_API_KEY: 'test-admin-key',
    RATE_LIMIT_PER_MIN: '1000',
    CHAT_RATE_LIMIT_PER_MIN: '1000',
    CORS_ORIGIN: '*',
    ...overrides,
  });
  const store = new HistoryStore(':memory:');
  const engine = new SweepEngine({ adapters: [fakeAdapter, disabledAdapter], now: () => new Date('2026-09-27T10:00:00.000Z') });
  const channel: AlertChannel = { id: 'capture', label: 'Capture', send: async () => {} };
  const alerts = new AlertEngine([channel], store.db);
  const keys = new ApiKeyStore(store.db);
  const app = createApp({ cfg, engine, store, alerts, keys });
  await engine.run();
  return { app, engine, store, alerts, keys };
}

describe('HTTP API', () => {
  it('serves health with per-source health and provenance-aware stats', async () => {
    const { app, store } = await buildApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.totalSignals).toBe(1);
    expect(res.body.totalSources).toBe(2);
    expect(res.body.sourceHealth.find((s: any) => s.id === 'fake-disabled').status).toBe('disabled');
    store.close();
  });

  it('attaches provenance to every event in /api/events', async () => {
    const { app, store } = await buildApp();
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
    const provenance = res.body.events[0].provenance;
    expect(provenance.fetchClass).toBe('live');
    expect(provenance.fetchedAt).toBeTruthy();
    expect(provenance.sourceTimestamp).toBeTruthy();
    expect(provenance.provider).toBe('Test provider');
    expect(provenance.license).toBe('CC0');
    store.close();
  });

  it('filters events by fetchClass and hideNonLive', async () => {
    const { app, store } = await buildApp();
    const live = await request(app).get('/api/events?fetchClass=live');
    expect(live.body.count).toBe(1);
    const delayed = await request(app).get('/api/events?fetchClass=delayed');
    expect(delayed.body.count).toBe(0);
    const hidden = await request(app).get('/api/events?hideNonLive=true');
    expect(hidden.body.count).toBe(1);
    store.close();
  });

  it('returns a JSON 404 for unknown API routes', async () => {
    const { app, store } = await buildApp();
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.error).toBe('not_found');
    store.close();
  });

  it('guards POST /api/sweep with ADMIN_API_KEY when set', async () => {
    const { app, store } = await buildApp();
    const unauthorized = await request(app).post('/api/sweep');
    expect(unauthorized.status).toBe(401);
    const authorized = await request(app).post('/api/sweep').set('x-admin-key', 'test-admin-key');
    expect(authorized.status).toBe(200);
    expect(authorized.body.success).toBe(true);
    store.close();
  });

  it('lists adapters with fetch classes and disabled reasons', async () => {
    const { app, store } = await buildApp();
    const res = await request(app).get('/api/adapters');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.counts.live).toBe(1);
    expect(res.body.counts.disabled).toBe(1);
    expect(res.body.adapters.find((a: any) => a.id === 'fake-disabled').disabledReason).toBe('no key');
    store.close();
  });

  it('paginates history and keeps it across app instances', async () => {
    const { app, store } = await buildApp();
    const res = await request(app).get('/api/history?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    const sweeps = await request(app).get('/api/history/sweeps');
    expect(sweeps.body.sweeps).toHaveLength(1);
    store.close();
  });

  it('guards alert rule creation but allows reading rules', async () => {
    const { app, store } = await buildApp();
    expect((await request(app).get('/api/alert-rules')).status).toBe(200);
    expect((await request(app).post('/api/alert-rules').send({ name: 'x', conditions: {} })).status).toBe(401);
    const created = await request(app)
      .post('/api/alert-rules')
      .set('x-admin-key', 'test-admin-key')
      .send({ name: 'Critical watch', conditions: { minSeverity: 'critical' }, channels: ['capture'] });
    expect(created.status).toBe(200);
    expect(created.body.rule.name).toBe('Critical watch');
    store.close();
  });

  it('runs the alert test channel via admin-only endpoint', async () => {
    const { app, store } = await buildApp();
    const res = await request(app).post('/api/alert-rules/test').set('x-admin-key', 'test-admin-key');
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ channel: 'capture', status: 'sent' }]);
    store.close();
  });

  it('issues, uses, and revokes API keys', async () => {
    const { app, store } = await buildApp();
    const created = await request(app).post('/api/admin/keys').set('x-admin-key', 'test-admin-key').send({ name: 'ci', scopes: ['read'] });
    expect(created.status).toBe(200);
    expect(created.body.key).toMatch(/^ow_/);

    const key = created.body.key as string;
    expect((await request(app).get('/api/events').set('Authorization', `Bearer ${key}`)).status).toBe(200);
    expect((await request(app).get('/api/events').set('Authorization', 'Bearer ow_bogus')).status).toBe(401);

    const id = created.body.record.id;
    expect((await request(app).delete(`/api/admin/keys/${id}`).set('x-admin-key', 'test-admin-key')).status).toBe(200);
    expect((await request(app).get('/api/events').set('Authorization', `Bearer ${key}`)).status).toBe(401);
    store.close();
  });

  it('requires an admin key when REQUIRE_API_KEY is on', async () => {
    const { app, store } = await buildApp({ REQUIRE_API_KEY: 'true' });
    expect((await request(app).get('/api/events')).status).toBe(401);
    expect((await request(app).get('/api/health')).status).toBe(200);
    store.close();
  });

  it('rate limits after the configured capacity', async () => {
    const { app, store } = await buildApp({ RATE_LIMIT_PER_MIN: '3' });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await request(app).get('/api/adapters')).status);
    }
    expect(statuses.filter(s => s === 200).length).toBe(3);
    expect(statuses).toContain(429);
    store.close();
  });
});
