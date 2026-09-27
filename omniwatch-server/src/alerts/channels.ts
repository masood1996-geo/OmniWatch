import nodemailer from 'nodemailer';
import { config, type AppConfig } from '../config';
import { fetchWithTimeout } from '../sources/helpers';
import type { OmniEvent } from '../types';

export interface AlertPayload {
  rule: { id: number; name: string };
  event: OmniEvent;
  text: string;
}

export interface AlertChannel {
  id: string;
  label: string;
  send: (payload: AlertPayload) => Promise<void>;
}

export function formatAlertText(rule: { name: string }, event: OmniEvent): string {
  const location = event.coordinates
    ? `${event.coordinates.latitude.toFixed(3)}, ${event.coordinates.longitude.toFixed(3)}`
    : 'no geolocation';
  const provider = event.provenance?.provider || event.source;
  return `[OmniWatch] ${rule.name}\n${event.severity.toUpperCase()} — ${event.title}\nSource: ${provider}\nLocation: ${location}\nTime: ${event.sourceTimestamp || event.timestamp}\nLicense: ${event.provenance?.license || 'n/a'}`;
}

export function buildChannels(cfg: AppConfig = config): AlertChannel[] {
  const channels: AlertChannel[] = [];
  const webhookUrl = process.env.ALERT_WEBHOOK_URL || cfg.discordWebhookUrl;
  if (webhookUrl) {
    const isDiscord = /discord(app)?\.com\/api\/webhooks/.test(webhookUrl);
    channels.push({
      id: 'webhook',
      label: isDiscord ? 'Discord webhook' : 'Generic webhook',
      send: async ({ event, text }) => {
        const body = isDiscord
          ? {
            content: text,
            embeds: [{
              title: event.title.slice(0, 250),
              description: event.metadata?.correlation || text,
              color: 0xff0000,
              fields: [
                { name: 'Severity', value: event.severity, inline: true },
                { name: 'Source', value: event.provenance?.provider || event.source, inline: true },
                { name: 'License', value: event.provenance?.license || 'n/a', inline: false },
              ],
              timestamp: new Date().toISOString(),
            }],
          }
          : { text, event, severity: event.severity, source: event.provenance?.provider || event.source };
        const res = await fetchWithTimeout(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }, 10000);
        if (!res.ok) throw new Error(`Webhook responded HTTP ${res.status}`);
      },
    });
  }
  if (cfg.telegramBotToken && cfg.telegramChatId) {
    channels.push({
      id: 'telegram',
      label: 'Telegram',
      send: async ({ text }) => {
        const res = await fetchWithTimeout(
          `https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: cfg.telegramChatId, text }),
          },
          10000,
        );
        if (!res.ok) throw new Error(`Telegram responded HTTP ${res.status}`);
      },
    });
  }
  if (cfg.smtp.host && cfg.smtp.to) {
    channels.push({
      id: 'email',
      label: 'Email (SMTP)',
      send: async ({ rule, event, text }) => {
        const transport = nodemailer.createTransport({
          host: cfg.smtp.host,
          port: cfg.smtp.port,
          secure: cfg.smtp.port === 465,
          auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined,
        });
        await transport.sendMail({
          from: cfg.smtp.from || cfg.smtp.user,
          to: cfg.smtp.to,
          subject: `[OmniWatch] ${event.severity.toUpperCase()}: ${event.title.slice(0, 120)}`,
          text: `${text}\n\nRule: ${rule.name}`,
        });
      },
    });
  }
  return channels;
}
