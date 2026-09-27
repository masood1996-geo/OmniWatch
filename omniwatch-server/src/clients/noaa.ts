import { fetchWithTimeout, hashId, polygonCentroid, toIso } from '../sources/helpers';
import type { OmniEvent, Severity } from '../types';

export const NOAA_ALERT_CAP = 50;

export function noaaSeverity(severity: string | undefined): Severity {
  if (severity === 'Extreme') return 'critical';
  if (severity === 'Severe') return 'major';
  if (severity === 'Moderate') return 'moderate';
  return 'minor';
}

export function normalizeNoaaAlerts(payload: any, cap = NOAA_ALERT_CAP): OmniEvent[] {
  const events: OmniEvent[] = [];
  for (const feature of payload?.features || []) {
    const props = feature?.properties;
    if (!props) continue;
    const geometry = feature?.geometry;
    let coordinates = null;
    if (geometry && (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')) {
      coordinates = polygonCentroid(geometry.coordinates);
    }
    const effective = toIso(props.effective) || toIso(props.sent) || null;
    events.push({
      id: `noaa-${props.id || hashId(props.event, props.areaDesc, effective)}`,
      source: 'noaa-weather',
      title: props.event || 'Severe Weather Alert',
      severity: noaaSeverity(props.severity),
      eventType: 'weather',
      coordinates,
      timestamp: effective || new Date().toISOString(),
      sourceTimestamp: effective,
      metadata: {
        headline: props.headline,
        certainty: props.certainty,
        urgency: props.urgency,
        area: props.areaDesc,
        expires: toIso(props.expires),
      },
    });
  }
  const order: Record<Severity, number> = { critical: 3, major: 2, moderate: 1, minor: 0 };
  events.sort((a, b) => {
    const bySeverity = order[b.severity] - order[a.severity];
    if (bySeverity !== 0) return bySeverity;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  return events.slice(0, cap);
}

export async function fetchWeatherAlerts(): Promise<OmniEvent[]> {
  const res = await fetchWithTimeout('https://api.weather.gov/alerts/active', {
    headers: { Accept: 'application/geo+json' },
  }, 12000);
  if (!res.ok) throw new Error(`NOAA alerts request failed: HTTP ${res.status}`);
  const payload = await res.json();
  return normalizeNoaaAlerts(payload);
}
