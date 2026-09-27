import { fetchWithTimeout } from '../sources/helpers';
import type { OmniEvent } from '../types';

export async function fetchInfrastructure(): Promise<OmniEvent[]> {
  try {
    // Implementing Overpass API query to fetch critical power/military infrastructure in hotspot zones.
    // Equivalent of TerraMind's Global Building Atlas WFS fallback logic.
    // Querying over Taiwan region as an example hotspot for OSINT platforms.
    
    const overpassQuery = `
      [out:json][timeout:20];
      (
        nwr["power"="plant"](22.0, 119.0, 25.0, 122.0);
        nwr["military"="base"](22.0, 119.0, 25.0, 122.0);
      );
      out center 20;
    `;
    
    // Using a known reliable overpass endpoint
    const response = await fetchWithTimeout('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: new URLSearchParams({ data: overpassQuery }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, 30000);
    
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    const events: OmniEvent[] = [];
    
    for (const element of data.elements || []) {
       const lat = element.lat ?? element.center?.lat;
       const lon = element.lon ?? element.center?.lon;
       if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
       
       const name = element.tags?.name || 'Unnamed infrastructure';
       const type = element.tags?.power ? 'Power Plant' : 'Military Installation';
       
       events.push({
           id: `infra-${element.type?.[0] || 'n'}${element.id}`,
           source: 'overpass(terramind)',
           title: `[GBA EXPOSURE] ${name}`,
           severity: 'moderate',
           eventType: 'infrastructure',
           timestamp: new Date().toISOString(),
           sourceTimestamp: null,
           coordinates: { longitude: lon, latitude: lat },
           metadata: { 
             category: type,
             source: element.tags?.source || 'OpenStreetMap',
             operator: element.tags?.operator || 'Unknown'
           }
       });
    }
    
    return events;
  } catch (err) {
    console.error('[Infrastructure] Overpass API fallback failed:', err);
    return [];
  }
}
