import { fetchJson, toIso } from '../sources/helpers';
import type { OmniEvent } from '../types';

export async function fetchCISAVulns(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>(
    'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    {},
    15000,
  );
  const vulns = (data.vulnerabilities || []).slice(0, 15);
  return vulns.map((v: any): OmniEvent => {
    const added = toIso(v.dateAdded);
    return {
      id: `cisa-${v.cveID}`,
      source: 'cisa-kev',
      title: `🛡️ ${v.cveID}: ${v.vulnerabilityName}`,
      severity: 'major',
      eventType: 'cyber',
      coordinates: { longitude: -77.04, latitude: 38.90 },
      timestamp: added || new Date().toISOString(),
      sourceTimestamp: added,
      metadata: {
        vendor: v.vendorProject,
        product: v.product,
        action: v.requiredAction,
        dueDate: v.dueDate,
        notes: v.notes,
        catalogVersion: data.catalogVersion,
        released: data.dateReleased,
        venueNote: 'Marker at Washington DC (issuing agency)',
      },
    };
  });
}

export async function fetchWHOAlerts(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>('https://www.who.int/api/hubs/diseaseoutbreaknews', {}, 15000);
  const items = (data.value || data || []).slice(0, 10);
  if (!Array.isArray(items)) throw new Error('WHO returned unexpected payload');
  return items.map((item: any): OmniEvent => {
    const published = toIso(item.PublicationDate || item.DateModified);
    return {
      id: `who-${item.Id || item.id}`,
      source: 'who',
      title: `🏥 ${item.Title || item.title || 'Health alert'}`,
      severity: 'major',
      eventType: 'health',
      coordinates: { longitude: 6.14, latitude: 46.23 },
      timestamp: published || new Date().toISOString(),
      sourceTimestamp: published,
      metadata: {
        disease: item.DiseaseNames || '',
        country: item.CountryNames || '',
        summary: String(item.Summary || '').slice(0, 200),
        venueNote: 'Marker at WHO HQ, Geneva (issuing agency)',
      },
    };
  });
}

export async function fetchReliefWeb(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>(
    'https://api.reliefweb.int/v1/reports?appname=omniwatch&limit=10&sort[]=date:desc',
    { headers: { Accept: 'application/json' } },
    15000,
  );
  const items = data.data || [];
  return items.map((item: any): OmniEvent => {
    const fields = item.fields || {};
    const country = fields.primary_country;
    const created = toIso(fields.date?.created);
    return {
      id: `reliefweb-${item.id}`,
      source: 'reliefweb',
      title: `🆘 ${String(fields.title || '').slice(0, 100)}`,
      severity: 'moderate',
      eventType: 'humanitarian',
      coordinates: country?.location
        ? { longitude: Number(country.location.lon), latitude: Number(country.location.lat) }
        : null,
      timestamp: created || new Date().toISOString(),
      sourceTimestamp: created,
      metadata: {
        country: country?.name,
        source: fields.source?.[0]?.name,
        disaster: fields.disaster_type?.[0]?.name,
      },
    };
  });
}
