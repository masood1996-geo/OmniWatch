import { config } from '../config';
import { fetchWithTimeout, validCoord } from '../sources/helpers';
import type { OmniEvent } from '../types';

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const REGIONS: Array<{ name: string; bbox: string }> = [
  { name: 'europe', bbox: '35,-12,60,45' },
  { name: 'mena-africa', bbox: '-35,-18,42,65' },
  { name: 'asia-pacific', bbox: '5,60,50,180' },
  { name: 'americas', bbox: '-56,-170,72,-30' },
];

async function overpass(query: string, timeoutMs = 25000): Promise<any> {
  let lastError: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: query }).toString(),
      }, timeoutMs);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json() as any;
      if (payload?.remark && String(payload.remark).includes('timed out')) {
        throw new Error(String(payload.remark));
      }
      return payload;
    } catch (err) {
      lastError = err as Error;
    }
  }
  throw new Error(`Overpass query failed: ${lastError?.message || 'unknown error'}`);
}

async function fetchRegions(
  tag: string,
  eventType: OmniEvent['eventType'],
  titleFor: (tags: any) => string,
  metadataFor: (tags: any) => Record<string, any>,
  perRegion = 40,
  cap = 150,
): Promise<OmniEvent[]> {
  const results = await Promise.allSettled(REGIONS.map(async region => {
    const payload = await overpass(`[out:json][timeout:20];nwr[${tag}](${region.bbox});out center ${perRegion};`);
    const regionEvents: OmniEvent[] = [];
    for (const element of payload.elements || []) {
      const tags = element.tags || {};
      const lat = element.lat ?? element.center?.lat;
      const lon = element.lon ?? element.center?.lon;
      const coordinates = validCoord(lon, lat);
      if (!coordinates) continue;
      regionEvents.push({
        id: `${eventType}-osm-${element.type?.[0] || 'n'}${element.id}`,
        source: eventType === 'military' ? 'osm-military' : 'osm-power',
        title: titleFor(tags),
        severity: eventType === 'military' ? 'moderate' : 'minor',
        eventType,
        coordinates,
        timestamp: new Date().toISOString(),
        sourceTimestamp: null,
        metadata: { ...metadataFor(tags), osmRegion: region.name, osmType: element.type, osmId: element.id },
      });
    }
    return regionEvents;
  }));
  const events: OmniEvent[] = [];
  const failures: string[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') events.push(...result.value.slice(0, perRegion));
    else failures.push(`${REGIONS[i].name}: ${result.reason?.message || 'error'}`);
  });
  if (events.length === 0 && failures.length === REGIONS.length) {
    throw new Error(`Overpass unavailable for all regions: ${failures[0]}`);
  }
  return events.slice(0, cap);
}

export async function fetchMilitaryBases(): Promise<OmniEvent[]> {
  return fetchRegions(
    '"military"="base"',
    'military',
    (tags) => `🏗️ ${tags.name || 'Military installation'} (${tags.military_service || tags['military'] || 'base'})`,
    (tags) => ({ name: tags.name, type: tags.military_service, operator: tags.operator, country: tags['addr:country'] }),
  );
}

export async function fetchPowerPlants(): Promise<OmniEvent[]> {
  if (!config.features.overpassPowerPlants) {
    throw new Error('Disabled: OSM Overpass global power-plant queries time out on public instances; enable with ENABLE_OVERPASS_POWERPLANTS=true or use a specialized dataset');
  }
  return fetchRegions(
    '"power"="plant"',
    'infrastructure',
    (tags) => `⚡ ${tags.name || 'Power plant'} (${tags['plant:source'] || tags['plant:method'] || 'generation'})`,
    (tags) => ({ sourceType: tags['plant:source'], output: tags['plant:output:electricity'], operator: tags.operator }),
    25,
    100,
  );
}

export async function fetchDataCenters(): Promise<OmniEvent[]> {
  let payload: any = null;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3 && payload === null; attempt++) {
    try {
      const res = await fetchWithTimeout('https://www.peeringdb.com/api/fac?limit=250', {
        headers: { Accept: 'application/json' },
      }, 20000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      payload = await res.json();
    } catch (err) {
      lastError = err as Error;
      if (attempt < 2) await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
    }
  }
  if (payload === null) throw new Error(`PeeringDB request failed: ${lastError?.message || 'unknown error'}`);
  const events: OmniEvent[] = [];
  for (const fac of payload?.data || []) {
    const coordinates = validCoord(fac.longitude, fac.latitude);
    if (!coordinates) continue;
    events.push({
      id: `dc-peeringdb-${fac.id}`,
      source: 'peeringdb',
      title: `🖥️ ${fac.name} (${fac.org_name || 'Operator'})`,
      severity: 'minor',
      eventType: 'infrastructure',
      coordinates,
      timestamp: new Date().toISOString(),
      sourceTimestamp: null,
      metadata: {
        operator: fac.org_name,
        city: fac.city,
        country: fac.country,
        networks: fac.net_count,
        ixs: fac.ix_count,
      },
    });
    if (events.length >= 150) break;
  }
  return events;
}
