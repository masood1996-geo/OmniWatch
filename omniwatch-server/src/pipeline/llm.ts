import { OmniEvent } from '../clients/usgs';
import { Ollama } from 'ollama';

// Phase 3 Webhook Discord System
async function pushDiscordAlert(event: OmniEvent, reason: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         content: "<@&CRITICAL_ROLE_ID> **OMNIWATCH AI SIGNAL DETECTED**",
         embeds: [{
           title: `[AI CONFLICT THREAT] ${event.title}`,
           color: 0xff0000,
           description: reason,
           fields: [
             { name: "Source", value: event.source, inline: true },
             { name: "Type", value: event.eventType, inline: true },
           ],
           timestamp: new Date().toISOString()
         }]
      })
    });
  } catch (error) {}
}

export async function evaluateIntelligence(events: OmniEvent[]): Promise<OmniEvent[]> {
  const key = process.env.OLLAMA_API_KEY || '';
  const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

  console.log('[LLM Engine] Contacting Ollama for global intelligence assessment...');

  const fires = events.filter(e => e.eventType === 'fire');
  const conflicts = events.filter(e => e.eventType === 'conflict');
  const quakes = events.filter(e => e.eventType === 'earthquake');

  // We only run deep correlation if we have a critical mass of overlapping incidents
  if (fires.length === 0 || conflicts.length === 0) return events;

  try {
     const payloadStr = JSON.stringify([...fires, ...conflicts, ...quakes].slice(0, 20));

     const ollama = new Ollama({
        host: host,
        headers: { 'Authorization': `Bearer ${key}` }
     });

     const response = await ollama.chat({
         model: process.env.OLLAMA_MODEL || 'gpt-oss:120b',
         messages: [
             { role: 'system', content: 'You are OmniWatch AI. You detect tactical anomalies by observing geographical JSON data. If a fire overlaps with a conflict zone, or a shallow earthquake happens near a military event, flag it. Respond ONLY with a JSON array of event IDs that are critical anomalies, with a "reason" string attached.' },
             { role: 'user', content: payloadStr }
         ],
         format: 'json'
     });

     const output = JSON.parse(response.message.content || '{"flags": []}');
     if (output && output.flags) {
        for (const flag of output.flags) {
            const ev = events.find(e => e.id === flag.id);
            if (ev) {
                ev.severity = 'critical';
                ev.metadata.correlation = flag.reason;
                if (!ev.metadata.alertDispatched) {
                   pushDiscordAlert(ev, flag.reason);
                   ev.metadata.alertDispatched = true;
                }
            }
        }
     }
  } catch (err) {
      console.error('[LLM Engine] OpenAI request failed:', err);
  }

  return events;
}
