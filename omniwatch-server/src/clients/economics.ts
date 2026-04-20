import { OmniEvent } from './usgs';

export async function fetchEconomics(): Promise<OmniEvent[]> {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) {
        console.log('[Economics] Missing FINNHUB_API_KEY. Skipping live economic sweep.');
        return [];
    }

    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=^VIX&token=${key}`);
        if (!response.ok) return [];
        
        const data = await response.json() as any;
        const currentVix = data.c; // current price
        
        if (!currentVix) return [];
        
        return [
           {
               id: 'econ-vix-live',
               source: 'finnhub',
               title: 'VIX Volatility Index (LIVE)',
               severity: currentVix > 20 ? 'major' : 'minor',
               eventType: 'economics' as any,
               timestamp: new Date().toISOString(),
               coordinates: { longitude: -87.6, latitude: 41.8 }, // Chicago board
               metadata: { value: currentVix.toFixed(2), trend: currentVix > 21 ? 'BEARISH PANIC' : 'STABLE' }
           }
        ];
    } catch(err) {
        console.error('[Economics] Fetch err:', err);
        return [];
    }
}
