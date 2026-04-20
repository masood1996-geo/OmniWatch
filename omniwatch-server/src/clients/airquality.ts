import { OmniEvent } from './usgs';

// OpenAQ — real-time global air quality PM2.5 monitoring (from Shadowbroker)
// No API key needed for basic access.
export async function fetchAirQuality(): Promise<OmniEvent[]> {
  try {
    const url = 'https://api.openaq.org/v2/latest?limit=50&parameter=pm25&order_by=lastUpdated&sort=desc';
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return [];

    const data = await response.json() as any;
    const events: OmniEvent[] = [];

    for (const result of data.results || []) {
      if (!result.coordinates) continue;

      const pm25 = result.measurements?.find((m: any) => m.parameter === 'pm25');
      if (!pm25) continue;

      const value = pm25.value;
      let severity: OmniEvent['severity'] = 'minor';
      // WHO guideline: 15 µg/m³ annual, 45 µg/m³ 24hr
      if (value > 35) severity = 'moderate';
      if (value > 75) severity = 'major';
      if (value > 150) severity = 'critical';

      events.push({
        id: `aq-${result.location}-${result.city}`.replace(/\s+/g, '-'),
        source: 'openaq',
        title: `Air Quality: PM2.5 ${value.toFixed(1)} µg/m³ — ${result.location}`,
        severity,
        eventType: 'airquality',
        timestamp: pm25.lastUpdated || new Date().toISOString(),
        coordinates: { longitude: result.coordinates.longitude, latitude: result.coordinates.latitude },
        metadata: {
          pm25: value.toFixed(1),
          unit: 'µg/m³',
          city: result.city,
          country: result.country
        }
      });
    }

    console.log(`[AirQuality] Fetched ${events.length} PM2.5 readings.`);
    return events;
  } catch (err) {
    console.error('[AirQuality] Error:', err);
    return [];
  }
}
