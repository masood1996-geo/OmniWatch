import { fetchJson, fetchWithTimeout, hashId, toIso } from '../sources/helpers';
import type { OmniEvent } from '../types';

export async function fetchPredictionMarkets(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>(
    'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=20&order=volume24hr&ascending=false',
    { headers: { Accept: 'application/json' } },
    15000,
  );
  const markets = Array.isArray(data) ? data : data?.data || [];
  const events: OmniEvent[] = [];
  for (const market of markets.slice(0, 20)) {
    const question = String(market?.question || '').trim();
    const id = market?.conditionId || market?.id;
    if (!question || !id) continue;
    let probability: number | null = null;
    try {
      const prices = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
      if (Array.isArray(prices) && prices.length > 0) probability = Number(prices[0]);
    } catch { probability = null; }
    const probPct = probability !== null && Number.isFinite(probability)
      ? `${(probability * 100).toFixed(0)}%`
      : 'n/a';
    const endDate = toIso(market.endDate || market.end_date_iso);
    events.push({
      id: `poly-${id}`,
      source: 'polymarket',
      title: `📊 ${question} (${probPct})`,
      severity: probability !== null && probability > 0.7 ? 'major' : 'minor',
      eventType: 'economics',
      coordinates: null,
      timestamp: new Date().toISOString(),
      sourceTimestamp: null,
      metadata: {
        probability: probPct,
        volume24hr: market.volume24hr,
        liquidity: market.liquidity,
        endDate,
        url: market.slug ? `https://polymarket.com/event/${market.slug}` : undefined,
        note: 'No map marker: prediction markets are not geolocated',
      },
    });
  }
  return events;
}

const RSS_FEEDS = [
  { id: 'bbc', name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'guardian', name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss' },
  { id: 'aljazeera', name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
];

const CONFLICT_KEYWORDS = /war|attack|military|bomb|strike|troops|conflict|weapon|missile|terror|kill|dead|invasion|offensive|ceasefire/i;

export function parseRssItems(xml: string, limit = 3): Array<{ title: string; link: string; pubDate: string | null }> {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) || [];
  const out: Array<{ title: string; link: string; pubDate: string | null }> = [];
  for (const item of items.slice(0, limit)) {
    const titleMatch = item.match(/<title[^>]*>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/s);
    const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
    const linkMatch = item.match(/<link[^>]*>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/link>/s);
    const link = (linkMatch?.[1] || linkMatch?.[2] || '').trim();
    const dateMatch = item.match(/<pubDate[^>]*>(.*?)<\/pubDate>/s);
    if (!title) continue;
    out.push({ title, link, pubDate: toIso(dateMatch?.[1]) });
  }
  return out;
}

export async function fetchRSSIntel(): Promise<OmniEvent[]> {
  const events: OmniEvent[] = [];
  const failures: string[] = [];
  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetchWithTimeout(feed.url, { headers: { Accept: 'application/rss+xml, application/xml' } }, 10000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = parseRssItems(await res.text(), 5);
      for (const item of items) {
        if (!CONFLICT_KEYWORDS.test(item.title)) continue;
        events.push({
          id: `rss-${hashId(feed.id, item.title, item.link)}`,
          source: `rss(${feed.id})`,
          title: `📰 ${item.title}`,
          severity: 'moderate',
          eventType: 'news',
          coordinates: null,
          timestamp: item.pubDate || new Date().toISOString(),
          sourceTimestamp: item.pubDate,
          metadata: {
            feed: feed.name,
            url: item.link,
            note: 'Headline only; no geolocation available from RSS',
          },
        });
      }
    } catch (err) {
      failures.push(`${feed.name}: ${(err as Error).message}`);
    }
  }
  if (events.length === 0 && failures.length === RSS_FEEDS.length) {
    throw new Error(`All RSS feeds failed: ${failures.join('; ')}`);
  }
  return events;
}
