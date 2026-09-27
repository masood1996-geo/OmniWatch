import WebSocket from 'ws';

export interface AisPosition {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
  heading: number;
  navStatus: number | null;
  receivedAt: number;
  timeUtc: string | null;
}

export interface AisClientOptions {
  apiKey: string;
  bboxes: number[][][];
  shipMMSIs?: string[];
  log?: (msg: string) => void;
  WebSocketImpl?: typeof WebSocket;
}

export class AisClient {
  private socket: WebSocket | null = null;
  private positions = new Map<string, AisPosition>();
  private reconnectDelay = 5000;
  private closedByUser = false;
  private connectTimer: NodeJS.Timeout | null = null;
  private subscribedAt = 0;

  constructor(private options: AisClientOptions) {}

  start(): void {
    if (!this.options.apiKey || this.socket) return;
    this.closedByUser = false;
    this.connect();
  }

  stop(): void {
    this.closedByUser = true;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
    try { this.socket?.close(); } catch { /* ignore */ }
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  lastSubscribedAt(): number {
    return this.subscribedAt;
  }

  snapshot(now: number, maxAgeMs: number, limit = 500): AisPosition[] {
    const minTime = now - maxAgeMs;
    const out: AisPosition[] = [];
    for (const p of this.positions.values()) {
      if (p.receivedAt >= minTime) out.push(p);
      if (out.length >= limit) break;
    }
    return out;
  }

  private connect(): void {
    const Impl = this.options.WebSocketImpl || WebSocket;
    const log = this.options.log || (() => {});
    const socket = new Impl('wss://stream.aisstream.io/v0/stream');
    this.socket = socket;
    const subscribeTimer = setTimeout(() => {
      if (this.socket === socket && socket.readyState === Impl.OPEN) {
        try {
          socket.send(JSON.stringify({
            APIKey: this.options.apiKey,
            BoundingBoxes: this.options.bboxes,
            FiltersShipMMSI: this.options.shipMMSIs && this.options.shipMMSIs.length > 0
              ? this.options.shipMMSIs
              : undefined,
          }));
          this.subscribedAt = Date.now();
          log('[AIS] Subscribed to stream');
        } catch (err) {
          log(`[AIS] Subscribe failed: ${(err as Error).message}`);
        }
      }
    }, 500);

    socket.on('message', (raw: WebSocket.RawData) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.MessageType !== 'PositionReport') return;
        const meta = data.MetaData || {};
        const report = data.Message?.PositionReport;
        if (!report) return;
        const lat = Number(report.Latitude ?? meta.latitude);
        const lon = Number(report.Longitude ?? meta.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        const mmsi = String(meta.MMSI ?? report.UserID ?? '');
        if (!mmsi) return;
        this.positions.set(mmsi, {
          mmsi,
          name: String(meta.ShipName || '').trim(),
          lat,
          lon,
          sog: Number(report.Sog) || 0,
          cog: Number(report.Cog) || 0,
          heading: Number(report.TrueHeading) || 0,
          navStatus: Number.isFinite(Number(report.NavigationalStatus)) ? Number(report.NavigationalStatus) : null,
          receivedAt: Date.now(),
          timeUtc: meta.time_utc || null,
        });
      } catch { /* malformed frame ignored */ }
    });

    socket.on('error', (err: Error) => {
      log(`[AIS] Socket error: ${err.message}`);
    });

    socket.on('close', () => {
      clearTimeout(subscribeTimer);
      this.socket = null;
      if (this.closedByUser) return;
      log(`[AIS] Disconnected; reconnecting in ${this.reconnectDelay}ms`);
      this.connectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 120000);
    });

    socket.on('open', () => {
      this.reconnectDelay = 5000;
    });
  }
}

export function defaultAisBboxes(): number[][][] {
  return [
    [[34.0, -6.0], [46.5, 42.0]],
    [[11.0, 31.0], [31.0, 60.0]],
    [[-10.0, 105.0], [25.0, 125.0]],
    [[-60.0, -85.0], [15.0, -30.0]],
  ];
}

export function parseBboxes(json: string): number[][][] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const valid = parsed.every((box: any) =>
      Array.isArray(box) && box.length === 2 && box.every((p: any) =>
        Array.isArray(p) && p.length === 2 && p.every((v: any) => Number.isFinite(Number(v)))));
    if (!valid) return null;
    return parsed.map((box: any[]) => box.map((p: any[]) => [Number(p[0]), Number(p[1])]));
  } catch {
    return null;
  }
}
