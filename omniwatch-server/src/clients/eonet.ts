import { OmniEvent } from './usgs';

export async function fetchFires(): Promise<OmniEvent[]> {
  try {
    const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&days=2');
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    
    const events: OmniEvent[] = [];
    
    for (const apiEvent of data.events) {
      if (!apiEvent.geometry || apiEvent.geometry.length === 0) continue;
      
      const lastGeom = apiEvent.geometry[apiEvent.geometry.length - 1];
      
      events.push({
        id: `nasa-eonet-${apiEvent.id}`,
        source: 'nasa-eonet',
        title: apiEvent.title,
        severity: 'major',
        coordinates: {
          longitude: lastGeom.coordinates[0],
          latitude: lastGeom.coordinates[1],
        },
        timestamp: lastGeom.date,
        eventType: 'fire',
        metadata: {
          categories: apiEvent.categories,
          sources: apiEvent.sources
        }
      });
    }
    
    return events;
  } catch (error) {
    console.error('[NASA-EONET] Error fetching fires:', error);
    return [];
  }
}
