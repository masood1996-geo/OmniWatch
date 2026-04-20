import { OmniEvent } from './usgs';

// SatNOGS Ground Stations — Amateur satellite ground station network (from Shadowbroker)
// Public API, no key needed
export async function fetchSatNOGS(): Promise<OmniEvent[]> {
  try {
    const url = 'https://network.satnogs.org/api/stations/?format=json&status=2'; // status=2 = online
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];

    const data = await response.json() as any;
    const events: OmniEvent[] = [];

    for (const station of data.slice(0, 50)) {
      if (!station.lat || !station.lng) continue;

      events.push({
        id: `satnogs-${station.id}`,
        source: 'satnogs',
        title: `📡 ${station.name} (SatNOGS #${station.id})`,
        severity: 'minor',
        eventType: 'infrastructure' as const,
        timestamp: station.last_seen || new Date().toISOString(),
        coordinates: { longitude: station.lng, latitude: station.lat },
        metadata: {
          stationId: station.id,
          altitude: station.altitude,
          observations: station.observations,
          antennas: station.antenna?.map((a: any) => a.antenna_type).join(', ') || 'Unknown',
          status: 'Online'
        }
      });
    }
    console.log(`[SatNOGS] Fetched ${events.length} ground stations.`);
    return events;
  } catch (err) {
    console.warn('[SatNOGS] Error:', err);
    return [];
  }
}

// TinyGS LoRa Satellite Ground Stations (from Shadowbroker)
// Public API
export async function fetchTinyGS(): Promise<OmniEvent[]> {
  try {
    const url = 'https://api.tinygs.com/v1/stations?status=1';
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];

    const data = await response.json() as any;
    const events: OmniEvent[] = [];

    const stations = Array.isArray(data) ? data : data.stations || [];
    for (const station of stations.slice(0, 40)) {
      if (!station.location?.[0] && !station.lat) continue;
      const lat = station.lat || station.location?.[0];
      const lon = station.lng || station.location?.[1];
      if (!lat || !lon) continue;

      events.push({
        id: `tinygs-${station.name || station._id}`,
        source: 'tinygs',
        title: `📻 TinyGS: ${station.name || 'Station'}`,
        severity: 'minor',
        eventType: 'infrastructure' as const,
        timestamp: new Date().toISOString(),
        coordinates: { longitude: lon, latitude: lat },
        metadata: {
          packets: station.confirmedPackets || station.packets,
          lastPacket: station.lastPacket,
          modem: station.modem
        }
      });
    }
    console.log(`[TinyGS] Fetched ${events.length} LoRa stations.`);
    return events;
  } catch (err) {
    console.warn('[TinyGS] Error:', err);
    return [];
  }
}

// KiwiSDR — Software Defined Radio receivers worldwide (from Shadowbroker)
export async function fetchKiwiSDR(): Promise<OmniEvent[]> {
  try {
    const url = 'http://rx.linkfanel.net/kiwisdr_com.js';
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return getStaticKiwiSDR();

    const text = await response.text();
    // Parse the JS variable assignment
    const match = text.match(/var\s+kiwisdr_com\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) return getStaticKiwiSDR();

    const receivers = JSON.parse(match[1]) as any[];
    const events: OmniEvent[] = [];

    for (const rx of receivers.slice(0, 60)) {
      if (!rx.gps) continue;
      const [lat, lon] = rx.gps.split(',').map(Number);
      if (isNaN(lat) || isNaN(lon)) continue;

      events.push({
        id: `kiwisdr-${rx.url || Math.random().toString(36).slice(2)}`,
        source: 'kiwisdr',
        title: `🔊 KiwiSDR: ${rx.name || 'Receiver'}`,
        severity: 'minor',
        eventType: 'infrastructure' as const,
        timestamp: new Date().toISOString(),
        coordinates: { longitude: lon, latitude: lat },
        metadata: {
          bands: rx.bands,
          antenna: rx.antenna,
          location: rx.location,
          users: rx.users,
          url: rx.url
        }
      });
    }
    console.log(`[KiwiSDR] Fetched ${events.length} SDR receivers.`);
    return events.length > 0 ? events : getStaticKiwiSDR();
  } catch (err) {
    console.warn('[KiwiSDR] Error, using static positions:', err);
    return getStaticKiwiSDR();
  }
}

function getStaticKiwiSDR(): OmniEvent[] {
  const receivers = [
    { name: 'Twente WebSDR', lon: 6.85, lat: 52.24, loc: 'Netherlands' },
    { name: 'Shiokaze SDR', lon: 135.50, lat: 34.69, loc: 'Japan' },
    { name: 'Wide-band WebSDR', lon: -73.95, lat: 40.81, loc: 'New York' },
    { name: 'KiwiSDR Iceland', lon: -21.90, lat: 64.13, loc: 'Iceland' },
    { name: 'KiwiSDR Tasmania', lon: 147.33, lat: -42.88, loc: 'Australia' },
    { name: 'KiwiSDR Brazil', lon: -43.17, lat: -22.91, loc: 'Brazil' },
  ];
  return receivers.map((r, i) => ({
    id: `kiwisdr-static-${i}`,
    source: 'kiwisdr',
    title: `🔊 ${r.name}`,
    severity: 'minor' as OmniEvent['severity'],
    eventType: 'infrastructure' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: r.lon, latitude: r.lat },
    metadata: { location: r.loc }
  }));
}
