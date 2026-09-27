import type { SourceAdapter, SourceHealthState, SweepSourceStats } from '../types';

export const FAILURE_THRESHOLD = 3;
export const BASE_BACKOFF_MS = 30_000;
export const MAX_BACKOFF_MS = 30 * 60 * 1000;

export class HealthTracker {
  private states = new Map<string, SourceHealthState>();

  constructor(adapters: SourceAdapter[]) {
    for (const adapter of adapters) {
      this.states.set(adapter.id, {
        id: adapter.id,
        label: adapter.label,
        tier: adapter.tier,
        fetchClass: adapter.fetchClass,
        provider: adapter.provider,
        license: adapter.license,
        attribution: adapter.attribution,
        status: adapter.fetchClass === 'disabled' ? 'disabled' : 'skipped',
        count: 0,
        latencyMs: 0,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastError: null,
        consecutiveFailures: 0,
        circuitOpenUntil: null,
        notes: adapter.fetchClass === 'disabled' ? adapter.disabledReason : adapter.notes,
      });
    }
  }

  get(id: string): SourceHealthState | undefined {
    return this.states.get(id);
  }

  all(): SourceHealthState[] {
    return [...this.states.values()];
  }

  markDisabled(id: string, reason: string): void {
    const state = this.states.get(id);
    if (!state) return;
    state.status = 'disabled';
    state.notes = reason;
  }

  isCircuitOpen(id: string, now: Date): boolean {
    const state = this.states.get(id);
    if (!state?.circuitOpenUntil) return false;
    return new Date(state.circuitOpenUntil).getTime() > now.getTime();
  }

  markSkipped(id: string, reason: string): void {
    const state = this.states.get(id);
    if (!state) return;
    state.status = 'skipped';
    state.notes = reason;
  }

  markSuccess(id: string, count: number, latencyMs: number, now: Date): void {
    const state = this.states.get(id);
    if (!state) return;
    state.status = 'ok';
    state.count = count;
    state.latencyMs = latencyMs;
    state.lastSuccessAt = now.toISOString();
    state.consecutiveFailures = 0;
    state.circuitOpenUntil = null;
    state.notes = undefined;
  }

  markFailure(id: string, error: string, now: Date): void {
    const state = this.states.get(id);
    if (!state) return;
    state.status = 'error';
    state.count = 0;
    state.lastErrorAt = now.toISOString();
    state.lastError = error;
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
      const over = state.consecutiveFailures - FAILURE_THRESHOLD;
      const backoff = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** over);
      state.circuitOpenUntil = new Date(now.getTime() + backoff).toISOString();
    }
  }

  stats(): Record<string, SweepSourceStats> {
    const out: Record<string, SweepSourceStats> = {};
    for (const state of this.states.values()) {
      out[state.id] = {
        status: state.status,
        count: state.count,
        fetchClass: state.fetchClass,
        latencyMs: state.latencyMs,
        lastSuccessAt: state.lastSuccessAt,
        lastErrorAt: state.lastErrorAt,
        consecutiveFailures: state.consecutiveFailures,
        reason: state.status === 'error'
          ? state.lastError || 'error'
          : state.notes,
      };
    }
    return out;
  }
}
