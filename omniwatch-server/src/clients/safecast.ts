import { OmniEvent } from './usgs';

// Safecast radiation monitoring — real data replaces the hardcoded stub (from Crucix)
// No API key needed. Public JSON endpoints.
export async function fetchSafecastRadiation(): Promise<OmniEvent[]> {
  try {
    // Safecast API — recent measurements near nuclear facilities
    const url = 'https://api.safecast.org/en-US/measurements.json?distance=1000&latitude=35.6762&longitude=139.6503&order=created_at+desc&per_page=50';
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return getStaticRadiationNodes();

    const data = await response.json() as any;
    if (!Array.isArray(data) || data.length === 0) return getStaticRadiationNodes();

    const events: OmniEvent[] = [];
    const seen = new Set<string>();

    for (const m of data) {
      if (!m.latitude || !m.longitude) continue;
      const key = `${m.latitude.toFixed(2)}-${m.longitude.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const cpm = m.value || 0;
      let severity: OmniEvent['severity'] = 'minor';
      if (cpm > 50) severity = 'moderate';
      if (cpm > 100) severity = 'major';
      if (cpm > 350) severity = 'critical';

      events.push({
        id: `safecast-${m.id}`,
        source: 'safecast',
        title: `Radiation: ${cpm.toFixed(1)} CPM`,
        severity,
        eventType: 'radiation',
        timestamp: m.captured_at || new Date().toISOString(),
        coordinates: { longitude: m.longitude, latitude: m.latitude },
        metadata: {
          cpm: cpm.toFixed(1),
          unit: m.unit || 'cpm',
          deviceId: m.device_id
        }
      });
    }

    console.log(`[Safecast] Fetched ${events.length} radiation readings.`);
    return events.length > 0 ? events : getStaticRadiationNodes();
  } catch (err) {
    console.warn('[Safecast] API unavailable, using known reactor sites:', err);
    return getStaticRadiationNodes();
  }
}

// Fallback: known nuclear facility locations with estimated background
function getStaticRadiationNodes(): OmniEvent[] {
  const sites = [
    { name: 'Zaporizhzhia NPP', lon: 34.58, lat: 47.51, cpm: 14.2, status: 'Elevated' },
    { name: 'Fukushima Daiichi', lon: 141.03, lat: 37.42, cpm: 8.7, status: 'Monitored' },
    { name: 'Chernobyl Exclusion', lon: 30.10, lat: 51.39, cpm: 22.1, status: 'Elevated' },
    { name: 'Sellafield UK', lon: -3.49, lat: 54.42, cpm: 5.3, status: 'Normal' },
    { name: 'La Hague France', lon: -1.88, lat: 49.68, cpm: 6.1, status: 'Normal' },
  ];
  return sites.map((s, i) => ({
    id: `rad-static-${i}`,
    source: 'safecast(static)',
    title: `${s.name}: ${s.cpm} CPM (${s.status})`,
    severity: s.cpm > 20 ? 'major' : s.cpm > 10 ? 'moderate' : 'minor' as OmniEvent['severity'],
    eventType: 'radiation' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: s.lon, latitude: s.lat },
    metadata: { cpm: s.cpm.toString(), status: s.status }
  }));
}
