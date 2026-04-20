import { OmniEvent } from './usgs';

// DeepState Ukraine Frontline — live warzone GeoJSON (from Shadowbroker)
// Public API, no key needed
export async function fetchUkraineFrontline(): Promise<OmniEvent[]> {
  try {
    const url = 'https://deepstatemap.live/api/history/last';
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return getFallbackFrontline();

    const data = await response.json() as any;
    const events: OmniEvent[] = [];

    // DeepState returns GeoJSON features with different control zones
    if (data.features) {
      for (const feature of data.features.slice(0, 30)) {
        if (!feature.geometry?.coordinates) continue;
        let coords = feature.geometry.coordinates;
        // Handle different geometry types
        if (feature.geometry.type === 'Polygon') coords = coords[0][0];
        else if (feature.geometry.type === 'MultiPolygon') coords = coords[0][0][0];
        else if (feature.geometry.type === 'Point') coords = coords;
        else continue;

        if (!Array.isArray(coords) || coords.length < 2) continue;

        events.push({
          id: `deepstate-${feature.properties?.id || Math.random().toString(36).slice(2)}`,
          source: 'deepstate',
          title: `Frontline: ${feature.properties?.name || feature.properties?.type || 'Zone Change'}`,
          severity: 'critical',
          eventType: 'conflict',
          timestamp: feature.properties?.date || new Date().toISOString(),
          coordinates: { longitude: coords[0], latitude: coords[1] },
          metadata: {
            type: feature.properties?.type,
            description: feature.properties?.description,
            controlledBy: feature.properties?.controlled_by
          }
        });
      }
    }
    console.log(`[DeepState] Fetched ${events.length} frontline positions.`);
    return events.length > 0 ? events : getFallbackFrontline();
  } catch (err) {
    console.warn('[DeepState] API unavailable, using known frontline positions');
    return getFallbackFrontline();
  }
}

function getFallbackFrontline(): OmniEvent[] {
  const positions = [
    { name: 'Zaporizhzhia Front', lon: 35.14, lat: 47.84 },
    { name: 'Donetsk Front', lon: 37.80, lat: 48.00 },
    { name: 'Luhansk Front', lon: 38.95, lat: 48.57 },
    { name: 'Kherson Front', lon: 33.35, lat: 46.63 },
    { name: 'Bakhmut Sector', lon: 38.00, lat: 48.59 },
    { name: 'Avdiivka Sector', lon: 37.75, lat: 48.14 },
    { name: 'Kupyansk Sector', lon: 37.62, lat: 49.71 },
  ];
  return positions.map((p, i) => ({
    id: `deepstate-fb-${i}`,
    source: 'deepstate',
    title: `🔴 ${p.name}`,
    severity: 'critical' as const,
    eventType: 'conflict' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: p.lon, latitude: p.lat },
    metadata: { type: 'frontline', status: 'active combat zone' }
  }));
}
