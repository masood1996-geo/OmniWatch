import { OmniEvent } from './usgs';

export async function fetchEconomics(): Promise<OmniEvent[]> {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) {
        console.log('[Economics] Missing FINNHUB_API_KEY. Skipping live economic sweep.');
        return [];
    }

    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=^VIX&token=${key}`);
        if (!response.ok) throw new Error(`Finnhub request failed: HTTP ${response.status}`);
        
        const data = await response.json() as { c?: number };
        const currentVix = Number(data.c);
        if (!Number.isFinite(currentVix) || currentVix <= 0) {
          throw new Error('Finnhub returned no VIX price (free tier may not include index quotes)');
        }
        
        return [
           {
               id: 'econ-vix-live',
               source: 'finnhub',
               title: 'VIX Volatility Index (LIVE)',
               severity: currentVix > 20 ? 'major' : 'minor',
               eventType: 'economics',
               timestamp: new Date().toISOString(),
               sourceTimestamp: null,
               coordinates: { longitude: -87.6, latitude: 41.8 },
               metadata: { value: currentVix.toFixed(2), trend: currentVix > 21 ? 'BEARISH PANIC' : 'STABLE' }
           }
        ];
    } catch(err) {
        console.error('[Economics] Fetch err:', (err as Error).message);
        throw err;
    }
}
