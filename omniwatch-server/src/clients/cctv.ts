import { fetchJson } from '../sources/helpers';
import type { OmniEvent } from '../types';

async function fetchTfLJamCams(): Promise<OmniEvent[]> {
  const data = await fetchJson<any[]>('https://api.tfl.gov.uk/Place/Type/JamCam', {}, 10000);
  const events: OmniEvent[] = [];
  for (const cam of data.slice(0, 30)) {
    const lon = Number(cam?.lon);
    const lat = Number(cam?.lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    events.push({
      id: `cctv-tfl-${cam.id}`,
      source: 'tfl-jamcam',
      title: `📷 TfL: ${cam.commonName || 'Camera'}`,
      severity: 'minor',
      eventType: 'infrastructure',
      coordinates: { longitude: lon, latitude: lat },
      timestamp: new Date().toISOString(),
      sourceTimestamp: null,
      metadata: {
        provider: 'Transport for London',
        type: 'Traffic Camera',
        url: cam.additionalProperties?.find((p: any) => p.key === 'imageUrl')?.value,
      },
    });
  }
  return events;
}

async function fetchNYCDOTCameras(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>('https://webcams.nyctmc.org/api/cameras/', {}, 10000);
  const cameras = Array.isArray(data) ? data : data.cameras || [];
  const events: OmniEvent[] = [];
  for (const cam of cameras.slice(0, 25)) {
    const lon = Number(cam?.longitude);
    const lat = Number(cam?.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    events.push({
      id: `cctv-nyc-${cam.id || cam.cameraID}`,
      source: 'nyc-dot',
      title: `📷 NYC: ${cam.name || cam.cameraName || 'Camera'}`,
      severity: 'minor',
      eventType: 'infrastructure',
      coordinates: { longitude: lon, latitude: lat },
      timestamp: new Date().toISOString(),
      sourceTimestamp: null,
      metadata: {
        provider: 'NYC DOT',
        type: 'Traffic Camera',
        url: cam.videoUrl || cam.imageUrl,
      },
    });
  }
  return events;
}

async function fetchSingaporeLTACameras(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>('https://api.data.gov.sg/v1/transport/traffic-images', {}, 10000);
  const items = data?.items?.[0]?.cameras || [];
  const events: OmniEvent[] = [];
  for (const cam of items.slice(0, 20)) {
    const lon = Number(cam?.location?.longitude);
    const lat = Number(cam?.location?.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    events.push({
      id: `cctv-sg-${cam.camera_id}`,
      source: 'sg-lta',
      title: `📷 Singapore: Camera ${cam.camera_id}`,
      severity: 'minor',
      eventType: 'infrastructure',
      coordinates: { longitude: lon, latitude: lat },
      timestamp: cam.timestamp || new Date().toISOString(),
      sourceTimestamp: cam.timestamp || null,
      metadata: {
        provider: 'Singapore LTA',
        type: 'Traffic Camera',
        imageUrl: cam.image,
      },
    });
  }
  return events;
}

export async function fetchCCTVCameras(): Promise<OmniEvent[]> {
  const results = await Promise.allSettled([
    fetchTfLJamCams(),
    fetchNYCDOTCameras(),
    fetchSingaporeLTACameras(),
  ]);
  const events: OmniEvent[] = [];
  const failures: string[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') events.push(...result.value);
    else failures.push(result.reason?.message || 'unknown error');
  }
  if (events.length === 0 && failures.length > 0) {
    throw new Error(`All camera providers failed: ${failures.join('; ')}`);
  }
  return events;
}
