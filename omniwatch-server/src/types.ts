export type FetchClass = 'live' | 'delayed' | 'static' | 'simulated' | 'disabled';

export type Severity = 'minor' | 'moderate' | 'major' | 'critical';

export type EventType =
  | 'earthquake' | 'fire' | 'military' | 'conflict'
  | 'weather' | 'satellite' | 'maritime' | 'economics'
  | 'radiation' | 'infrastructure' | 'volcano' | 'airquality'
  | 'spaceweather' | 'flight' | 'firmsfire'
  | 'cyber' | 'health' | 'humanitarian' | 'sanctions'
  | 'social' | 'technology' | 'news';

export interface Coordinates {
  longitude: number;
  latitude: number;
}

export interface EventProvenance {
  fetchClass: FetchClass;
  fetchedAt: string;
  sourceTimestamp: string | null;
  provider: string;
  sourceId: string;
  license: string;
  attribution: string;
  confidence: number;
  verifiedAsOf?: string | null;
  statusNote?: string;
}

export interface OmniEvent {
  id: string;
  source: string;
  title: string;
  severity: Severity;
  coordinates: Coordinates | null;
  timestamp: string;
  sourceTimestamp?: string | null;
  fetchedAt?: string;
  eventType: EventType;
  metadata: Record<string, any>;
  provenance?: EventProvenance;
}

export interface AdapterContext {
  now: Date;
}

export interface SourceAdapter {
  id: string;
  label: string;
  tier: number;
  fetchClass: FetchClass;
  provider: string;
  license: string;
  attribution: string;
  confidence: number;
  refreshMs: number;
  requiresKeys?: string[];
  missingKeys?: string[];
  disabledReason?: string;
  notes?: string;
  fetch: (ctx: AdapterContext) => Promise<OmniEvent[]>;
}

export interface SourceHealthState {
  id: string;
  label: string;
  tier: number;
  fetchClass: FetchClass;
  provider: string;
  license: string;
  attribution: string;
  status: 'ok' | 'error' | 'disabled' | 'skipped';
  count: number;
  latencyMs: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  circuitOpenUntil: string | null;
  notes?: string;
}

export interface SweepSourceStats {
  status: SourceHealthState['status'];
  count: number;
  fetchClass: FetchClass;
  latencyMs: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  consecutiveFailures: number;
  reason?: string;
}

export interface SweepResult {
  events: OmniEvent[];
  timestamp: string;
  durationMs: number;
  sources: Record<string, SweepSourceStats>;
  totalSources: number;
  liveSources: number;
  disabledSources: number;
  errorSources: number;
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  minor: 0,
  moderate: 1,
  major: 2,
  critical: 3,
};
