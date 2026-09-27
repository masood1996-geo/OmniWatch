import { fetchJson, validCoord } from '../sources/helpers';
import type { OmniEvent, Severity } from '../types';

export function pm25ToSeverity(value: number): Severity {
  if (value > 150) return 'critical';
  if (value > 75) return 'major';
  if (value > 35) return 'moderate';
  return 'minor';
}

// OpenAQ v3 requires a free API key; the v2 endpoint was retired (HTTP 410)
export async function fetchAirQuality(): Promise<OmniEvent[]> {
  try {
    const key = process.env.OPENAQ_API_KEY;
    if (!key) return [];
    const url = 'https://api.openaq.org/v3/locations?limit=100&parameters_id=2&order_by=lastUpdated&sort=desc';
    const data = await fetchJson<any>(url, { headers: { 'X-API-Key': key, Accept: 'application/json' } }, 12000);
    const events: OmniEvent[] = [];

    for (const result of data.results || []) {
      const coordinates = validCoord(result.coordinates?.longitude, result.coordinates?.latitude);
      if (!coordinates) continue;

      const pm25 = (result.sensors || []).find((m: any) => m.parameter?.name === 'pm25' || m.parameter === 'pm25');
      const value = Number(pm25?.latest?.value ?? pm25?.value);
      if (!Number.isFinite(value)) continue;

      const updated = pm25?.latest?.datetime || null;
      events.push({
        id: `aq-${result.id || result.name}`.replace(/\s+/g, '-'),
        source: 'openaq',
        title: `Air Quality: PM2.5 ${value.toFixed(1)} µg/m³ — ${result.name || 'station'}`,
        severity: pm25ToSeverity(value),
        eventType: 'airquality',
        timestamp: updated || new Date().toISOString(),
        sourceTimestamp: updated,
        coordinates,
        metadata: {
          pm25: value.toFixed(1),
          unit: 'µg/m³',
          city: result.locality,
          country: result.country?.code || result.country,
        },
      });
    }

    console.log(`[AirQuality] Fetched ${events.length} PM2.5 readings.`);
    return events;
  } catch (err) {
    console.error('[AirQuality] Error:', err);
    return [];
  }
}
