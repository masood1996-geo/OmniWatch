import { fetchJson, fetchWithTimeout, hashId, toIso } from '../sources/helpers';
import type { OmniEvent } from '../types';

export async function fetchSatNOGS(): Promise<OmniEvent[]> {
  const data = await fetchJson<any[]>(
    'https://network.satnogs.org/api/stations/?format=json',
    {},
    12000,
  );
  if (!Array.isArray(data)) throw new Error('SatNOGS returned unexpected payload');
  const events: OmniEvent[] = [];
  const online = data.filter((station: any) => String(station?.status || '').toLowerCase() === 'online');
  for (const station of online.slice(0, 50)) {
    const lat = Number(station?.lat);
    const lng = Number(station?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const lastSeen = toIso(station.last_seen);
    events.push({
      id: `satnogs-${station.id}`,
      source: 'satnogs',
      title: `📡 ${station.name} (SatNOGS #${station.id})`,
      severity: 'minor',
      eventType: 'infrastructure',
      coordinates: { longitude: lng, latitude: lat },
      timestamp: lastSeen || new Date().toISOString(),
      sourceTimestamp: lastSeen,
      metadata: {
        stationId: station.id,
        altitude: station.altitude,
        observations: station.observations,
        antennas: station.antenna?.map((a: any) => a.antenna_type).join(', ') || 'Unknown',
      },
    });
  }
  return events;
}

export function parseKiwiSdrPayload(text: string): any[] {
  let stripped = text.trim();
  const assignment = stripped.match(/^(?:var|let|const|window\.[\w.$]+)\s+[\w.$]+\s*=\s*/);
  if (assignment) stripped = stripped.slice(assignment[0].length);
  stripped = stripped.replace(/;\s*$/, '').trim();
  const jsonStart = stripped.indexOf('[');
  const jsonEnd = stripped.lastIndexOf(']');
  if (jsonStart < 0 || jsonEnd <= jsonStart) throw new Error('KiwiSDR list payload did not contain a JSON array');
  const tolerant = stripped.slice(jsonStart, jsonEnd + 1).replace(/,\s*([\]}])/g, '$1');
  const parsed = JSON.parse(tolerant);
  if (!Array.isArray(parsed)) throw new Error('KiwiSDR list payload was not an array');
  return parsed;
}

export function parseGpsField(gps: unknown): { latitude: number; longitude: number } | null {
  if (!gps || typeof gps !== 'string') return null;
  const match = gps.match(/\(?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)?/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export async function fetchKiwiSDR(): Promise<OmniEvent[]> {
  const res = await fetchWithTimeout('http://rx.linkfanel.net/kiwisdr_com.js', {}, 12000);
  if (!res.ok) throw new Error(`KiwiSDR list request failed: HTTP ${res.status}`);
  const receivers = parseKiwiSdrPayload(await res.text());
  const events: OmniEvent[] = [];
  for (const rx of receivers.slice(0, 60)) {
    const coordinates = parseGpsField(rx.gps);
    if (!coordinates) continue;
    events.push({
      id: `kiwisdr-${hashId(rx.url, rx.name, rx.gps)}`,
      source: 'kiwisdr',
      title: `🔊 KiwiSDR: ${rx.name || 'Receiver'}`,
      severity: 'minor',
      eventType: 'infrastructure',
      coordinates,
      timestamp: toIso(rx.updated) || new Date().toISOString(),
      sourceTimestamp: toIso(rx.updated),
      metadata: {
        bands: rx.bands,
        antenna: rx.antenna,
        location: rx.loc,
        users: rx.users,
        url: rx.url,
      },
    });
  }
  return events;
}
