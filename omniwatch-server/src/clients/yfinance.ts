import { fetchJson, toIso } from '../sources/helpers';
import type { OmniEvent } from '../types';

const SYMBOLS = [
  { sym: '^GSPC', name: 'S&P 500', lon: -74.0, lat: 40.7 },
  { sym: '^DJI', name: 'Dow Jones', lon: -74.0, lat: 40.7 },
  { sym: '^IXIC', name: 'NASDAQ', lon: -74.0, lat: 40.7 },
  { sym: '^FTSE', name: 'FTSE 100', lon: -0.08, lat: 51.51 },
  { sym: '^N225', name: 'Nikkei 225', lon: 139.76, lat: 35.68 },
  { sym: 'CL=F', name: 'Crude Oil WTI', lon: -95.36, lat: 29.76 },
  { sym: 'GC=F', name: 'Gold Futures', lon: -74.0, lat: 40.7 },
  { sym: 'BTC-USD', name: 'Bitcoin', lon: null, lat: null },
];

export async function fetchYahooFinanceMarkets(): Promise<OmniEvent[]> {
  const events: OmniEvent[] = [];
  for (const { sym, name, lon, lat } of SYMBOLS) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`;
      const data = await fetchJson<any>(url, {
        headers: { Accept: 'application/json' },
      }, 8000);
      const result = data.chart?.result?.[0];
      if (!result) continue;
      const meta = result.meta;
      const price = Number(meta.regularMarketPrice);
      const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose);
      if (!Number.isFinite(price)) continue;
      const change = Number.isFinite(prevClose) && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : 0;
      let severity: OmniEvent['severity'] = 'minor';
      if (Math.abs(change) > 1) severity = 'moderate';
      if (Math.abs(change) > 3) severity = 'major';
      if (Math.abs(change) > 5) severity = 'critical';
      const marketTime = toIso(meta.regularMarketTime);
      events.push({
        id: `yf-${sym}`,
        source: 'yahoo-finance',
        title: `${name}: ${price.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)`,
        severity,
        eventType: 'economics',
        coordinates: lon !== null && lat !== null ? { longitude: lon, latitude: lat } : null,
        timestamp: marketTime || new Date().toISOString(),
        sourceTimestamp: marketTime,
        metadata: {
          symbol: sym,
          price: price.toFixed(2),
          change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
          currency: meta.currency || 'USD',
          venueNote: lon !== null ? 'Marker at exchange city (reference location)' : 'No geographic location',
        },
      });
    } catch { /* per-symbol failure tolerated; health tracks source-level success */ }
  }
  return events;
}
