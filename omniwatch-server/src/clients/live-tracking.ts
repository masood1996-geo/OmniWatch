import { config } from '../config';
import { fetchOpenSkyStates, hasOpenSkyCredentials } from './opensky';
import type { AisPosition } from './ais-client';
import { ensureAisStarted, getAisClient, stopAis } from './ais-manager';
import type { FetchClass } from '../types';

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

export interface LiveTrackingSnapshot {
  tracks: LiveTrack[];
  aircraft: LiveClassStatus;
  vessels: LiveClassStatus;
}

const AIRCRAFT_REFRESH_MS = 15000;
let aircraftTracks: LiveTrack[] = [];
let vesselTracks: LiveTrack[] = [];
let lastAircraftFetch = 0;
let aircraftInFlight: Promise<void> | null = null;
let lastAircraftSuccessAt: string | null = null;
let aircraftNote: string | undefined;
let aircraftError = false;

function aircraftStatus(): LiveClassStatus {
  const canLive = (hasOpenSkyCredentials() || config.opensky.allowAnonymous) && Boolean(config.opensky.bbox);
  const fetchClass: FetchClass = canLive ? 'live' : 'disabled';
  let note = aircraftNote;
  if (!canLive) {
    note = !hasOpenSkyCredentials()
      ? 'OpenSky OAuth2 credentials not configured (OPENSKY_CLIENT_ID/SECRET); live 15s refresh disabled. Anonymous mode is credit-metered and blocked on many cloud hosts.'
      : 'OPENSKY_BBOX required for live refresh so credit use stays bounded.';
  }
  return {
    fetchClass,
    provider: 'OpenSky Network',
    license: 'OpenSky Network terms (non-commercial, attribution)',
    count: aircraftTracks.length,
    note,
    lastSuccessAt: lastAircraftSuccessAt,
    stale: fetchClass === 'live' && aircraftError,
  };
}

function vesselStatus(now: number): LiveClassStatus {
  if (!config.aisstream.apiKey) {
    return {
      fetchClass: 'disabled',
      provider: 'AISStream.io',
      license: 'AISStream terms (free tier, attribution)',
      count: 0,
      note: 'AISSTREAM_API_KEY not configured; no vessel positions are shown. Free key: https://aisstream.io',
      lastSuccessAt: null,
      stale: false,
    };
  }
  const client = getAisClient();
  const positions = client ? client.snapshot(now, config.aisstream.snapshotTtlMs) : [];
  const connected = client?.isConnected() ?? false;
  return {
    fetchClass: 'live',
    provider: 'AISStream.io',
    license: 'AISStream terms (free tier, attribution)',
    count: positions.length,
    note: connected
      ? `Managed WebSocket snapshot; positions expire after ${Math.round(config.aisstream.snapshotTtlMs / 60000)} min`
      : 'WebSocket not connected; showing last known positions within TTL',
    lastSuccessAt: connected && client ? new Date(client.lastSubscribedAt() || Date.now()).toISOString() : null,
    stale: !connected,
  };
}

function toVesselTracks(positions: AisPosition[]): LiveTrack[] {
  return positions.map(p => ({
    id: `vessel-${p.mmsi}`,
    type: 'vessel' as const,
    callsign: p.name || p.mmsi,
    lat: p.lat,
    lon: p.lon,
    heading: p.heading || p.cog || 0,
    speed: Math.round(p.sog),
    timestamp: p.receivedAt,
    mmsi: p.mmsi,
  }));
}

async function refreshAircraft(): Promise<void> {
  if (aircraftInFlight) return aircraftInFlight;
  if (!((hasOpenSkyCredentials() || config.opensky.allowAnonymous) && config.opensky.bbox)) return;
  aircraftInFlight = (async () => {
    try {
      const { states } = await fetchOpenSkyStates({
        bbox: config.opensky.bbox,
        allowAnonymous: config.opensky.allowAnonymous,
        timeoutMs: 12000,
      });
      aircraftTracks = states.filter(s => !s.onGround).slice(0, 200).map(s => ({
        id: `aircraft-${s.icao24}`,
        type: 'aircraft' as const,
        callsign: s.callsign || s.icao24,
        lat: s.latitude,
        lon: s.longitude,
        heading: s.heading || 0,
        speed: s.velocity !== null ? Math.round(s.velocity * 1.944) : 0,
        altitude: s.baroAltitude !== null ? Math.round(s.baroAltitude * 3.281) : 0,
        origin: s.originCountry || 'Unknown',
        onGround: s.onGround,
        timestamp: Date.now(),
      }));
      lastAircraftSuccessAt = new Date().toISOString();
      aircraftError = false;
      aircraftNote = undefined;
      lastAircraftFetch = Date.now();
    } catch (err) {
      aircraftError = true;
      aircraftNote = `Last refresh failed: ${(err as Error).message}`;
    } finally {
      aircraftInFlight = null;
    }
  })();
  return aircraftInFlight;
}

export function getLiveTracks(): LiveTrack[] {
  return [...aircraftTracks, ...vesselTracks];
}

export async function refreshLiveTracks(): Promise<LiveTrackingSnapshot> {
  const now = Date.now();
  if (now - lastAircraftFetch >= AIRCRAFT_REFRESH_MS) {
    await refreshAircraft();
  }
  const ais = getAisClient();
  const vesselPositions = ais
    ? ais.snapshot(now, config.aisstream.snapshotTtlMs)
    : [];
  vesselTracks = toVesselTracks(vesselPositions);
  return { tracks: getLiveTracks(), aircraft: aircraftStatus(), vessels: vesselStatus(now) };
}

let liveInterval: NodeJS.Timeout | null = null;

export function startLiveTracking(): void {
  if (config.aisstream.apiKey && !getAisClient()) {
    ensureAisStarted();
    console.log('[LiveTrack] Managed AISStream connection started');
  }
  if (liveInterval) return;
  console.log(`[LiveTrack] Live tracking loop (${AIRCRAFT_REFRESH_MS / 1000}s aircraft refresh)`);
  refreshLiveTracks().catch(() => {});
  liveInterval = setInterval(() => {
    refreshLiveTracks().catch(() => {});
  }, AIRCRAFT_REFRESH_MS);
}

export function stopLiveTracking(): void {
  if (liveInterval) {
    clearInterval(liveInterval);
    liveInterval = null;
  }
  stopAis();
}
