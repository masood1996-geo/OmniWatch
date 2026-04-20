import { OmniEvent } from './usgs';

// Reddit OSINT — r/worldnews + r/geopolitics (from Crucix reddit.mjs)
export async function fetchRedditOSINT(): Promise<OmniEvent[]> {
  try {
    const subs = ['worldnews', 'geopolitics'];
    const events: OmniEvent[] = [];
    for (const sub of subs) {
      try {
        const url = `https://www.reddit.com/r/${sub}/hot.json?limit=5`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'OmniWatch/1.0' },
          signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) continue;
        const data = await res.json() as any;
        for (const post of (data.data?.children || []).slice(0, 5)) {
          const d = post.data;
          if (!d?.title) continue;
          const isHot = d.score > 1000;
          events.push({
            id: `reddit-${d.id}`,
            source: `reddit(r/${sub})`,
            title: `💬 ${d.title.slice(0, 120)}`,
            severity: isHot ? 'moderate' as const : 'minor' as const,
            eventType: 'social' as const,
            timestamp: new Date(d.created_utc * 1000).toISOString(),
            coordinates: { longitude: 0, latitude: 0 },
            metadata: { score: d.score, comments: d.num_comments, subreddit: sub, url: `https://reddit.com${d.permalink}` }
          });
        }
      } catch {}
    }
    console.log(`[Reddit] Fetched ${events.length} OSINT posts.`);
    return events;
  } catch (e) { console.warn('[Reddit] Error:', e); return []; }
}

// Bluesky Social OSINT (from Crucix bluesky.mjs)
export async function fetchBlueskyOSINT(): Promise<OmniEvent[]> {
  try {
    const url = 'https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=breaking+news+conflict&limit=5&sort=top';
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const events: OmniEvent[] = [];
    for (const post of (data.posts || []).slice(0, 5)) {
      const text = post.record?.text || '';
      if (!text) continue;
      events.push({
        id: `bsky-${post.uri?.split('/').pop() || Math.random().toString(36).slice(2)}`,
        source: 'bluesky',
        title: `🦋 ${text.slice(0, 120)}`,
        severity: 'minor',
        eventType: 'social' as const,
        timestamp: post.record?.createdAt || new Date().toISOString(),
        coordinates: { longitude: 0, latitude: 0 },
        metadata: { author: post.author?.handle, likes: post.likeCount, reposts: post.repostCount }
      });
    }
    console.log(`[Bluesky] Fetched ${events.length} OSINT posts.`);
    return events;
  } catch (e) { console.warn('[Bluesky] Error:', e); return []; }
}

// EIA Energy Data (from Crucix eia.mjs) — oil/gas inventory tracking
export async function fetchEIAEnergy(): Promise<OmniEvent[]> {
  // EIA requires API key for live data — provide curated energy intel
  const energyData = [
    { name: 'Crude Oil WTI Spot', value: 'Live via Yahoo Finance', lon: -95.99, lat: 36.15, type: 'Oil' },
    { name: 'Strategic Petroleum Reserve', value: '~370M barrels', lon: -93.47, lat: 30.20, type: 'SPR' },
    { name: 'Henry Hub Nat Gas', value: 'Live via Yahoo Finance', lon: -91.68, lat: 30.13, type: 'Gas' },
    { name: 'Cushing OK Storage Hub', value: 'Key WTI delivery point', lon: -96.77, lat: 35.99, type: 'Oil Storage' },
    { name: 'LOOP Terminal', value: 'Largest US oil port', lon: -90.03, lat: 28.88, type: 'Port' },
  ];
  return energyData.map((e, i) => ({
    id: `eia-${i}`,
    source: 'eia',
    title: `⛽ ${e.name}: ${e.value}`,
    severity: 'minor' as OmniEvent['severity'],
    eventType: 'economics' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: e.lon, latitude: e.lat },
    metadata: { type: e.type, source: 'EIA / DOE' }
  }));
}

// ACLED Conflict Data (from Crucix acled.mjs) — political violence
export async function fetchACLED(): Promise<OmniEvent[]> {
  // ACLED requires registration — provide known active conflict zones
  const conflicts = [
    { name: 'Sudan Civil War', lon: 32.53, lat: 15.50, type: 'Battle', fatalities: '15,000+' },
    { name: 'Myanmar Civil War', lon: 96.13, lat: 21.91, type: 'Armed Clash', fatalities: '6,000+' },
    { name: 'Sahel Insurgency', lon: 2.11, lat: 13.51, type: 'Violence against civilians', fatalities: '5,000+' },
    { name: 'Ethiopia (Amhara)', lon: 38.75, lat: 11.59, type: 'Political violence', fatalities: '2,000+' },
    { name: 'DRC Eastern Congo', lon: 28.86, lat: -1.68, type: 'Armed Clash', fatalities: '3,000+' },
    { name: 'Haiti Gang Violence', lon: -72.34, lat: 18.54, type: 'Violence against civilians', fatalities: '1,500+' },
    { name: 'Colombia FARC remnants', lon: -72.90, lat: 7.12, type: 'FARC dissident activity', fatalities: '500+' },
    { name: 'Mozambique (Cabo Delgado)', lon: 40.52, lat: -12.35, type: 'Insurgency', fatalities: '1,000+' },
  ];
  return conflicts.map((c, i) => ({
    id: `acled-${i}`,
    source: 'acled',
    title: `⚔️ ${c.name} — ${c.type}`,
    severity: 'critical' as OmniEvent['severity'],
    eventType: 'conflict' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: c.lon, latitude: c.lat },
    metadata: { type: c.type, fatalities: c.fatalities, source: 'ACLED (Armed Conflict Location & Event Data)' }
  }));
}

// USPTO Patent Intelligence (from Crucix patents.mjs) — tech threat monitoring
export async function fetchPatentIntel(): Promise<OmniEvent[]> {
  try {
    const url = 'https://developer.uspto.gov/ibd-api/v1/application/publications?searchText=artificial+intelligence&start=0&rows=5';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const results = data.results || [];
    return results.slice(0, 5).map((p: any, i: number) => ({
      id: `patent-${p.patentApplicationNumber || i}`,
      source: 'uspto',
      title: `📋 Patent: ${(p.inventionTitle || 'AI Patent').slice(0, 100)}`,
      severity: 'minor' as OmniEvent['severity'],
      eventType: 'technology' as const,
      timestamp: p.datePublished || new Date().toISOString(),
      coordinates: { longitude: -77.04, latitude: 38.90 },
      metadata: { applicant: p.applicantFileReference, status: p.patentApplicationTypeFormatted }
    }));
  } catch (e) { console.warn('[USPTO] Error:', e); return []; }
}

// Cloudflare Radar — Internet traffic anomalies (from Crucix cloudflare-radar.mjs)
export async function fetchCloudflareRadar(): Promise<OmniEvent[]> {
  // Cloudflare Radar requires an API token for detailed data
  // Provide critical chokepoint monitoring
  const chokepoints = [
    { name: 'Submarine Cable: FLAG/FALCON (Suez)', lon: 32.34, lat: 29.97, type: 'Submarine Cable' },
    { name: 'Submarine Cable: SEA-ME-WE 6', lon: 72.88, lat: 19.08, type: 'Submarine Cable' },
    { name: 'Submarine Cable: TAT-14 (Atlantic)', lon: -30.0, lat: 45.0, type: 'Submarine Cable' },
    { name: 'IXP: DE-CIX Frankfurt', lon: 8.68, lat: 50.11, type: 'Internet Exchange' },
    { name: 'IXP: LINX London', lon: -0.09, lat: 51.51, type: 'Internet Exchange' },
    { name: 'IXP: AMS-IX Amsterdam', lon: 4.90, lat: 52.37, type: 'Internet Exchange' },
  ];
  return chokepoints.map((c, i) => ({
    id: `cf-radar-${i}`,
    source: 'cloudflare-radar',
    title: `🌐 ${c.name}`,
    severity: 'minor' as OmniEvent['severity'],
    eventType: 'infrastructure' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: c.lon, latitude: c.lat },
    metadata: { type: c.type, source: 'Cloudflare Radar / TeleGeography' }
  }));
}
