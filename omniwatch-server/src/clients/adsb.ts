import { OmniEvent } from './usgs';

export async function fetchMilitaryAircraft(): Promise<OmniEvent[]> {
  try {
    const response = await fetch('https://api.adsb.lol/v2/military');
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    const events: OmniEvent[] = [];
    
    if (!data.ac) return events;
    
    for (const craft of data.ac) {
      if (!craft.lat || !craft.lon) continue;
      
      events.push({
        id: `adsb-${craft.hex}`,
        source: 'adsb.lol',
        title: `Military Aircraft: ${craft.r || craft.t || 'Unknown'} (${craft.flight || 'No Callsign'})`,
        severity: 'moderate',
        coordinates: {
          longitude: craft.lon,
          latitude: craft.lat,
        },
        timestamp: new Date().toISOString(),
        eventType: 'military',
        metadata: {
          altitude: craft.alt_baro,
          speed: craft.gs,
          heading: craft.track,
          hex: craft.hex,
          type: craft.t
        }
      });
    }
    return events;
  } catch (err) {
    console.error('[ADSB] Error fetching military aircraft:', err);
    return [];
  }
}
