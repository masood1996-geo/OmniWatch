import { OmniEvent } from './usgs';

// NOAA SWPC Space Weather — geomagnetic storm Kp index (from Shadowbroker)
// No API key needed. Public NOAA endpoint.
export async function fetchSpaceWeather(): Promise<OmniEvent[]> {
  try {
    const url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return [];

    const data = await response.json() as any;
    if (!Array.isArray(data) || data.length < 2) return [];

    // Last entry is most recent Kp measurement
    const latest = data[data.length - 1];
    const kp = parseFloat(latest[1]);
    const timestamp = latest[0];

    if (isNaN(kp)) return [];

    let severity: OmniEvent['severity'] = 'minor';
    let stormLevel = 'Quiet';
    if (kp >= 4) { severity = 'moderate'; stormLevel = 'Active'; }
    if (kp >= 5) { severity = 'major'; stormLevel = `G1 Storm`; }
    if (kp >= 6) { severity = 'major'; stormLevel = `G2 Storm`; }
    if (kp >= 7) { severity = 'critical'; stormLevel = `G3 Strong Storm`; }
    if (kp >= 8) { severity = 'critical'; stormLevel = `G4-G5 Severe Storm`; }

    return [{
      id: 'spacewx-kp',
      source: 'noaa-swpc',
      title: `Space Weather: Kp ${kp.toFixed(1)} — ${stormLevel}`,
      severity,
      eventType: 'spaceweather',
      timestamp: timestamp || new Date().toISOString(),
      coordinates: { longitude: 0, latitude: 90 }, // North pole indicator
      metadata: {
        kpIndex: kp.toFixed(1),
        stormLevel,
        source: 'NOAA Space Weather Prediction Center'
      }
    }];
  } catch (err) {
    console.error('[SpaceWeather] Error:', err);
    return [];
  }
}
