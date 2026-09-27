import { fetchJson, polygonCentroid, toIso, validCoord } from '../sources/helpers';
import type { OmniEvent } from '../types';

export function normalizeDeepState(payload: any): OmniEvent[] {
  const features = payload?.map?.features || payload?.features;
  if (!Array.isArray(features)) throw new Error('DeepState payload missing GeoJSON features');
  const events: OmniEvent[] = [];
  for (const feature of features.slice(0, 40)) {
    const geometry = feature?.geometry;
    if (!geometry) continue;
    let coordinates = null;
    if (geometry.type === 'Point') {
      coordinates = validCoord(geometry.coordinates?.[0], geometry.coordinates?.[1]);
    } else {
      coordinates = polygonCentroid(geometry.coordinates);
    }
    if (!coordinates) continue;
    const props = feature.properties || {};
    const date = toIso(props.date || props.updated);
    events.push({
      id: `deepstate-${props.id || props.name || feature.id || events.length}`,
      source: 'deepstate',
      title: `Frontline: ${props.name || props.type || 'Zone change'}`,
      severity: 'critical',
      eventType: 'conflict',
      coordinates,
      timestamp: date || new Date().toISOString(),
      sourceTimestamp: date,
      metadata: {
        type: props.type,
        description: props.description,
        controlledBy: props.controlled_by,
      },
    });
  }
  return events;
}

export async function fetchUkraineFrontline(): Promise<OmniEvent[]> {
  const payload = await fetchJson<any>('https://deepstatemap.live/api/history/last', {}, 12000);
  return normalizeDeepState(payload);
}
