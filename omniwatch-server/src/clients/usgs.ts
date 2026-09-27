import { fetchJson } from '../sources/helpers';
import type { OmniEvent, Severity } from '../types';

export type { OmniEvent, Severity, EventType, EventProvenance, FetchClass } from '../types';

export function magnitudeToSeverity(mag: number): Severity {
  if (mag >= 7.0) return 'critical';
  if (mag >= 5.5) return 'major';
  if (mag >= 4.0) return 'moderate';
  return 'minor';
}

export async function fetchEarthquakes(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
    {},
    10000,
  );
  return (data.features || []).map((feature: any): OmniEvent => {
    const mag = Number(feature.properties?.mag);
    const time = new Date(Number(feature.properties?.time)).toISOString();
    return {
      id: `usgs-${feature.id}`,
      source: 'usgs',
      title: feature.properties?.title || 'Earthquake',
      severity: magnitudeToSeverity(mag),
      coordinates: {
        longitude: Number(feature.geometry?.coordinates?.[0]),
        latitude: Number(feature.geometry?.coordinates?.[1]),
      },
      timestamp: time,
      sourceTimestamp: time,
      eventType: 'earthquake',
      metadata: {
        magnitude: Number.isFinite(mag) ? mag : null,
        depth: Number(feature.geometry?.coordinates?.[2]),
        url: feature.properties?.url,
      },
    };
  });
}
