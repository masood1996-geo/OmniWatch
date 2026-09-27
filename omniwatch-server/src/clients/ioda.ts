import { fetchJson, toIso } from '../sources/helpers';
import type { OmniEvent, Severity } from '../types';

export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  US: [-98.58, 39.83], CN: [104.19, 35.86], RU: [105.32, 61.52],
  IN: [78.96, 20.59], BR: [-51.93, -14.24], IR: [53.69, 32.43],
  PK: [69.35, 30.38], NG: [8.68, 9.08], BD: [90.36, 23.68],
  MX: [-102.55, 23.63], EG: [30.80, 26.82], TR: [35.24, 38.96],
  UA: [31.17, 48.38], SY: [38.99, 34.80], IQ: [43.68, 33.22],
  SD: [30.22, 12.86], MM: [95.96, 21.91], AF: [67.71, 33.94],
  VE: [-66.59, 6.42], CU: [-77.78, 21.52],
};

export function outageScoreToSeverity(score: number, durationSeconds: number): Severity {
  if (score > 100000 || durationSeconds > 21600) return 'critical';
  if (score > 10000 || durationSeconds > 3600) return 'major';
  if (score > 1000) return 'moderate';
  return 'minor';
}

export function normalizeIoda(payload: any): OmniEvent[] {
  const events: OmniEvent[] = [];
  for (const item of payload?.data || []) {
    const location = String(item.location || '');
    const [, code] = location.split('/');
    if (!code) continue;
    const centroid = COUNTRY_CENTROIDS[code.toUpperCase()];
    const start = toIso(Number(item.start));
    const duration = Number(item.duration) || 0;
    const score = Number(item.score) || 0;
    events.push({
      id: `ioda-${code}-${item.start}`,
      source: 'ioda',
      title: `Internet outage: ${item.location_name || code} (${item.datasource || 'bgp'}, ${Math.round(duration / 60)} min)`,
      severity: outageScoreToSeverity(score, duration),
      eventType: 'infrastructure',
      coordinates: centroid ? { longitude: centroid[0], latitude: centroid[1] } : null,
      timestamp: start || new Date().toISOString(),
      sourceTimestamp: start,
      metadata: {
        entity: location,
        entityName: item.location_name,
        datasource: item.datasource,
        score,
        durationSeconds: duration,
        note: centroid ? 'Marker at country centroid (approximate)' : 'No map marker: IODA entity has no coordinates',
      },
    });
  }
  return events;
}

export async function fetchInternetOutages(): Promise<OmniEvent[]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - 21600;
  const data = await fetchJson<any>(
    `https://api.ioda.inetintel.cc.gatech.edu/v2/outages/events?from=${start}&until=${end}&limit=50`,
    { headers: { Accept: 'application/json' } },
    20000,
  );
  return normalizeIoda(data);
}
