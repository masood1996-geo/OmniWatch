import { config } from '../config';
import { AisClient } from './ais-client';
import type { OmniEvent } from '../types';

let carrierClient: AisClient | null = null;

function ensureCarrierClient(): AisClient | null {
  const mmsis = config.features.carrierMmsis;
  if (!config.aisstream.apiKey || mmsis.length === 0) return null;
  if (!carrierClient) {
    carrierClient = new AisClient({
      apiKey: config.aisstream.apiKey,
      bboxes: [[[-90, -180], [90, 180]]],
      shipMMSIs: mmsis,
    });
    carrierClient.start();
    console.log(`[Carriers] AIS MMSI filter active for ${mmsis.length} MMSIs`);
  }
  return carrierClient;
}

export async function fetchCarrierGroups(): Promise<OmniEvent[]> {
  const mmsis = config.features.carrierMmsis;
  if (!config.aisstream.apiKey) {
    throw new Error('Disabled: requires AISSTREAM_API_KEY and CARRIER_MMSIS (verified MMSI list)');
  }
  if (mmsis.length === 0) {
    throw new Error('Disabled: no verified MMSI list configured. Set CARRIER_MMSIS to track specific hulls via AIS; positions are shown only when a vessel is broadcasting.');
  }
  const client = ensureCarrierClient();
  if (!client) throw new Error('Disabled: AIS client unavailable');
  const now = Date.now();
  let positions = client.snapshot(now, config.aisstream.snapshotTtlMs, 50);
  if (positions.length === 0) {
    await new Promise(r => setTimeout(r, 4000));
    positions = client.snapshot(Date.now(), config.aisstream.snapshotTtlMs, 50);
  }
  return positions.map((p): OmniEvent => ({
    id: `carrier-${p.mmsi}`,
    source: 'carrier-ais',
    title: `⚓ ${p.name || `Vessel MMSI ${p.mmsi}`}`,
    severity: 'major',
    eventType: 'maritime',
    coordinates: { longitude: p.lon, latitude: p.lat },
    timestamp: p.timeUtc || new Date(p.receivedAt).toISOString(),
    sourceTimestamp: p.timeUtc,
    metadata: {
      mmsi: p.mmsi,
      sog: p.sog,
      cog: p.cog,
      navStatus: p.navStatus,
      note: 'AIS position; reported only when the vessel is transmitting',
    },
  }));
}
