import { clamp } from '../sources/helpers';
import { HealthTracker } from '../sources/health';
import { buildRegistry } from '../sources/registry';
import { evaluateIntelligence } from './llm';
import type { OmniEvent, SourceAdapter, SweepResult } from '../types';

const GEO_TYPES = new Set([
  'earthquake', 'fire', 'firmsfire', 'weather', 'volcano', 'radiation',
  'maritime', 'military', 'conflict', 'flight', 'satellite', 'airquality',
]);

export function normalizeEvent(raw: OmniEvent, adapter: SourceAdapter, fetchedAt: Date): OmniEvent {
  const sourceTimestamp = raw.sourceTimestamp === undefined
    ? (raw.timestamp || null)
    : raw.sourceTimestamp;
  let confidence = adapter.confidence;
  if (!raw.coordinates && GEO_TYPES.has(raw.eventType)) confidence -= 0.15;
  if (!sourceTimestamp) confidence -= 0.1;
  return {
    ...raw,
    timestamp: raw.timestamp || fetchedAt.toISOString(),
    sourceTimestamp,
    fetchedAt: fetchedAt.toISOString(),
    provenance: {
      fetchClass: adapter.fetchClass,
      fetchedAt: fetchedAt.toISOString(),
      sourceTimestamp,
      provider: adapter.provider,
      sourceId: adapter.id,
      license: adapter.license,
      attribution: adapter.attribution,
      confidence: Number(clamp(confidence).toFixed(2)),
      statusNote: adapter.notes,
    },
  };
}

export interface SweepEngineOptions {
  adapters?: SourceAdapter[];
  now?: () => Date;
  adapterTimeoutMs?: number;
  onSweep?: (result: SweepResult) => void;
}

export class SweepEngine {
  readonly health: HealthTracker;
  private adapters: SourceAdapter[];
  private now: () => Date;
  private adapterTimeoutMs: number;
  private sweepListeners = new Set<(result: SweepResult) => void>();
  private cache = new Map<string, { lastRunAt: number; events: OmniEvent[] }>();
  private previousEvents: OmniEvent[] = [];
  private lastSweep: SweepResult | null = null;
  private inProgress = false;

  constructor(options: SweepEngineOptions = {}) {
    this.adapters = options.adapters || buildRegistry();
    this.now = options.now || (() => new Date());
    this.adapterTimeoutMs = options.adapterTimeoutMs || 60000;
    if (options.onSweep) this.sweepListeners.add(options.onSweep);
    this.health = new HealthTracker(this.adapters);
  }

  onSweepComplete(listener: (result: SweepResult) => void): () => void {
    this.sweepListeners.add(listener);
    return () => this.sweepListeners.delete(listener);
  }

  getLastSweep(): SweepResult | null {
    return this.lastSweep;
  }

  getPreviousEvents(): OmniEvent[] {
    return this.previousEvents;
  }

  adaptersList(): SourceAdapter[] {
    return this.adapters;
  }

  async run(): Promise<SweepResult> {
    if (this.inProgress) {
      return this.lastSweep || this.emptyResult();
    }
    this.inProgress = true;
    const started = Date.now();
    const now = this.now();
    const allEvents: OmniEvent[] = [];

    try {
      const results = await Promise.allSettled(
        this.adapters.map(async (adapter): Promise<OmniEvent[]> => {
          if (adapter.fetchClass === 'disabled') {
            this.health.markDisabled(adapter.id, adapter.disabledReason || 'disabled');
            return [];
          }
          if (this.health.isCircuitOpen(adapter.id, now)) {
            const state = this.health.get(adapter.id);
            this.health.markSkipped(adapter.id, `Circuit open until ${state?.circuitOpenUntil}`);
            return [];
          }
          const cached = this.cache.get(adapter.id);
          if (cached && now.getTime() - cached.lastRunAt < adapter.refreshMs) {
            this.health.markSuccess(adapter.id, cached.events.length, 0, now);
            const state = this.health.get(adapter.id);
            if (state) state.notes = `Cached (refresh every ${Math.round(adapter.refreshMs / 60000)} min)`;
            return cached.events;
          }
          const startedAdapter = Date.now();
          const events = await this.withTimeout(adapter.fetch({ now }), this.adapterTimeoutMs, adapter.id);
          const normalized = events.map(e => normalizeEvent(e, adapter, this.now()));
          this.cache.set(adapter.id, { lastRunAt: this.now().getTime(), events: normalized });
          this.health.markSuccess(adapter.id, normalized.length, Date.now() - startedAdapter, this.now());
          return normalized;
        }),
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          allEvents.push(...result.value);
        }
      });

      const correlated = await evaluateIntelligence(allEvents);

      this.previousEvents = this.lastSweep?.events || [];
      const sources = this.health.stats();
      const liveCount = this.adapters.filter(a => a.fetchClass === 'live').length;
      const disabledCount = this.adapters.filter(a => a.fetchClass === 'disabled').length;
      const errorCount = Object.values(sources).filter(s => s.status === 'error').length;

      this.lastSweep = {
        events: correlated,
        timestamp: this.now().toISOString(),
        durationMs: Date.now() - started,
        sources,
        totalSources: this.adapters.length,
        liveSources: liveCount,
        disabledSources: disabledCount,
        errorSources: errorCount,
      };
      for (const listener of this.sweepListeners) {
        try { listener(this.lastSweep); } catch (err) { console.warn(`[Sweep] Listener failed: ${(err as Error).message}`); }
      }
      console.log(`[Sweep] ${correlated.length} signals from ${liveCount - errorCount}/${liveCount} live sources (${disabledCount} disabled) in ${this.lastSweep.durationMs}ms`);
      return this.lastSweep;
    } finally {
      this.inProgress = false;
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        }),
      ]);
    } catch (err) {
      const adapter = this.adapters.find(a => a.id === label);
      if (adapter) this.health.markFailure(adapter.id, (err as Error).message, this.now());
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private emptyResult(): SweepResult {
    return {
      events: [],
      timestamp: this.now().toISOString(),
      durationMs: 0,
      sources: {},
      totalSources: this.adapters.length,
      liveSources: 0,
      disabledSources: 0,
      errorSources: 0,
    };
  }
}

let defaultEngine: SweepEngine | null = null;

export function getSweepEngine(): SweepEngine {
  if (!defaultEngine) {
    defaultEngine = new SweepEngine();
  }
  return defaultEngine;
}

export async function runSweep(): Promise<OmniEvent[]> {
  const engine = getSweepEngine();
  const result = await engine.run();
  return result.events;
}

export function getLastSweep(): SweepResult | null {
  return getSweepEngine().getLastSweep();
}

export function getPreviousEvents(): OmniEvent[] {
  return getSweepEngine().getPreviousEvents();
}
