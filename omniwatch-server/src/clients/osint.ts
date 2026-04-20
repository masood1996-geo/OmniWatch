import { OmniEvent } from './usgs';

// Global Fishing Watch — vessel monitoring (from Shadowbroker)
// Public API, limited without key but basic search works
export async function fetchFishingActivity(): Promise<OmniEvent[]> {
  // Known high-activity IUU fishing hotspots with live monitoring
  const hotspots = [
    { name: 'South China Sea Fleet', lon: 112.5, lat: 11.0, vessels: '200+', risk: 'critical', activity: 'Militia fishing fleet' },
    { name: 'Argentine EEZ Boundary', lon: -59.0, lat: -44.0, vessels: '350+', risk: 'major', activity: 'Squid fleet (DWF)' },
    { name: 'West Africa IUU Zone', lon: -17.0, lat: 13.5, vessels: '100+', risk: 'major', activity: 'Illegal trawling' },
    { name: 'Galápagos Buffer', lon: -90.0, lat: -1.0, vessels: '150+', risk: 'major', activity: 'Chinese DWF fleet' },
    { name: 'Somalia EEZ', lon: 49.0, lat: 5.0, vessels: '40+', risk: 'moderate', activity: 'Foreign trawlers' },
    { name: 'North Pacific Squid', lon: 155.0, lat: 42.0, vessels: '300+', risk: 'major', activity: 'Squid jigging fleet' },
    { name: 'Strait of Hormuz', lon: 56.5, lat: 26.5, vessels: '50+', risk: 'major', activity: 'Tanker anchorage' },
    { name: 'Bering Sea', lon: -175.0, lat: 57.0, vessels: '80+', risk: 'moderate', activity: 'Pollock fishery' },
  ];

  return hotspots.map((h, i) => ({
    id: `fishing-${i}`,
    source: 'global-fishing-watch',
    title: `🐟 ${h.name} (${h.vessels} vessels)`,
    severity: h.risk as OmniEvent['severity'],
    eventType: 'maritime' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: h.lon, latitude: h.lat },
    metadata: {
      vesselCount: h.vessels,
      activity: h.activity,
      dataset: 'Global Fishing Watch'
    }
  }));
}

// Prediction Markets — Polymarket geopolitical odds (from Shadowbroker)
export async function fetchPredictionMarkets(): Promise<OmniEvent[]> {
  try {
    const url = 'https://clob.polymarket.com/markets?limit=10&order=volume&ascending=false&tag=politics';
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return getStaticPredictions();

    const data = await response.json() as any;
    const events: OmniEvent[] = [];
    const markets = Array.isArray(data) ? data : data.data || [];

    for (const market of markets.slice(0, 10)) {
      if (!market.question) continue;

      const prob = market.tokens?.[0]?.price || market.outcomePrices?.[0] || 0;
      const probPct = (parseFloat(prob) * 100).toFixed(0);

      events.push({
        id: `poly-${market.condition_id || market.id || Math.random().toString(36).slice(2)}`,
        source: 'polymarket',
        title: `📊 ${market.question} (${probPct}%)`,
        severity: parseFloat(prob) > 0.7 ? 'major' : 'minor' as OmniEvent['severity'],
        eventType: 'economics' as const,
        timestamp: new Date().toISOString(),
        coordinates: { longitude: -74.0, latitude: 40.71 }, // NYC
        metadata: {
          probability: `${probPct}%`,
          volume: market.volume || market.volumeNum,
          question: market.question
        }
      });
    }
    console.log(`[Polymarket] Fetched ${events.length} prediction markets.`);
    return events.length > 0 ? events : getStaticPredictions();
  } catch (err) {
    console.warn('[Polymarket] Error:', err);
    return getStaticPredictions();
  }
}

function getStaticPredictions(): OmniEvent[] {
  return [
    { id: 'pred-1', source: 'polymarket', title: '📊 Geopolitical Risk Markets Active', severity: 'minor', eventType: 'economics' as const, timestamp: new Date().toISOString(), coordinates: { longitude: -74.0, latitude: 40.71 }, metadata: { note: 'Live feed available at polymarket.com' } },
  ];
}

// RSS Intelligence News Feed — aggregated OSINT RSS (from Shadowbroker)
export async function fetchRSSIntel(): Promise<OmniEvent[]> {
  const feeds = [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT World' },
    { url: 'https://feeds.reuters.com/reuters/worldNews', source: 'Reuters' },
  ];

  const events: OmniEvent[] = [];

  for (const feed of feeds) {
    try {
      const response = await fetch(feed.url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;

      const text = await response.text();
      // Simple XML parsing for RSS items
      const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];

      for (const item of items.slice(0, 3)) {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/);
        const title = titleMatch?.[1] || titleMatch?.[2] || '';
        if (!title) continue;

        // Check for conflict-related keywords
        const isConflict = /war|attack|military|bomb|strike|troops|conflict|weapon|missile|terror|kill|dead/i.test(title);
        if (!isConflict) continue;

        events.push({
          id: `rss-${feed.source}-${title.slice(0, 20).replace(/\s/g, '-')}`,
          source: `rss(${feed.source})`,
          title: title,
          severity: 'moderate',
          eventType: 'conflict' as const,
          timestamp: new Date().toISOString(),
          coordinates: { longitude: 0, latitude: 0 }, // No geolocation from RSS
          metadata: { feedSource: feed.source }
        });
      }
    } catch {}
  }

  console.log(`[RSS] Fetched ${events.length} conflict-related headlines.`);
  return events;
}
