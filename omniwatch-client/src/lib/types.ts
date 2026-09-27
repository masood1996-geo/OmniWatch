export type FetchClass = 'live' | 'delayed' | 'static' | 'simulated' | 'disabled';

export type Severity = 'minor' | 'moderate' | 'major' | 'critical';

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
  eventType: string;
  metadata: Record<string, unknown>;
  provenance?: EventProvenance;
}

export interface SourceStats {
  status: 'ok' | 'error' | 'disabled' | 'skipped';
  count: number;
  fetchClass: FetchClass;
  latencyMs: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  consecutiveFailures: number;
  reason?: string;
}

export type SourceStatusMap = Record<string, SourceStats>;

export interface SourceHealth {
  id: string;
  label: string;
  tier: number;
  fetchClass: FetchClass;
  provider: string;
  license: string;
  attribution: string;
  status: SourceStats['status'];
  count: number;
  latencyMs: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  circuitOpenUntil: string | null;
  notes?: string;
}

export interface LiveTrack {
  id: string;
  type: 'aircraft' | 'vessel';
  callsign: string;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
  altitude?: number;
  origin?: string;
  onGround?: boolean;
  timestamp: number;
  mmsi?: string;
}

export interface LiveClassStatus {
  fetchClass: FetchClass;
  provider: string;
  license: string;
  count: number;
  note?: string;
  lastSuccessAt: string | null;
  stale: boolean;
}

export interface LiveTrackingResponse {
  success: boolean;
  count: number;
  aircraft: number;
  vessels: number;
  timestamp: string;
  tracks: LiveTrack[];
  status?: { aircraft: LiveClassStatus; vessels: LiveClassStatus };
}

export interface EventsResponse {
  success: boolean;
  count: number;
  totalCount: number;
  timestamp: string;
  sources: SourceStatusMap;
  sweepDurationMs: number;
  refreshIntervalMs?: number;
  provenanceCounts?: Record<string, number>;
  events: OmniEvent[];
}

export interface HealthResponse {
  status: string;
  lastSweep: string | null;
  totalSignals: number;
  totalSources: number;
  liveSources: number;
  disabledSources: number;
  errorSources: number;
  sources: SourceStatusMap;
  sourceHealth: SourceHealth[];
}
