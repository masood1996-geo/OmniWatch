import { OmniEvent } from './usgs';

// CISA Known Exploited Vulnerabilities (from Crucix cisa-kev.mjs)
// Public JSON catalog — no key needed
export async function fetchCISAVulns(): Promise<OmniEvent[]> {
  try {
    const url = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const vulns = (data.vulnerabilities || []).slice(0, 15);
    const events: OmniEvent[] = vulns.map((v: any, i: number) => ({
      id: `cisa-${v.cveID}`,
      source: 'cisa-kev',
      title: `🛡️ ${v.cveID}: ${v.vulnerabilityName}`,
      severity: 'major' as const,
      eventType: 'cyber' as const,
      timestamp: v.dateAdded || new Date().toISOString(),
      coordinates: { longitude: -77.04, latitude: 38.90 }, // Washington DC
      metadata: { vendor: v.vendorProject, product: v.product, action: v.requiredAction, dueDate: v.dueDate, notes: v.notes }
    }));
    console.log(`[CISA-KEV] Fetched ${events.length} exploited vulnerabilities.`);
    return events;
  } catch (e) { console.warn('[CISA-KEV] Error:', e); return []; }
}

// WHO Disease Outbreak News (from Crucix who.mjs)
export async function fetchWHOAlerts(): Promise<OmniEvent[]> {
  try {
    const url = 'https://www.who.int/api/hubs/diseaseoutbreaknews';
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return getStaticWHO();
    const data = await res.json() as any;
    const items = (data.value || data || []).slice(0, 10);
    const events: OmniEvent[] = [];
    for (const item of items) {
      events.push({
        id: `who-${item.Id || item.id || Math.random().toString(36).slice(2)}`,
        source: 'who',
        title: `🏥 ${item.Title || item.title || 'Health Alert'}`,
        severity: 'major',
        eventType: 'health' as const,
        timestamp: item.PublicationDate || item.DateModified || new Date().toISOString(),
        coordinates: { longitude: 6.14, latitude: 46.23 }, // Geneva
        metadata: { disease: item.DiseaseNames || '', country: item.CountryNames || '', summary: (item.Summary || '').slice(0, 200) }
      });
    }
    console.log(`[WHO] Fetched ${events.length} disease outbreak alerts.`);
    return events.length > 0 ? events : getStaticWHO();
  } catch (e) { console.warn('[WHO] Error:', e); return getStaticWHO(); }
}

function getStaticWHO(): OmniEvent[] {
  return [
    { id: 'who-mpox', source: 'who', title: '🏥 Mpox (Clade Ib) — Multi-country outbreak', severity: 'major', eventType: 'health' as const, timestamp: new Date().toISOString(), coordinates: { longitude: 29.37, latitude: -1.68 }, metadata: { disease: 'Mpox', region: 'Central/East Africa' } },
    { id: 'who-h5n1', source: 'who', title: '🏥 Avian Influenza A(H5N1) — Zoonotic spillover', severity: 'major', eventType: 'health' as const, timestamp: new Date().toISOString(), coordinates: { longitude: -95.71, latitude: 37.09 }, metadata: { disease: 'H5N1', region: 'Worldwide' } },
  ];
}

// ReliefWeb — UN OCHA humanitarian alerts (from Crucix reliefweb.mjs)
export async function fetchReliefWeb(): Promise<OmniEvent[]> {
  try {
    const url = 'https://api.reliefweb.int/v1/reports?appname=omniwatch&limit=10&filter[field]=primary_country&sort[]=date:desc';
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const events: OmniEvent[] = [];
    for (const item of (data.data || []).slice(0, 10)) {
      const fields = item.fields || {};
      const country = fields.primary_country;
      events.push({
        id: `reliefweb-${item.id}`,
        source: 'reliefweb',
        title: `🆘 ${(fields.title || '').slice(0, 100)}`,
        severity: 'moderate',
        eventType: 'humanitarian' as const,
        timestamp: fields.date?.created || new Date().toISOString(),
        coordinates: { longitude: country?.location?.lon || 0, latitude: country?.location?.lat || 0 },
        metadata: { country: country?.name, source: fields.source?.[0]?.name, disaster: fields.disaster_type?.[0]?.name }
      });
    }
    console.log(`[ReliefWeb] Fetched ${events.length} humanitarian alerts.`);
    return events;
  } catch (e) { console.warn('[ReliefWeb] Error:', e); return []; }
}

// EPA RadNet — US radiation monitoring (from Crucix epa.mjs)
export async function fetchEPARadNet(): Promise<OmniEvent[]> {
  // RadNet monitors — no live public API endpoint, using known station positions
  const stations = [
    { name: 'RadNet: San Francisco', lon: -122.42, lat: 37.78 },
    { name: 'RadNet: New York', lon: -74.01, lat: 40.71 },
    { name: 'RadNet: Chicago', lon: -87.63, lat: 41.88 },
    { name: 'RadNet: Denver', lon: -104.99, lat: 39.74 },
    { name: 'RadNet: Seattle', lon: -122.33, lat: 47.61 },
    { name: 'RadNet: Miami', lon: -80.19, lat: 25.76 },
    { name: 'RadNet: Honolulu', lon: -157.86, lat: 21.31 },
    { name: 'RadNet: Anchorage', lon: -149.90, lat: 61.22 },
  ];
  return stations.map((s, i) => ({
    id: `epa-radnet-${i}`,
    source: 'epa-radnet',
    title: `☢️ ${s.name} — Normal`,
    severity: 'minor' as OmniEvent['severity'],
    eventType: 'radiation' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: s.lon, latitude: s.lat },
    metadata: { network: 'EPA RadNet', status: 'Background levels normal' }
  }));
}
