import { OmniEvent } from './usgs';

// OpenSky Network — global commercial + GA flight tracking (from Shadowbroker)
// No API key needed for basic access, but credentials increase rate limits
export async function fetchOpenSkyFlights(): Promise<OmniEvent[]> {
  try {
    const url = 'https://opensky-network.org/api/states/all';
    const headers: Record<string, string> = {};

    // Optional OAuth for higher rate limits
    const clientId = process.env.OPENSKY_CLIENT_ID;
    const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
    if (clientId && clientSecret) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return [];

    const data = await response.json() as any;
    const events: OmniEvent[] = [];

    if (!data.states) return [];

    // Sample top 100 aircraft to keep the map usable
    const sampled = data.states.filter((s: any) => s[5] !== null && s[6] !== null).slice(0, 100);

    for (const state of sampled) {
      const callsign = (state[1] || '').trim();
      const origin = state[2] || 'Unknown';
      const lon = state[5];
      const lat = state[6];
      const altBaro = state[7]; // meters
      const velocity = state[9]; // m/s
      const heading = state[10];
      const onGround = state[8];

      if (!lon || !lat) continue;

      events.push({
        id: `opensky-${state[0]}`,
        source: 'opensky',
        title: `Flight ${callsign || state[0]} (${origin})`,
        severity: 'minor',
        eventType: 'flight',
        timestamp: new Date().toISOString(),
        coordinates: { longitude: lon, latitude: lat },
        metadata: {
          callsign,
          origin,
          altitude: altBaro ? `${(altBaro * 3.281).toFixed(0)} ft` : 'N/A',
          speed: velocity ? `${(velocity * 1.944).toFixed(0)} kts` : 'N/A',
          heading: heading?.toFixed(0),
          onGround
        }
      });
    }

    console.log(`[OpenSky] Fetched ${events.length} aircraft.`);
    return events;
  } catch (err) {
    console.error('[OpenSky] Error fetching flights:', err);
    return [];
  }
}
