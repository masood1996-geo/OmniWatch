import { fetchJson, toIso } from '../sources/helpers';
import type { OmniEvent, Severity } from '../types';

export function gdacsAlertToSeverity(level: string | undefined): Severity {
  const normalized = String(level || '').toLowerCase();
  if (normalized === 'red') return 'critical';
  if (normalized === 'orange') return 'major';
  if (normalized === 'green') return 'minor';
  return 'moderate';
}

export function normalizeGdacs(payload: any, eventType: OmniEvent['eventType'], source: string): OmniEvent[] {
  const features = payload?.features;
  if (!Array.isArray(features)) throw new Error('GDACS payload missing features');
  const events: OmniEvent[] = [];
  for (const feature of features) {
    const props = feature?.properties || {};
    const coordinates = feature?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) continue;
    const date = toIso(props.fromdate || props.todate) || null;
    events.push({
      id: `${source}-${props.eventtype || 'EV'}-${props.eventid || feature.id}`,
      source,
      title: `${props.htmldescription || props.description || props.eventname || 'Hazard event'}`,
      severity: gdacsAlertToSeverity(props.alertlevel),
      eventType,
      coordinates: { longitude: Number(coordinates[0]), latitude: Number(coordinates[1]) },
      timestamp: date || new Date().toISOString(),
      sourceTimestamp: date,
      metadata: {
        alertLevel: props.alertlevel,
        eventName: props.eventname,
        glide: props.glide,
        url: props.url?.report || props.url?.geometry,
        source: 'GDACS (EC JRC) aggregating Smithsonian GVP',
      },
    });
  }
  return events;
}

export async function fetchVolcanoes(): Promise<OmniEvent[]> {
  const payload = await fetchJson<any>(
    'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=VO&limit=30',
    { headers: { Accept: 'application/json' } },
    15000,
  );
  return normalizeGdacs(payload, 'volcano', 'gdacs-volcano');
}
