import { OmniEvent } from './usgs';

export async function fetchInfrastructure(): Promise<OmniEvent[]> {
  try {
    // Implementing Overpass API query to fetch critical power/military infrastructure in hotspot zones.
    // Equivalent of TerraMind's Global Building Atlas WFS fallback logic.
    // Querying over Taiwan region as an example hotspot for OSINT platforms.
    
    const overpassQuery = `
      [out:json][timeout:5];
      (
        node["power"="plant"](22.0, 119.0, 25.0, 122.0);
        node["military"="base"](22.0, 119.0, 25.0, 122.0);
      );
      out body 10;
    `;
    
    // Using a known reliable overpass endpoint
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    const events: OmniEvent[] = [];
    
    for (const element of data.elements || []) {
       if (element.type !== 'node') continue;
       
       let name = element.tags?.name || 'Unnamed Infrastructure';
       let type = element.tags?.power ? 'Power Plant' : 'Military Installation';
       
       events.push({
           id: `infra-${element.id}`,
           source: 'overpass(terramind)',
           title: `[GBA EXPOSURE] ${name}`,
           severity: 'moderate',
           eventType: 'infrastructure' as any,
           timestamp: new Date().toISOString(),
           coordinates: { longitude: element.lon, latitude: element.lat },
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
