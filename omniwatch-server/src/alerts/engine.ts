import type Database from 'better-sqlite3';
import { getHistoryStore } from '../store/history';
import { config } from '../config';
import { SEVERITY_ORDER, type OmniEvent, type Severity } from '../types';
import { buildChannels, formatAlertText, type AlertChannel } from './channels';

export interface AlertConditions {
  minSeverity?: Severity;
  keywords?: string[];
  bbox?: [number, number, number, number];
  sources?: string[];
  eventTypes?: string[];
}

export interface AlertRule {
  id: number;
  name: string;
  enabled: boolean;
  conditions: AlertConditions;
  channels: string[];
  createdAt: string;
}

export interface AlertRuleInput {
  name: string;
  enabled?: boolean;
  conditions: AlertConditions;
  channels?: string[];
}

export interface DeliveryRecord {
  ruleId: number;
  eventId: string;
  channelId: string;
  status: 'sent' | 'error';
  sentAt: string;
  error?: string;
}

export function eventMatchesConditions(event: OmniEvent, conditions: AlertConditions): boolean {
  if (conditions.minSeverity && SEVERITY_ORDER[event.severity] < SEVERITY_ORDER[conditions.minSeverity]) {
    return false;
  }
  if (conditions.sources && conditions.sources.length > 0) {
    const sourceId = event.provenance?.sourceId || event.source;
    if (!conditions.sources.includes(event.source) && !conditions.sources.includes(sourceId)) return false;
  }
  if (conditions.eventTypes && conditions.eventTypes.length > 0) {
    if (!conditions.eventTypes.includes(event.eventType)) return false;
  }
  if (conditions.keywords && conditions.keywords.length > 0) {
    const haystack = `${event.title} ${event.metadata?.description || ''}`.toLowerCase();
    if (!conditions.keywords.some(k => haystack.includes(k.toLowerCase()))) return false;
  }
  if (conditions.bbox) {
    if (!event.coordinates) return false;
    const [minLon, minLat, maxLon, maxLat] = conditions.bbox;
    const { longitude, latitude } = event.coordinates;
    if (longitude < minLon || longitude > maxLon || latitude < minLat || latitude > maxLat) return false;
  }
  return true;
}

export class AlertEngine {
  private db: Database.Database;
  private channels: AlertChannel[];

  constructor(channels?: AlertChannel[], db?: Database.Database) {
    this.db = db || getHistoryStore(config).db;
    this.channels = channels || buildChannels();
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        conditions TEXT NOT NULL,
        channels TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS alert_deliveries (
        rule_id INTEGER NOT NULL,
        event_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        status TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        error TEXT,
        PRIMARY KEY (rule_id, event_id, channel_id)
      );
    `);
  }

  listRules(): AlertRule[] {
    const rows = this.db.prepare('SELECT * FROM alert_rules ORDER BY id DESC').all() as any[];
    return rows.map(r => this.rowToRule(r));
  }

  createRule(input: AlertRuleInput): AlertRule {
    const now = new Date().toISOString();
    const info = this.db.prepare(`
      INSERT INTO alert_rules (name, enabled, conditions, channels, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      input.name,
      input.enabled === false ? 0 : 1,
      JSON.stringify(input.conditions || {}),
      JSON.stringify(input.channels || []),
      now,
    );
    const row = this.db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(info.lastInsertRowid) as any;
    return this.rowToRule(row);
  }

  updateRule(id: number, patch: Partial<AlertRuleInput>): AlertRule | null {
    const existing = this.db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(id) as any;
    if (!existing) return null;
    this.db.prepare(`
      UPDATE alert_rules SET name = ?, enabled = ?, conditions = ?, channels = ? WHERE id = ?
    `).run(
      patch.name ?? existing.name,
      patch.enabled === undefined ? existing.enabled : (patch.enabled ? 1 : 0),
      JSON.stringify(patch.conditions ?? JSON.parse(existing.conditions)),
      JSON.stringify(patch.channels ?? JSON.parse(existing.channels)),
      id,
    );
    const row = this.db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(id) as any;
    return this.rowToRule(row);
  }

  deleteRule(id: number): boolean {
    const info = this.db.prepare('DELETE FROM alert_rules WHERE id = ?').run(id);
    return info.changes > 0;
  }

  availableChannels(): Array<{ id: string; label: string }> {
    return this.channels.map(c => ({ id: c.id, label: c.label }));
  }

  wasDelivered(ruleId: number, eventId: string, channelId: string): boolean {
    const row = this.db.prepare(
      'SELECT 1 FROM alert_deliveries WHERE rule_id = ? AND event_id = ? AND channel_id = ?',
    ).get(ruleId, eventId, channelId);
    return Boolean(row);
  }

  private recordDelivery(record: DeliveryRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO alert_deliveries (rule_id, event_id, channel_id, status, sent_at, error)
      VALUES (@ruleId, @eventId, @channelId, @status, @sentAt, @error)
    `).run({ ...record, error: record.error ?? null });
  }

  async sendTest(event: OmniEvent): Promise<Array<{ channel: string; status: 'sent' | 'error'; error?: string }>> {
    return Promise.all(this.channels.map(async channel => {
      try {
        await channel.send({ rule: { id: 0, name: 'test' }, event, text: `[OmniWatch] Test alert via ${channel.label} (synthetic event, not real intelligence)` });
        return { channel: channel.id, status: 'sent' as const };
      } catch (err) {
        return { channel: channel.id, status: 'error' as const, error: (err as Error).message };
      }
    }));
  }

  async evaluate(events: OmniEvent[]): Promise<{ matched: number; sent: number; errors: number }> {
    const rules = this.listRules().filter(r => r.enabled);
    let matched = 0;
    let sent = 0;
    let errors = 0;
    for (const rule of rules) {
      const targets = this.channels.filter(c => rule.channels.length === 0 || rule.channels.includes(c.id));
      for (const event of events) {
        if (!eventMatchesConditions(event, rule.conditions)) continue;
        matched += 1;
        for (const channel of targets) {
          if (this.wasDelivered(rule.id, event.id, channel.id)) continue;
          const text = formatAlertText(rule, event);
          try {
            await channel.send({ rule: { id: rule.id, name: rule.name }, event, text });
            this.recordDelivery({ ruleId: rule.id, eventId: event.id, channelId: channel.id, status: 'sent', sentAt: new Date().toISOString() });
            sent += 1;
          } catch (err) {
            errors += 1;
            this.recordDelivery({
              ruleId: rule.id,
              eventId: event.id,
              channelId: channel.id,
              status: 'error',
              sentAt: new Date().toISOString(),
              error: (err as Error).message,
            });
          }
        }
      }
    }
    return { matched, sent, errors };
  }

  private rowToRule(row: any): AlertRule {
    return {
      id: row.id,
      name: row.name,
      enabled: Boolean(row.enabled),
      conditions: JSON.parse(row.conditions),
      channels: JSON.parse(row.channels),
      createdAt: row.created_at,
    };
  }
}
