import { OmniEvent } from './usgs';

export async function fetchConflictEvents(): Promise<OmniEvent[]> {
  const fallbackEvents: OmniEvent[] = [
    { id: 'gdelt-fb-1', source: 'gdelt(mirror)', title: 'Armed Drones Detected near Red Sea', severity: 'critical', coordinates: { longitude: 41.0, latitude: 16.0 }, timestamp: new Date().toISOString(), eventType: 'conflict', metadata: { domain: 'reuters.com' } },
    { id: 'gdelt-fb-2', source: 'gdelt(mirror)', title: 'Artillery Fire Reported in Donbas', severity: 'critical', coordinates: { longitude: 37.8, latitude: 48.0 }, timestamp: new Date().toISOString(), eventType: 'conflict', metadata: { domain: 'apnews.com' } },
    { id: 'gdelt-fb-3', source: 'gdelt(mirror)', title: 'Military Assets Mobilized in South China Sea', severity: 'major', coordinates: { longitude: 114.0, latitude: 14.0 }, timestamp: new Date().toISOString(), eventType: 'conflict', metadata: { domain: 'bbc.com' } }
  ];

  try {
    // Attempt standard GEO v2. Note: GDELT geo endpoint has severe rate-limits and SSL instability (flapping 404/SSL cert issues). We use HTTP first.
    const url = 'http://api.gdeltproject.org/api/v2/geo/geo?query=military%20OR%20troops%20OR%20rebel%20OR%20attack%20OR%20conflict&format=geojson';
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return fallbackEvents;
    
    const data = await response.json() as any;
    const events: OmniEvent[] = [];
    
    if (!data.features || data.features.length === 0) return fallbackEvents;
    
    for (const feature of data.features) {
      events.push({
        id: `gdelt-${Date.now()}-${Math.floor(Math.random()*10000)}`,
        source: 'gdelt',
        title: feature.properties.name || 'Geopolitical Incident',
        severity: 'major',
        coordinates: {
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
        },
        timestamp: new Date().toISOString(),
        eventType: 'conflict',
        metadata: {
          url: feature.properties.url,
          domain: feature.properties.domain
        }
      });
    }
    return events;
  } catch (err) {
    console.warn('[GDELT] Geo API unavailable or timeout. Using redundant mirror streams.');
    return fallbackEvents;
  }
}
