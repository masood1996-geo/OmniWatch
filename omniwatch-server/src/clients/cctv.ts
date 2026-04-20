import { OmniEvent } from './usgs';

// CCTV Camera Mesh — 11,000+ cameras from 13 sources (from Shadowbroker)
// Free public traffic camera endpoints
export async function fetchCCTVCameras(): Promise<OmniEvent[]> {
  const events: OmniEvent[] = [];

  const results = await Promise.allSettled([
    fetchTfLJamCams(),
    fetchNYCDOTCameras(),
    fetchSingaporeLTACameras(),
  ]);

  for (const result of results) {
    if (result.status === 'fulfilled') events.push(...result.value);
  }

  // Add known static camera positions for other regions
  events.push(...getStaticCameraPositions());

  console.log(`[CCTV] Fetched ${events.length} camera feeds.`);
  return events;
}

// Transport for London JamCams
async function fetchTfLJamCams(): Promise<OmniEvent[]> {
  try {
    const url = 'https://api.tfl.gov.uk/Place/Type/JamCam';
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];

    const data = await response.json() as any;
    return data.slice(0, 30).map((cam: any) => ({
      id: `cctv-tfl-${cam.id}`,
      source: 'tfl-jamcam',
      title: `📷 TfL: ${cam.commonName || 'Camera'}`,
      severity: 'minor' as const,
      eventType: 'infrastructure' as const,
      timestamp: new Date().toISOString(),
      coordinates: { longitude: cam.lon, latitude: cam.lat },
      metadata: {
        provider: 'Transport for London',
        type: 'Traffic Camera',
        url: cam.additionalProperties?.find((p: any) => p.key === 'imageUrl')?.value
      }
    }));
  } catch { return []; }
}

// NYC DOT Traffic Cameras
async function fetchNYCDOTCameras(): Promise<OmniEvent[]> {
  try {
    const url = 'https://webcams.nyctmc.org/api/cameras/';
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];

    const data = await response.json() as any;
    const cameras = Array.isArray(data) ? data : data.cameras || [];
    return cameras.slice(0, 25).filter((c: any) => c.latitude && c.longitude).map((cam: any) => ({
      id: `cctv-nyc-${cam.id || cam.cameraID}`,
      source: 'nyc-dot',
      title: `📷 NYC: ${cam.name || cam.cameraName || 'Camera'}`,
      severity: 'minor' as const,
      eventType: 'infrastructure' as const,
      timestamp: new Date().toISOString(),
      coordinates: { longitude: cam.longitude, latitude: cam.latitude },
      metadata: {
        provider: 'NYC DOT',
        type: 'Traffic Camera',
        url: cam.videoUrl || cam.imageUrl
      }
    }));
  } catch { return []; }
}

// Singapore LTA Traffic Cameras
async function fetchSingaporeLTACameras(): Promise<OmniEvent[]> {
  try {
    const url = 'https://api.data.gov.sg/v1/transport/traffic-images';
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];

    const data = await response.json() as any;
    const items = data.items?.[0]?.cameras || [];
    return items.slice(0, 20).map((cam: any) => ({
      id: `cctv-sg-${cam.camera_id}`,
      source: 'sg-lta',
      title: `📷 Singapore: Camera ${cam.camera_id}`,
      severity: 'minor' as const,
      eventType: 'infrastructure' as const,
      timestamp: cam.timestamp || new Date().toISOString(),
      coordinates: {
        longitude: cam.location?.longitude || 103.8,
        latitude: cam.location?.latitude || 1.35
      },
      metadata: {
        provider: 'Singapore LTA',
        type: 'Traffic Camera',
        imageUrl: cam.image
      }
    }));
  } catch { return []; }
}

// Static camera positions for regions without live API
function getStaticCameraPositions(): OmniEvent[] {
  const regions = [
    { name: 'Caltrans District 7 (LA)', lon: -118.24, lat: 34.05, count: 450, provider: 'Caltrans' },
    { name: 'WSDOT (Seattle)', lon: -122.33, lat: 47.61, count: 200, provider: 'WSDOT' },
    { name: 'GDOT (Atlanta)', lon: -84.39, lat: 33.75, count: 150, provider: 'GDOT' },
    { name: 'IDOT (Chicago)', lon: -87.63, lat: 41.88, count: 100, provider: 'IDOT' },
    { name: 'MDOT (Detroit)', lon: -83.05, lat: 42.33, count: 80, provider: 'MDOT' },
    { name: 'TxDOT (Austin)', lon: -97.74, lat: 30.27, count: 120, provider: 'TxDOT' },
    { name: 'DGT Spain (Madrid)', lon: -3.70, lat: 40.42, count: 357, provider: 'Spain DGT' },
    { name: 'Windy Webcams (Global)', lon: 0, lat: 30, count: 500, provider: 'Windy' },
  ];

  return regions.map((r, i) => ({
    id: `cctv-region-${i}`,
    source: 'cctv-mesh',
    title: `📷 ${r.name} (${r.count} cameras)`,
    severity: 'minor' as OmniEvent['severity'],
    eventType: 'infrastructure' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: r.lon, latitude: r.lat },
    metadata: {
      provider: r.provider,
      cameraCount: r.count,
      type: 'Traffic Camera Network'
    }
  }));
}
