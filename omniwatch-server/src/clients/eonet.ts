import { fetchJson, validCoord } from '../sources/helpers';
import type { OmniEvent } from '../types';

export async function fetchFires(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>(
    'https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&days=7',
    {},
    12000,
  );
  const events: OmniEvent[] = [];
  for (const apiEvent of data.events || []) {
    if (!apiEvent.geometry || apiEvent.geometry.length === 0) continue;
    const lastGeom = apiEvent.geometry[apiEvent.geometry.length - 1];
    const coordinates = validCoord(lastGeom.coordinates?.[0], lastGeom.coordinates?.[1]);
    if (!coordinates) continue;
    events.push({
      id: `nasa-eonet-${apiEvent.id}`,
      source: 'nasa-eonet',
      title: apiEvent.title,
      severity: 'major',
      eventType: 'fire',
      coordinates,
      timestamp: lastGeom.date,
      sourceTimestamp: lastGeom.date,
      metadata: {
        categories: apiEvent.categories,
        sources: apiEvent.sources,
      },
    });
  }
  return events;
}
