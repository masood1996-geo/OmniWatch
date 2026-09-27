import { config } from '../config';
import { ensureAisStarted, getAisClient } from './ais-manager';
import type { AisPosition } from './ais-client';
import type { OmniEvent } from '../types';

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function fetchMaritime(): Promise<OmniEvent[]> {
  if (!config.aisstream.apiKey) return [];
  const client = getAisClient() || ensureAisStarted();
  if (!client) return [];

  let positions = client.snapshot(Date.now(), config.aisstream.snapshotTtlMs, 200);
  if (positions.length === 0) {
    await sleep(4000);
    positions = client.snapshot(Date.now(), config.aisstream.snapshotTtlMs, 200);
  }

  return positions.slice(0, 50).map((p: AisPosition): OmniEvent => ({
    id: `maritime-${p.mmsi}`,
    source: 'aisstream',
    title: `Vessel ${p.name || p.mmsi} (MMSI ${p.mmsi})`,
    severity: 'minor',
    eventType: 'maritime',
    timestamp: p.timeUtc || new Date(p.receivedAt).toISOString(),
    sourceTimestamp: p.timeUtc || null,
    coordinates: { longitude: p.lon, latitude: p.lat },
    metadata: {
      sog: p.sog,
      cog: p.cog,
      trueHeading: p.heading,
      navStatus: p.navStatus,
      snapshotAgeSeconds: Math.round((Date.now() - p.receivedAt) / 1000),
    },
  }));
}
