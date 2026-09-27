import { fetchJson, toIso } from '../sources/helpers';
import type { OmniEvent, Severity } from '../types';

export function kpToSeverity(kp: number): Severity {
  if (kp >= 7) return 'critical';
  if (kp >= 5) return 'major';
  if (kp >= 4) return 'moderate';
  return 'minor';
}

export function kpStormLevel(kp: number): string {
  if (kp >= 8) return 'G4-G5 severe storm';
  if (kp >= 7) return 'G3 strong storm';
  if (kp >= 6) return 'G2 storm';
  if (kp >= 5) return 'G1 storm';
  if (kp >= 4) return 'Active';
  return 'Quiet';
}

export function normalizeSpaceWeather(data: any): OmniEvent[] {
  if (!Array.isArray(data) || data.length === 0) throw new Error('NOAA SWPC returned unexpected payload');
  let kp: number | null = null;
  let timeTag: string | null = null;
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    if (row && !Array.isArray(row) && typeof row === 'object' && row.Kp !== undefined) {
      kp = Number(row.Kp);
      timeTag = toIso(row.time_tag);
      break;
    }
    if (Array.isArray(row) && row.length >= 2 && Number.isFinite(Number(row[1]))) {
      kp = Number(row[1]);
      timeTag = toIso(row[0]);
      break;
    }
  }
  if (kp === null || !Number.isFinite(kp)) throw new Error('NOAA SWPC payload contained no Kp reading');
  return [{
    id: 'spacewx-kp',
    source: 'noaa-swpc',
    title: `Space weather: Kp ${kp.toFixed(1)} — ${kpStormLevel(kp)}`,
    severity: kpToSeverity(kp),
    eventType: 'spaceweather',
    coordinates: { longitude: 0, latitude: 90 },
    timestamp: timeTag || new Date().toISOString(),
    sourceTimestamp: timeTag,
    metadata: {
      kpIndex: kp.toFixed(1),
      stormLevel: kpStormLevel(kp),
      source: 'NOAA Space Weather Prediction Center',
      venueNote: 'Marker at the north pole as a global indicator',
    },
  }];
}

export async function fetchSpaceWeather(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>(
    'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
    {},
    10000,
  );
  return normalizeSpaceWeather(data);
}
