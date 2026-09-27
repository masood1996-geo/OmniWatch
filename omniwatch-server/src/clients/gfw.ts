import { config } from '../config';
import { fetchJson, hashId, toIso } from '../sources/helpers';
import type { OmniEvent } from '../types';

export async function fetchFishingActivity(): Promise<OmniEvent[]> {
  const url = 'https://gateway.api.globalfishingwatch.org/v3/events?limit=30&datasets[0]=public-global-fishing-events:latest';
  const data = await fetchJson<any>(url, {
    headers: { Authorization: `Bearer ${config.keys.gfw}` },
  }, 20000);
  const entries = data?.entries || [];
  return entries.map((entry: any): OmniEvent => {
    const date = toIso(entry.start);
    return {
      id: `gfw-${entry.id || hashId(entry.vessel?.id, entry.start, entry.lat, entry.lon)}`,
      source: 'gfw',
      title: `🐟 Fishing event: ${entry.vessel?.name || entry.vessel?.id || 'unknown vessel'} (${entry.type || 'fishing'})`,
      severity: entry.type === 'encounters' || entry.type === 'loitering' ? 'major' : 'minor',
      eventType: 'maritime',
      coordinates: entry.position
        ? { longitude: Number(entry.position.lon), latitude: Number(entry.position.lat) }
        : entry.lon !== undefined && entry.lat !== undefined
          ? { longitude: Number(entry.lon), latitude: Number(entry.lat) }
          : null,
      timestamp: date || new Date().toISOString(),
      sourceTimestamp: date,
      metadata: {
        flag: entry.vessel?.flag,
        type: entry.type,
        durationHours: entry.durationHours,
        source: 'Global Fishing Watch v3 API',
      },
    };
  });
}
