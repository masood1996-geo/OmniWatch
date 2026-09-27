import { fetchJson } from '../sources/helpers';
import type { OmniEvent } from '../types';

export const ADSB_MIL_URL = 'https://api.adsb.lol/v2/mil';

export function normalizeAdsbMilitary(payload: any, limit = 150): OmniEvent[] {
  const events: OmniEvent[] = [];
  for (const craft of (payload?.ac || []).slice(0, limit)) {
    const lat = Number(craft?.lat);
    const lon = Number(craft?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const hex = String(craft?.hex || '').toLowerCase();
    if (!hex) continue;
    events.push({
      id: `adsb-${hex}`,
      source: 'adsb.lol',
      title: `Military Aircraft: ${craft.r || craft.t || 'Unknown'} (${craft.flight?.trim() || 'No Callsign'})`,
      severity: 'moderate',
      eventType: 'military',
      coordinates: { longitude: lon, latitude: lat },
      timestamp: new Date().toISOString(),
      sourceTimestamp: craft.seen_pos ? new Date(Date.now() - Number(craft.seen_pos) * 1000).toISOString() : null,
      metadata: {
        altitude: craft.alt_baro,
        speed: craft.gs,
        heading: craft.track,
        hex,
        type: craft.t,
        registration: craft.r,
      },
    });
  }
  return events;
}

export async function fetchMilitaryAircraft(): Promise<OmniEvent[]> {
  const payload = await fetchJson<any>(ADSB_MIL_URL, { headers: { Accept: 'application/json' } }, 15000);
  return normalizeAdsbMilitary(payload);
}
