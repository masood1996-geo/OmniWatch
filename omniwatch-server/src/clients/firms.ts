import { OmniEvent } from './usgs';

// NASA FIRMS VIIRS 375m satellite fire detection — from TerraMind
// Uses CSV endpoint which is free with FIRMS_MAP_KEY, falls back to EONET if no key
export async function fetchFIRMSFires(): Promise<OmniEvent[]> {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) {
    console.log('[FIRMS] No FIRMS_MAP_KEY set. Skipping satellite fire detection.');
    return [];
  }

  try {
    // VIIRS NOAA-20 375m, last 24h, global CSV
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_NOAA20_NRT/world/1`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return [];

    const text = await response.text();
    const lines = text.split('\n').slice(1); // Skip header
    const events: OmniEvent[] = [];

    // Sample top 200 hotspots to avoid map overload
    for (let i = 0; i < Math.min(lines.length, 200); i++) {
      const cols = lines[i].split(',');
      if (cols.length < 12) continue;

      const lat = parseFloat(cols[0]);
      const lon = parseFloat(cols[1]);
      const brightness = parseFloat(cols[2]);
      const frp = parseFloat(cols[12]) || 0;
      const acqDate = cols[5];
      const acqTime = cols[6];
      const confidence = cols[8];

      if (isNaN(lat) || isNaN(lon)) continue;

      let severity: OmniEvent['severity'] = 'minor';
      if (frp > 10) severity = 'moderate';
      if (frp > 50) severity = 'major';
      if (frp > 200) severity = 'critical';

      events.push({
        id: `firms-${lat.toFixed(3)}-${lon.toFixed(3)}-${i}`,
        source: 'nasa-firms',
        title: `VIIRS Fire Detection (FRP: ${frp.toFixed(1)} MW)`,
        severity,
        eventType: 'firmsfire',
        timestamp: `${acqDate}T${acqTime.padStart(4, '0').slice(0,2)}:${acqTime.padStart(4, '0').slice(2)}:00Z`,
        coordinates: { longitude: lon, latitude: lat },
        metadata: {
          brightness: brightness.toFixed(1),
          frp: frp.toFixed(1),
          confidence,
          satellite: 'NOAA-20 VIIRS'
        }
      });
    }

    console.log(`[FIRMS] Fetched ${events.length} satellite fire hotspots.`);
    return events;
  } catch (err) {
    console.error('[FIRMS] Error fetching satellite fires:', err);
    return [];
  }
}
