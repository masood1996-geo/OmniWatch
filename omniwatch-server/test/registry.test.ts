import { describe, expect, it } from 'vitest';
import { buildRegistry } from '../src/sources/registry';
import { loadConfig } from '../src/config';

const config = loadConfig({ NODE_ENV: 'test' });

describe('adapter registry', () => {
  const registry = buildRegistry(config);

  it('contains no duplicate adapter ids', () => {
    const ids = registry.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every adapter complete provenance metadata', () => {
    for (const adapter of registry) {
      expect(adapter.id, adapter.id).toBeTruthy();
      expect(adapter.label, adapter.id).toBeTruthy();
      expect(adapter.provider, adapter.id).toBeTruthy();
      expect(adapter.license, adapter.id).toBeTruthy();
      expect(adapter.attribution, adapter.id).toBeTruthy();
      expect(['live', 'delayed', 'static', 'simulated', 'disabled']).toContain(adapter.fetchClass);
      expect(adapter.refreshMs).toBeGreaterThan(0);
    }
  });

  it('explains why every disabled source is disabled', () => {
    for (const adapter of registry.filter(a => a.fetchClass === 'disabled')) {
      expect(adapter.disabledReason, adapter.id).toBeTruthy();
    }
  });

  it('never marks a real-time source as live without an implementation path', () => {
    const live = registry.filter(a => a.fetchClass === 'live');
    expect(live.length).toBeGreaterThan(15);
    for (const adapter of live) {
      expect(typeof adapter.fetch).toBe('function');
      expect(adapter.confidence).toBeGreaterThan(0);
    }
  });

  it('tracks key-gated adapters as disabled when keys are absent', () => {
    const gated = registry.filter(a => a.requiresKeys && a.requiresKeys.length > 0);
    expect(gated.length).toBeGreaterThan(5);
    for (const adapter of gated) {
      expect(adapter.missingKeys!.length).toBeGreaterThan(0);
      expect(adapter.fetchClass).toBe('disabled');
    }
  });
});
