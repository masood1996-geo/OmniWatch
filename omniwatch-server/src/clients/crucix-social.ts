import { config } from '../config';
import { fetchJson, fetchWithTimeout, hashId, toIso } from '../sources/helpers';
import type { OmniEvent } from '../types';

let redditToken: { value: string; expiresAt: number } | null = null;

export function resetRedditToken(): void {
  redditToken = null;
}

async function getRedditToken(): Promise<string> {
  if (redditToken && Date.now() < redditToken.expiresAt - 30000) return redditToken.value;
  const basic = Buffer.from(`${config.keys.redditClientId}:${config.keys.redditClientSecret}`).toString('base64');
  const res = await fetchWithTimeout('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  }, 15000);
  if (!res.ok) throw new Error(`Reddit token request failed: HTTP ${res.status}`);
  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error('Reddit token response missing access_token');
  redditToken = { value: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
  return redditToken.value;
}

export async function fetchRedditOSINT(): Promise<OmniEvent[]> {
  const token = await getRedditToken();
  const subs = ['worldnews', 'geopolitics'];
  const events: OmniEvent[] = [];
  for (const sub of subs) {
    const data = await fetchJson<any>(
      `https://oauth.reddit.com/r/${sub}/hot?limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
      12000,
    );
    for (const post of (data?.data?.children || []).slice(0, 5)) {
      const d = post.data;
      if (!d?.title || !d?.id) continue;
      const created = toIso(d.created_utc);
      events.push({
        id: `reddit-${d.id}`,
        source: `reddit(r/${sub})`,
        title: `💬 ${String(d.title).slice(0, 120)}`,
        severity: d.score > 1000 ? 'moderate' : 'minor',
        eventType: 'social',
        coordinates: null,
        timestamp: created || new Date().toISOString(),
        sourceTimestamp: created,
        metadata: {
          score: d.score,
          comments: d.num_comments,
          subreddit: sub,
          url: `https://reddit.com${d.permalink}`,
        },
      });
    }
  }
  return events;
}

export async function fetchBlueskyOSINT(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>(
    'https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=breaking+news+conflict&limit=10&sort=top',
    { headers: { Accept: 'application/json' } },
    12000,
  );
  const posts = data?.posts || [];
  const events: OmniEvent[] = [];
  for (const post of posts) {
    const text = post.record?.text || '';
    const uri = post.uri || '';
    if (!text || !uri) continue;
    const created = toIso(post.record?.createdAt);
    events.push({
      id: `bsky-${hashId(uri)}`,
      source: 'bluesky',
      title: `🦋 ${String(text).slice(0, 120)}`,
      severity: 'minor',
      eventType: 'social',
      coordinates: null,
      timestamp: created || new Date().toISOString(),
      sourceTimestamp: created,
      metadata: { author: post.author?.handle, likes: post.likeCount, reposts: post.repostCount },
    });
  }
  return events;
}

export async function fetchEIAEnergy(): Promise<OmniEvent[]> {
  const url = 'https://api.eia.gov/v2/petroleum/stoc/wstk/data/?frequency=weekly&data[0]=value&facets[series][]=WCRSTUS1&sort[0][column]=period&sort[0][direction]=desc&length=1';
  const data = await fetchJson<any>(`${url}&api_key=${encodeURIComponent(config.keys.eia)}`, {}, 20000);
  const row = data?.response?.data?.[0];
  if (!row) throw new Error('EIA returned no data rows');
  const value = Number(row.value);
  return [{
    id: 'eia-crude-stocks',
    source: 'eia',
    title: `⛽ US crude oil stocks (weekly): ${Number.isFinite(value) ? value.toLocaleString() : row.value}`,
    severity: 'minor',
    eventType: 'economics',
    coordinates: { longitude: -95.99, latitude: 36.15 },
    timestamp: row.period || new Date().toISOString(),
    sourceTimestamp: toIso(row.period),
    metadata: { series: row.series, period: row.period, units: row.units, source: 'EIA API v2' },
  }];
}

export async function fetchACLED(): Promise<OmniEvent[]> {
  const body = new URLSearchParams({
    client_id: 'acled',
    grant_type: 'password',
    username: config.keys.acledEmail,
    password: config.keys.acled,
  });
  const tokenRes = await fetchWithTimeout('https://acleddata.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }, 15000);
  if (!tokenRes.ok) throw new Error(`ACLED token request failed: HTTP ${tokenRes.status}`);
  const tokenData = await tokenRes.json() as any;
  if (!tokenData.access_token) throw new Error('ACLED token response missing access_token');
  const data = await fetchJson<any>(
    'https://acleddata.com/api/acled/read?limit=20&fields=event_id|event_date|event_type|sub_event_type|country|latitude|longitude|fatalities|notes',
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    20000,
  );
  const rows = data?.data || [];
  return rows.map((row: any): OmniEvent => {
    const date = toIso(row.event_date);
    return {
      id: `acled-${row.event_id || hashId(row.event_date, row.country, row.notes)}`,
      source: 'acled',
      title: `⚔️ ${row.country}: ${row.event_type}${row.sub_event_type ? ` / ${row.sub_event_type}` : ''} (fatalities: ${row.fatalities ?? 'n/a'})`,
      severity: Number(row.fatalities) >= 10 ? 'critical' : Number(row.fatalities) > 0 ? 'major' : 'moderate',
      eventType: 'conflict',
      coordinates: row.latitude && row.longitude
        ? { longitude: Number(row.longitude), latitude: Number(row.latitude) }
        : null,
      timestamp: date || new Date().toISOString(),
      sourceTimestamp: date,
      metadata: { eventType: row.event_type, subEventType: row.sub_event_type, fatalities: row.fatalities, country: row.country, source: 'ACLED API' },
    };
  });
}

export async function fetchPatentIntel(): Promise<OmniEvent[]> {
  const query = encodeURIComponent(JSON.stringify({ _text_any: { patent_title: 'artificial intelligence' } }));
  const fields = encodeURIComponent(JSON.stringify(['patent_id', 'patent_title', 'patent_date']));
  const options = encodeURIComponent(JSON.stringify({ per_page: 5 }));
  const data = await fetchJson<any>(
    `https://search.patentsview.org/api/v1/patent/?q=${query}&f=${fields}&o=${options}`,
    { headers: { 'X-Api-Key': config.keys.patentsview } },
    20000,
  );
  const rows = data?.patents || [];
  return rows.map((p: any): OmniEvent => {
    const date = toIso(p.patent_date);
    return {
      id: `patent-${p.patent_id}`,
      source: 'uspto',
      title: `📋 Patent: ${String(p.patent_title || '').slice(0, 100)}`,
      severity: 'minor',
      eventType: 'technology',
      coordinates: { longitude: -77.04, latitude: 38.90 },
      timestamp: date || new Date().toISOString(),
      sourceTimestamp: date,
      metadata: { patentId: p.patent_id, source: 'PatentsView API (USPTO)', venueNote: 'Marker at Washington DC (issuing agency)' },
    };
  });
}

export async function fetchCloudflareRadar(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>(
    'https://api.cloudflare.com/client/v4/radar/annotations/outages?limit=10&dateRange=7d',
    { headers: { Authorization: `Bearer ${config.keys.cloudflare}` } },
    20000,
  );
  const annotations = data?.result?.annotations || [];
  return annotations.map((a: any): OmniEvent => {
    const date = toIso(a.startDate);
    return {
      id: `cf-radar-${a.id}`,
      source: 'cloudflare-radar',
      title: `🌐 Internet outage annotation: ${a.description || a.locations?.join(', ') || 'outage'}`,
      severity: /major|nationwide|total/i.test(a.description || '') ? 'major' : 'moderate',
      eventType: 'infrastructure',
      coordinates: null,
      timestamp: date || new Date().toISOString(),
      sourceTimestamp: date,
      metadata: { locations: a.locations, asns: a.asns, outageType: a.outageType, source: 'Cloudflare Radar API' },
    };
  });
}
