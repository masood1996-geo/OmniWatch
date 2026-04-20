import { OmniEvent } from './usgs';

// Yahoo Finance — free live market data (from Crucix)
// No API key required. Fetches major indices, crypto, energy, commodities.
export async function fetchYahooFinanceMarkets(): Promise<OmniEvent[]> {
  const symbols = [
    { sym: '^GSPC', name: 'S&P 500', lon: -74.0, lat: 40.7 },
    { sym: '^DJI', name: 'Dow Jones', lon: -74.0, lat: 40.7 },
    { sym: '^IXIC', name: 'NASDAQ', lon: -74.0, lat: 40.7 },
    { sym: '^FTSE', name: 'FTSE 100', lon: -0.08, lat: 51.51 },
    { sym: '^N225', name: 'Nikkei 225', lon: 139.76, lat: 35.68 },
    { sym: 'CL=F', name: 'Crude Oil WTI', lon: -95.36, lat: 29.76 },
    { sym: 'GC=F', name: 'Gold Futures', lon: -74.0, lat: 40.7 },
    { sym: 'BTC-USD', name: 'Bitcoin', lon: 0, lat: 0 },
  ];

  const events: OmniEvent[] = [];

  try {
    // Use Yahoo Finance v8 chart API (no key needed)
    for (const { sym, name, lon, lat } of symbols) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 OmniWatch/1.0' },
          signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) continue;

        const data = await response.json() as any;
        const result = data.chart?.result?.[0];
        if (!result) continue;

        const meta = result.meta;
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || meta.previousClose;
        const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

        let severity: OmniEvent['severity'] = 'minor';
        if (Math.abs(change) > 1) severity = 'moderate';
        if (Math.abs(change) > 3) severity = 'major';
        if (Math.abs(change) > 5) severity = 'critical';

        events.push({
          id: `yf-${sym}`,
          source: 'yahoo-finance',
          title: `${name}: ${price?.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)`,
          severity,
          eventType: 'economics',
          timestamp: new Date().toISOString(),
          coordinates: { longitude: lon, latitude: lat },
          metadata: {
            symbol: sym,
            price: price?.toFixed(2),
            change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
            currency: meta.currency || 'USD'
          }
        });
      } catch {}
    }

    console.log(`[YFinance] Fetched ${events.length} market data points.`);
  } catch (err) {
    console.error('[YFinance] Error:', err);
  }

  return events;
}
