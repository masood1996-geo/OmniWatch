import { describe, expect, it } from 'vitest';
import { computeDelta, isNewEvent } from '../src/pipeline/delta';
import type { OmniEvent } from '../src/types';

function event(id: string, severity: OmniEvent['severity'] = 'minor'): OmniEvent {
  return {
    id,
    source: 'test',
    title: `Event ${id}`,
    severity,
    coordinates: { longitude: 0, latitude: 0 },
    timestamp: '2026-09-27T10:00:00.000Z',
    sourceTimestamp: '2026-09-27T10:00:00.000Z',
    eventType: 'earthquake',
    metadata: {},
  };
}

describe('delta engine', () => {
  it('detects new, removed, and escalated events', () => {
    const previous = [event('a'), event('b', 'moderate')];
    const current = [event('b', 'critical'), event('c')];
    const delta = computeDelta(current, previous);
    expect(delta.counts.new).toBe(1);
    expect(delta.counts.removed).toBe(1);
    expect(delta.counts.escalated).toBe(1);
    expect(delta.newEvents[0].id).toBe('c');
    expect(delta.removedEvents[0].id).toBe('a');
    expect(delta.escalatedEvents[0].id).toBe('b');
  });

  it('reports no new events when the same deterministic IDs repeat', () => {
    const previous = [event('stable-1'), event('stable-2')];
    const current = [event('stable-1'), event('stable-2')];
    const delta = computeDelta(current, previous);
    expect(delta.counts).toEqual({ new: 0, removed: 0, escalated: 0, total: 2 });
  });

  it('does not treat a de-escalation as escalation', () => {
    const delta = computeDelta([event('a', 'minor')], [event('a', 'critical')]);
    expect(delta.counts.escalated).toBe(0);
  });

  it('isNewEvent dedupes by id', () => {
    expect(isNewEvent(event('a'), [event('b')])).toBe(true);
    expect(isNewEvent(event('a'), [event('a')])).toBe(false);
  });
});
