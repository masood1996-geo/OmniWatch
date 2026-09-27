import { config } from '../config';
import { AisClient, defaultAisBboxes, parseBboxes } from './ais-client';

let client: AisClient | null = null;

export function getAisClient(): AisClient | null {
  return client;
}

export function ensureAisStarted(): AisClient | null {
  if (!config.aisstream.apiKey) return null;
  if (!client) {
    const bboxes = parseBboxes(config.aisstream.bboxJson) || defaultAisBboxes();
    client = new AisClient({ apiKey: config.aisstream.apiKey, bboxes });
    client.start();
  }
  return client;
}

export function stopAis(): void {
  client?.stop();
  client = null;
}

export function createAisClient(apiKey: string, bboxJson: string, shipMMSIs?: string[]): AisClient {
  const bboxes = parseBboxes(bboxJson) || defaultAisBboxes();
  const c = new AisClient({ apiKey, bboxes, shipMMSIs, log: (m: string) => console.log(m) });
  c.start();
  return c;
}
