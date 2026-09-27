import { fetchJson, toIso } from '../sources/helpers';
import type { OmniEvent, Severity } from '../types';

export function cpmToSeverity(cpm: number): Severity {
  if (cpm > 350) return 'critical';
  if (cpm > 100) return 'major';
  if (cpm > 50) return 'moderate';
  return 'minor';
}

export function normalizeSafecast(measurements: any[]): OmniEvent[] {
  const events: OmniEvent[] = [];
  const seen = new Set<string>();
  for (const m of measurements) {
    const lon = Number(m?.longitude);
    const lat = Number(m?.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    const key = `${lat.toFixed(2)}-${lon.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cpm = Number(m?.value);
    if (!Number.isFinite(cpm)) continue;
    const captured = toIso(m?.captured_at);
    events.push({
      id: `safecast-${m.id}`,
      source: 'safecast',
      title: `Radiation: ${cpm.toFixed(1)} CPM`,
      severity: cpmToSeverity(cpm),
      eventType: 'radiation',
      coordinates: { longitude: lon, latitude: lat },
      timestamp: captured || new Date().toISOString(),
      sourceTimestamp: captured,
      metadata: {
        cpm: cpm.toFixed(1),
        unit: m.unit || 'cpm',
        deviceId: m.device_id,
      },
    });
  }
  return events;
}

export async function fetchSafecastRadiation(): Promise<OmniEvent[]> {
  const data = await fetchJson<any[]>(
    'https://api.safecast.org/en-US/measurements.json?order=created_at+desc&per_page=100',
    { headers: { Accept: 'application/json' } },
    12000,
  );
  if (!Array.isArray(data)) throw new Error('Safecast returned unexpected payload');
  return normalizeSafecast(data);
}
