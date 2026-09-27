import { Ollama } from 'ollama';
import { config } from '../config';
import type { OmniEvent } from '../types';

export interface CorrelationFlag {
  id: string;
  reason: string;
}

export function parseCorrelationResponse(content: string): CorrelationFlag[] {
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const raw = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.flags) ? parsed.flags : [];
  const flags: CorrelationFlag[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      flags.push({ id: item, reason: 'Flagged by correlation model' });
    } else if (item && typeof item.id === 'string') {
      flags.push({ id: item.id, reason: String(item.reason || 'Flagged by correlation model') });
    }
  }
  return flags;
}

export function applyCorrelation(events: OmniEvent[], flags: CorrelationFlag[]): OmniEvent[] {
  for (const flag of flags) {
    const event = events.find(e => e.id === flag.id);
    if (!event) continue;
    event.severity = 'critical';
    event.metadata.correlation = flag.reason;
  }
  return events;
}

const SYSTEM_PROMPT = 'You are OmniWatch AI. You detect tactical anomalies by observing geographical JSON data. If a fire overlaps with a conflict zone, or a shallow earthquake happens near a military event, flag it. Respond ONLY with a JSON array of objects of the form {"id": "<event id>", "reason": "<short reason>"} for events that are critical anomalies. If nothing is anomalous, respond with [].';

export async function evaluateIntelligence(events: OmniEvent[]): Promise<OmniEvent[]> {
  const candidates = events.filter(e =>
    e.eventType === 'fire' || e.eventType === 'firmsfire' || e.eventType === 'conflict' || e.eventType === 'earthquake',
  );
  if (candidates.length < 5) return events;

  try {
    const ollama = new Ollama({
      host: config.ollamaHost,
      headers: config.ollamaApiKey ? { Authorization: `Bearer ${config.ollamaApiKey}` } : {},
    });
    const response = await ollama.chat({
      model: config.ollamaModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(candidates.slice(0, 25)) },
      ],
      format: 'json',
    });
    const flags = parseCorrelationResponse(response.message?.content || '[]');
    if (flags.length > 0) {
      console.log(`[LLM] Correlation flags applied: ${flags.length}`);
      return applyCorrelation(events, flags);
    }
  } catch (err) {
    console.warn(`[LLM] Correlation skipped (${(err as Error).message}); continuing without AI flags`);
  }
  return events;
}
