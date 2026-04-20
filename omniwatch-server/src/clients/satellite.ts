import { OmniEvent } from './usgs';
import * as satellite from 'satellite.js';

export async function fetchSatellites(): Promise<OmniEvent[]> {
  try {
    const url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=tle';
    const response = await fetch(url, { headers: {"User-Agent": "omniwatch-client"} });
    if (!response.ok) return [];
    
    const text = await response.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const events: OmniEvent[] = [];
    
    const date = new Date();
    
    // We parse the top 15 military satellites so we don't clog the UI
    for (let i = 0; i < Math.min(lines.length, 45); i += 3) { 
       const name = lines[i];
       const tleLine1 = lines[i+1];
       const tleLine2 = lines[i+2];
       
       try {
           const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
           const positionAndVelocity = satellite.propagate(satrec, date);
           
           const positionEci = positionAndVelocity.position;
           if (typeof positionEci !== 'boolean' && positionEci) {
             const gmst = satellite.gstime(date);
             const positionGd = satellite.eciToGeodetic(positionEci as any, gmst);
             
             const longitude = satellite.degreesLong(positionGd.longitude);
             const latitude = satellite.degreesLat(positionGd.latitude);
             const height = positionGd.height;
             
             events.push({
               id: `sat-${name.replace(/\s+/g, '-')}`,
               source: 'celestrak',
               title: `MILSAT: ${name}`,
               severity: 'moderate',
               eventType: 'satellite' as any,
               timestamp: date.toISOString(),
               coordinates: { longitude, latitude },
               metadata: { altitude: `${height.toFixed(2)} km` }
             });
           }
       } catch(e) {}
    }
    
    return events;
  } catch (err) {
    console.error('[Satellite] Error fetching TLE:', err);
    return [];
  }
}
