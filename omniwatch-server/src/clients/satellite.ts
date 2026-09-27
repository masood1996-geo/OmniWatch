import * as satellite from 'satellite.js';
import { fetchWithTimeout } from '../sources/helpers';
import type { OmniEvent } from '../types';

export function tleEpochToIso(line1: string): string | null {
  const raw = line1.substring(18, 32).trim();
  const match = raw.match(/^(\d{2})(\d{3}\.\d+)$/);
  if (!match) return null;
  const year = 2000 + Number(match[1]);
  const dayOfYear = Number(match[2]);
  const ms = Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86400000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function normalizeTle(text: string, at: Date, limit = 15): OmniEvent[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const events: OmniEvent[] = [];
  for (let i = 0; i + 2 < lines.length && events.length < limit; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (!name || !line1?.startsWith('1 ') || !line2?.startsWith('2 ')) continue;
    try {
      const satrec = satellite.twoline2satrec(line1, line2);
      const pv = satellite.propagate(satrec, at);
      const position = pv.position;
      if (typeof position === 'boolean' || !position) continue;
      const gmst = satellite.gstime(at);
      const gd = satellite.eciToGeodetic(position, gmst);
      events.push({
        id: `sat-${name.replace(/\s+/g, '-')}`,
        source: 'celestrak',
        title: `MILSAT: ${name}`,
        severity: 'moderate',
        eventType: 'satellite',
        coordinates: {
          longitude: satellite.degreesLong(gd.longitude),
          latitude: satellite.degreesLat(gd.latitude),
        },
        timestamp: at.toISOString(),
        sourceTimestamp: tleEpochToIso(line1),
        metadata: {
          altitude: `${gd.height.toFixed(2)} km`,
          elementEpoch: tleEpochToIso(line1),
        },
      });
    } catch { /* skip malformed TLE */ }
  }
  return events;
}

export async function fetchSatellites(): Promise<OmniEvent[]> {
  const res = await fetchWithTimeout(
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=tle',
    {},
    12000,
  );
  if (!res.ok) throw new Error(`CelesTrak request failed: HTTP ${res.status}`);
  return normalizeTle(await res.text(), new Date());
}
