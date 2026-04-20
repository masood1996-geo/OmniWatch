import { OmniEvent } from './usgs';

// FRED — Federal Reserve Economic Data (from Crucix)
// Key macro indicators that signal economic stress or stability
const SERIES = [
  { id: 'DFF', name: 'Fed Funds Rate', unit: '%', lon: -77.03, lat: 38.89 },          // Washington DC (Fed)
  { id: 'UNRATE', name: 'Unemployment Rate', unit: '%', lon: -77.03, lat: 38.89 },
  { id: 'CPIAUCSL', name: 'CPI (Inflation)', unit: 'index', lon: -77.03, lat: 38.89 },
  { id: 'T10Y2Y', name: '10Y-2Y Yield Spread', unit: '%', lon: -74.0, lat: 40.71 },   // NYC (Treasury)
  { id: 'DTWEXBGS', name: 'USD Trade-Weighted Index', unit: 'index', lon: -74.0, lat: 40.71 },
  { id: 'BAMLH0A0HYM2', name: 'High-Yield Bond Spread', unit: '%', lon: -74.0, lat: 40.71 },
];

export async function fetchFREDEconomics(): Promise<OmniEvent[]> {
  const key = process.env.FRED_API_KEY;
  if (!key) {
    console.log('[FRED] No FRED_API_KEY set. Skipping Federal Reserve data.');
    return [];
  }

  const events: OmniEvent[] = [];

  // Fetch all series in parallel
  const results = await Promise.allSettled(
    SERIES.map(async (series) => {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}&api_key=${key}&file_type=json&sort_order=desc&limit=1`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return null;

      const data = await response.json() as any;
      const obs = data.observations?.[0];
      if (!obs || obs.value === '.') return null;

      const value = parseFloat(obs.value);
      if (isNaN(value)) return null;

      // Severity heuristics for economic stress signals
      let severity: OmniEvent['severity'] = 'minor';

      if (series.id === 'T10Y2Y' && value < 0) severity = 'critical';         // Inverted yield curve = recession signal
      else if (series.id === 'T10Y2Y' && value < 0.5) severity = 'major';
      else if (series.id === 'UNRATE' && value > 5) severity = 'major';
      else if (series.id === 'UNRATE' && value > 7) severity = 'critical';
      else if (series.id === 'DFF' && value > 5) severity = 'major';
      else if (series.id === 'BAMLH0A0HYM2' && value > 5) severity = 'major';
      else if (series.id === 'BAMLH0A0HYM2' && value > 8) severity = 'critical';

      return {
        id: `fred-${series.id}`,
        source: 'fred',
        title: `${series.name}: ${value.toFixed(2)}${series.unit === '%' ? '%' : ` ${series.unit}`}`,
        severity,
        eventType: 'economics' as const,
        timestamp: obs.date || new Date().toISOString(),
        coordinates: { longitude: series.lon, latitude: series.lat },
        metadata: {
          seriesId: series.id,
          value: value.toFixed(2),
          unit: series.unit,
          date: obs.date,
          provider: 'Federal Reserve Bank of St. Louis'
        }
      };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      events.push(result.value);
    }
  }

  console.log(`[FRED] Fetched ${events.length} economic indicators.`);
  return events;
}
