import { config } from '../config';
import { fetchWithTimeout } from '../sources/helpers';

const TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const API_URL = 'https://opensky-network.org/api/states/all';

export interface OpenSkyState {
  icao24: string;
  callsign: string;
  originCountry: string;
  longitude: number;
  latitude: number;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  heading: number | null;
  verticalRate: number | null;
  timePosition: number | null;
}

interface TokenCache {
  token: string;
  expiresAtMs: number;
}

let tokenCache: TokenCache | null = null;

export function resetOpenSkyTokenCache(): void {
  tokenCache = null;
}

export function hasOpenSkyCredentials(): boolean {
  return Boolean(config.opensky.clientId && config.opensky.clientSecret);
}

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAtMs - 60_000) {
    return tokenCache.token;
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.opensky.clientId,
    client_secret: config.opensky.clientSecret,
  });
  const res = await fetchWithTimeout(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }, 15000);
  if (!res.ok) {
    throw new Error(`OpenSky token request failed: HTTP ${res.status}`);
  }
  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error('OpenSky token response missing access_token');
  tokenCache = {
    token: data.access_token,
    expiresAtMs: Date.now() + (Number(data.expires_in) || 1800) * 1000,
  };
  return tokenCache.token;
}

export interface OpenSkyQueryOptions {
  bbox?: string;
  allowAnonymous?: boolean;
  timeoutMs?: number;
}

export async function fetchOpenSkyStates(options: OpenSkyQueryOptions = {}): Promise<{ states: OpenSkyState[]; authenticated: boolean }> {
  const authenticated = hasOpenSkyCredentials();
  if (!authenticated && !options.allowAnonymous) {
    throw new Error('OpenSky credentials not configured (OPENSKY_CLIENT_ID/OPENSKY_CLIENT_SECRET)');
  }
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authenticated) {
    headers.Authorization = `Bearer ${await getToken()}`;
  }
  const params = options.bbox ? `?${options.bbox.replace(/^\?/, '')}` : '';
  const res = await fetchWithTimeout(API_URL + params, { headers }, options.timeoutMs ?? 15000);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) tokenCache = null;
    throw new Error(`OpenSky states request failed: HTTP ${res.status}`);
  }
  const data = await res.json() as { states?: any[]; time?: number };
  const states: OpenSkyState[] = [];
  for (const row of data.states || []) {
    if (!Array.isArray(row)) continue;
    const lon = Number(row[5]);
    const lat = Number(row[6]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    states.push({
      icao24: String(row[0] || ''),
      callsign: String(row[1] || '').trim(),
      originCountry: String(row[2] || ''),
      longitude: lon,
      latitude: lat,
      baroAltitude: row[7] === null || row[7] === undefined ? null : Number(row[7]),
      onGround: Boolean(row[8]),
      velocity: row[9] === null || row[9] === undefined ? null : Number(row[9]),
      heading: row[10] === null || row[10] === undefined ? null : Number(row[10]),
      verticalRate: row[11] === null || row[11] === undefined ? null : Number(row[11]),
      timePosition: row[3] === null || row[3] === undefined ? null : Number(row[3]),
    });
  }
  return { states, authenticated };
}

export async function fetchOpenSkyFlights(): Promise<import('../types').OmniEvent[]> {
  const useBbox = config.opensky.bbox || undefined;
  const { states, authenticated } = await fetchOpenSkyStates({
    bbox: useBbox,
    allowAnonymous: config.opensky.allowAnonymous,
    timeoutMs: 15000,
  });
  const events: import('../types').OmniEvent[] = [];
  const sampled = states.filter(s => !s.onGround).slice(0, 120);
  for (const state of sampled) {
    events.push({
      id: `opensky-${state.icao24}`,
      source: 'opensky',
      title: `Flight ${state.callsign || state.icao24} (${state.originCountry})`,
      severity: 'minor',
      eventType: 'flight',
      timestamp: state.timePosition ? new Date(state.timePosition * 1000).toISOString() : new Date().toISOString(),
      sourceTimestamp: state.timePosition ? new Date(state.timePosition * 1000).toISOString() : null,
      coordinates: { longitude: state.longitude, latitude: state.latitude },
      metadata: {
        callsign: state.callsign,
        origin: state.originCountry,
        altitude: state.baroAltitude !== null ? `${(state.baroAltitude * 3.281).toFixed(0)} ft` : 'N/A',
        speed: state.velocity !== null ? `${(state.velocity * 1.944).toFixed(0)} kts` : 'N/A',
        heading: state.heading !== null ? state.heading.toFixed(0) : null,
        authenticated,
      },
    });
  }
  return events;
}
