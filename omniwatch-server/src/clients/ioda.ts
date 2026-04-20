import { OmniEvent } from './usgs';

// Internet Outage Detection — Georgia Tech IODA (from Shadowbroker)
// Public API, no key needed
export async function fetchInternetOutages(): Promise<OmniEvent[]> {
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - 3600; // Last hour
    const url = `https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country?from=${start}&until=${end}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return [];

    const data = await response.json() as any;
    const events: OmniEvent[] = [];

    // Country centroids for mapping
    const centroids: Record<string, [number, number]> = {
      'US': [-98.58, 39.83], 'CN': [104.19, 35.86], 'RU': [105.32, 61.52],
      'IN': [78.96, 20.59], 'BR': [-51.93, -14.24], 'IR': [53.69, 32.43],
      'PK': [69.35, 30.38], 'NG': [8.68, 9.08], 'BD': [90.36, 23.68],
      'MX': [-102.55, 23.63], 'EG': [30.80, 26.82], 'TR': [35.24, 38.96],
      'UA': [31.17, 48.38], 'SY': [38.99, 34.80], 'IQ': [43.68, 33.22],
      'SD': [30.22, 12.86], 'MM': [95.96, 21.91], 'AF': [67.71, 33.94],
      'VE': [-66.59, 6.42], 'CU': [-77.78, 21.52],
    };

    for (const entry of data.data?.slice(0, 30) || []) {
      const code = entry.entity?.code;
      const coords = centroids[code];
      if (!coords) continue;

      const bgpScore = entry.dataseries?.find((d: any) => d.datasource === 'bgp')?.values?.[0]?.score;
      if (bgpScore === undefined || bgpScore > 0.8) continue; // Only show actual outages

      const severity_val = 1 - bgpScore;
      let severity: OmniEvent['severity'] = 'minor';
      if (severity_val > 0.3) severity = 'moderate';
      if (severity_val > 0.5) severity = 'major';
      if (severity_val > 0.8) severity = 'critical';

      events.push({
        id: `ioda-${code}`,
        source: 'ioda',
        title: `Internet Outage: ${entry.entity?.name || code} (${(severity_val * 100).toFixed(0)}% degraded)`,
        severity,
        eventType: 'infrastructure' as const,
        timestamp: new Date().toISOString(),
        coordinates: { longitude: coords[0], latitude: coords[1] },
        metadata: {
          country: entry.entity?.name,
          countryCode: code,
          bgpScore: bgpScore?.toFixed(3),
          degradation: `${(severity_val * 100).toFixed(0)}%`,
          datasource: 'BGP + Active Probing'
        }
      });
    }
    console.log(`[IODA] Fetched ${events.length} internet outage signals.`);
    return events;
  } catch (err) {
    console.warn('[IODA] Error:', err);
    return [];
  }
}
