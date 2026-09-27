import { describe, expect, it } from 'vitest';
import { normalizeEvent } from '../src/pipeline/sweep';
import { parseCorrelationResponse, applyCorrelation } from '../src/pipeline/llm';
import type { OmniEvent, SourceAdapter } from '../src/types';

const adapter: SourceAdapter = {
  id: 'test-source',
  label: 'Test Source',
  tier: 1,
  fetchClass: 'live',
  provider: 'Test Provider',
  license: 'CC0',
  attribution: 'Test Attribution',
  confidence: 0.9,
  refreshMs: 60000,
  fetch: async () => [],
};

const baseEvent: OmniEvent = {
  id: 'e1',
  source: 'test-source',
  title: 'Test event',
  severity: 'moderate',
  coordinates: { longitude: 10, latitude: 20 },
  timestamp: '2026-09-27T10:00:00.000Z',
  sourceTimestamp: '2026-09-27T09:59:00.000Z',
  eventType: 'earthquake',
  metadata: {},
};

describe('normalizeEvent', () => {
  it('attaches full provenance to every event', () => {
    const fetchedAt = new Date('2026-09-27T10:01:00.000Z');
    const normalized = normalizeEvent(baseEvent, adapter, fetchedAt);
    expect(normalized.provenance).toMatchObject({
      fetchClass: 'live',
      fetchedAt: fetchedAt.toISOString(),
      sourceTimestamp: '2026-09-27T09:59:00.000Z',
      provider: 'Test Provider',
      sourceId: 'test-source',
      license: 'CC0',
      attribution: 'Test Attribution',
    });
    expect(normalized.fetchedAt).toBe(fetchedAt.toISOString());
  });

  it('reduces confidence when coordinates are missing for geo event types', () => {
    const noCoords = normalizeEvent({ ...baseEvent, coordinates: null }, adapter, new Date());
    const withCoords = normalizeEvent(baseEvent, adapter, new Date());
    expect(noCoords.provenance!.confidence).toBeLessThan(withCoords.provenance!.confidence);
  });

  it('reduces confidence when there is no source timestamp', () => {
    const fetchedAt = new Date('2026-09-27T10:01:00.000Z');
    const noSourceTime = normalizeEvent(
      { ...baseEvent, sourceTimestamp: null, timestamp: fetchedAt.toISOString() },
      adapter,
      fetchedAt,
    );
    expect(noSourceTime.provenance!.confidence).toBeLessThan(0.9);
  });

  it('never lets confidence escape 0..1', () => {
    const weak = { ...adapter, confidence: 0.05 };
    const normalized = normalizeEvent({ ...baseEvent, coordinates: null, sourceTimestamp: null }, weak, new Date());
    expect(normalized.provenance!.confidence).toBeGreaterThanOrEqual(0);
    expect(normalized.provenance!.confidence).toBeLessThanOrEqual(1);
  });
});

describe('LLM correlation contract', () => {
  it('parses an array of {id, reason} objects', () => {
    const flags = parseCorrelationResponse('[{"id":"a","reason":"overlap"}]');
    expect(flags).toEqual([{ id: 'a', reason: 'overlap' }]);
  });

  it('parses the legacy {flags:[]} shape', () => {
    const flags = parseCorrelationResponse('{"flags":[{"id":"b","reason":"near military"}]}');
    expect(flags).toEqual([{ id: 'b', reason: 'near military' }]);
  });

  it('applies flags by escalating matching events only', () => {
    const events: OmniEvent[] = [
      { ...baseEvent, id: 'a' },
      { ...baseEvent, id: 'b' },
    ];
    applyCorrelation(events, [{ id: 'a', reason: 'test' }]);
    expect(events[0].severity).toBe('critical');
    expect(events[0].metadata.correlation).toBe('test');
    expect(events[1].severity).toBe('moderate');
  });

  it('returns [] for malformed payloads', () => {
    expect(parseCorrelationResponse('not json')).toEqual([]);
    expect(parseCorrelationResponse('{}')).toEqual([]);
  });
});
