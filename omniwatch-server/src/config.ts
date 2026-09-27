import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
  path: [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env'),
  ],
  quiet: true,
});

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  refreshIntervalMs: number;
  corsOrigin: string | null;
  trustProxy: boolean;
  adminApiKey: string;
  requireApiKey: boolean;
  rateLimitPerMin: number;
  chatRateLimitPerMin: number;
  maxSseClients: number;
  historyDbPath: string;
  historyRetentionDays: number;
  ollamaHost: string;
  ollamaModel: string;
  ollamaApiKey: string;
  discordWebhookUrl: string;
  telegramBotToken: string;
  telegramChatId: string;
  smtp: { host: string; port: number; user: string; pass: string; from: string; to: string };
  opensky: { clientId: string; clientSecret: string; bbox: string; allowAnonymous: boolean };
  aisstream: { apiKey: string; bboxJson: string; snapshotTtlMs: number };
  keys: {
    firms: string;
    fred: string;
    finnhub: string;
    eia: string;
    acled: string;
    acledEmail: string;
    cloudflare: string;
    gfw: string;
    openaq: string;
    patentsview: string;
    redditClientId: string;
    redditClientSecret: string;
  };
  features: {
    overpassPowerPlants: boolean;
    carrierMmsis: string[];
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV || 'development';
  const corsDefault = nodeEnv === 'production' ? null : '*';
  return {
    nodeEnv,
    port: num(env.PORT, 4100),
    refreshIntervalMs: num(env.REFRESH_INTERVAL_MINUTES, 15) * 60 * 1000,
    corsOrigin: env.CORS_ORIGIN === undefined ? corsDefault : (env.CORS_ORIGIN || null),
    trustProxy: bool(env.TRUST_PROXY, false),
    adminApiKey: env.ADMIN_API_KEY || '',
    requireApiKey: bool(env.REQUIRE_API_KEY, false),
    rateLimitPerMin: num(env.RATE_LIMIT_PER_MIN, 120),
    chatRateLimitPerMin: num(env.CHAT_RATE_LIMIT_PER_MIN, 10),
    maxSseClients: num(env.MAX_SSE_CLIENTS, 50),
    historyDbPath: env.HISTORY_DB_PATH || path.join(__dirname, '..', 'data', 'omniwatch.db'),
    historyRetentionDays: num(env.HISTORY_RETENTION_DAYS, 30),
    ollamaHost: env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    ollamaModel: env.OLLAMA_MODEL || 'gemma3:27b',
    ollamaApiKey: env.OLLAMA_API_KEY || '',
    discordWebhookUrl: env.DISCORD_WEBHOOK_URL || '',
    telegramBotToken: env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: env.TELEGRAM_CHAT_ID || '',
    smtp: {
      host: env.SMTP_HOST || '',
      port: num(env.SMTP_PORT, 587),
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || '',
      from: env.SMTP_FROM || '',
      to: env.ALERT_EMAIL_TO || '',
    },
    opensky: {
      clientId: env.OPENSKY_CLIENT_ID || '',
      clientSecret: env.OPENSKY_CLIENT_SECRET || '',
      bbox: env.OPENSKY_BBOX || '',
      allowAnonymous: bool(env.OPENSKY_ALLOW_ANONYMOUS, false),
    },
    aisstream: {
      apiKey: env.AISSTREAM_API_KEY || '',
      bboxJson: env.AISSTREAM_BBOXES || '',
      snapshotTtlMs: num(env.AIS_SNAPSHOT_TTL_MS, 10 * 60 * 1000),
    },
    keys: {
      firms: env.FIRMS_MAP_KEY || '',
      fred: env.FRED_API_KEY || '',
      finnhub: env.FINNHUB_API_KEY || '',
      eia: env.EIA_API_KEY || '',
      acled: env.ACLED_API_KEY || '',
      acledEmail: env.ACLED_EMAIL || '',
      cloudflare: env.CLOUDFLARE_API_TOKEN || '',
      gfw: env.GFW_API_KEY || '',
      openaq: env.OPENAQ_API_KEY || '',
      patentsview: env.PATENTSVIEW_API_KEY || '',
      redditClientId: env.REDDIT_CLIENT_ID || '',
      redditClientSecret: env.REDDIT_CLIENT_SECRET || '',
    },
    features: {
      overpassPowerPlants: bool(env.ENABLE_OVERPASS_POWERPLANTS, false),
      carrierMmsis: (env.CARRIER_MMSIS || '').split(',').map(s => s.trim()).filter(Boolean),
    },
  };
}

export const config = loadConfig();
