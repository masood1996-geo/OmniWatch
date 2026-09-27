import type { OmniEvent } from '../types';
import { SEVERITY_ORDER } from '../types';

export interface DeltaResult {
  newEvents: OmniEvent[];
  removedEvents: OmniEvent[];
  escalatedEvents: OmniEvent[];
  counts: { new: number; removed: number; escalated: number; total: number };
}

export function computeDelta(current: OmniEvent[], previous: OmniEvent[]): DeltaResult {
  const prevById = new Map(previous.map(e => [e.id, e]));
  const currById = new Map(current.map(e => [e.id, e]));

  const newEvents = current.filter(e => !prevById.has(e.id));
  const removedEvents = previous.filter(e => !currById.has(e.id));
  const escalatedEvents = current.filter(e => {
    const prev = prevById.get(e.id);
    if (!prev) return false;
    return SEVERITY_ORDER[e.severity] > SEVERITY_ORDER[prev.severity];
  });

  return {
    newEvents,
    removedEvents,
    escalatedEvents,
    counts: {
      new: newEvents.length,
      removed: removedEvents.length,
      escalated: escalatedEvents.length,
      total: current.length,
    },
  };
}

export function isNewEvent(event: OmniEvent, previous: OmniEvent[]): boolean {
  return !previous.some(p => p.id === event.id);
}
