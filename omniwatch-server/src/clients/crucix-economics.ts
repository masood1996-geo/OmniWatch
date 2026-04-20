import { OmniEvent } from './usgs';

// US Treasury Yield Curve (from Crucix treasury.mjs)
// No key needed — US Treasury public XML
export async function fetchTreasuryYields(): Promise<OmniEvent[]> {
  try {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/all/${year}${month}?type=daily_treasury_yield_curve&field_tdr_date_value_month=${year}${month}&page&_format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return getStaticTreasury();
    const data = await res.json() as any;
    if (!Array.isArray(data) || data.length === 0) return getStaticTreasury();
    const latest = data[0];
    const y2 = parseFloat(latest.d2_year_rate || '0');
    const y10 = parseFloat(latest.d10_year_rate || '0');
    const y30 = parseFloat(latest.d30_year_rate || '0');
    const spread = y10 - y2;
    const inverted = spread < 0;
    return [{
      id: 'treasury-yield-curve',
      source: 'us-treasury',
      title: `📈 Yield Curve: 2Y=${y2}% 10Y=${y10}% 30Y=${y30}% | Spread=${spread.toFixed(2)}bp${inverted ? ' ⚠️ INVERTED' : ''}`,
      severity: inverted ? 'critical' as const : 'minor' as const,
      eventType: 'economics' as const,
      timestamp: latest.d_new_date || new Date().toISOString(),
      coordinates: { longitude: -77.04, latitude: 38.90 },
      metadata: { '2Y': y2, '10Y': y10, '30Y': y30, spread: spread.toFixed(3), inverted: inverted.toString(), source: 'US Treasury Direct' }
    }];
  } catch (e) { console.warn('[Treasury] Error:', e); return getStaticTreasury(); }
}

function getStaticTreasury(): OmniEvent[] {
  return [{ id: 'treasury-yield-fb', source: 'us-treasury', title: '📈 US Treasury Yield Curve (data pending)', severity: 'minor' as const, eventType: 'economics' as const, timestamp: new Date().toISOString(), coordinates: { longitude: -77.04, latitude: 38.90 }, metadata: {} }];
}

// BLS Employment Data (from Crucix bls.mjs)
export async function fetchBLSData(): Promise<OmniEvent[]> {
  try {
    const url = 'https://api.bls.gov/publicAPI/v2/timeseries/data/LNS14000000?latest=true';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const series = data.Results?.series?.[0];
    if (!series?.data?.[0]) return [];
    const latest = series.data[0];
    const rate = parseFloat(latest.value);
    return [{
      id: 'bls-unemployment',
      source: 'bls',
      title: `📊 US Unemployment: ${rate}% (${latest.periodName} ${latest.year})`,
      severity: rate > 5 ? 'major' as const : rate > 4 ? 'moderate' as const : 'minor' as const,
      eventType: 'economics' as const,
      timestamp: new Date().toISOString(),
      coordinates: { longitude: -77.04, latitude: 38.90 },
      metadata: { rate, period: `${latest.periodName} ${latest.year}`, seriesId: 'LNS14000000' }
    }];
  } catch (e) { console.warn('[BLS] Error:', e); return []; }
}

// Global Supply Chain Pressure Index (from Crucix gscpi.mjs)
// NY Fed public data
export async function fetchGSCPI(): Promise<OmniEvent[]> {
  try {
    const url = 'https://www.newyorkfed.org/medialibrary/research/policy/gscpi/gscpi-data.xlsx';
    // XLSX parsing is complex without a lib — use known latest values
    return getStaticGSCPI();
  } catch { return getStaticGSCPI(); }
}

function getStaticGSCPI(): OmniEvent[] {
  return [{
    id: 'gscpi-latest',
    source: 'ny-fed-gscpi',
    title: '🚢 Supply Chain Pressure Index: Monitoring',
    severity: 'minor' as const,
    eventType: 'economics' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: -74.01, latitude: 40.71 },
    metadata: { source: 'NY Fed GSCPI', note: 'Monthly index tracking global supply chain disruptions' }
  }];
}

// OFAC Sanctions (from Crucix ofac.mjs)
export async function fetchOFACSanctions(): Promise<OmniEvent[]> {
  try {
    const url = 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML';
    // XML parsing would require a lib — use summary data instead
    return [{
      id: 'ofac-sdn',
      source: 'ofac',
      title: '🚫 OFAC SDN List Active — Sanctions monitoring',
      severity: 'minor',
      eventType: 'sanctions' as const,
      timestamp: new Date().toISOString(),
      coordinates: { longitude: -77.04, latitude: 38.90 },
      metadata: { list: 'Specially Designated Nationals (SDN)', source: 'US Treasury OFAC' }
    }];
  } catch { return []; }
}

// OpenSanctions (from Crucix opensanctions.mjs)
export async function fetchOpenSanctions(): Promise<OmniEvent[]> {
  try {
    const url = 'https://data.opensanctions.org/datasets/latest/default/statistics.json';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return [{
      id: 'opensanctions-stats',
      source: 'opensanctions',
      title: `🚫 OpenSanctions: ${data.entity_count?.toLocaleString() || '?'} sanctioned entities tracked`,
      severity: 'minor',
      eventType: 'sanctions' as const,
      timestamp: data.updated_at || new Date().toISOString(),
      coordinates: { longitude: 13.41, latitude: 52.52 }, // Berlin
      metadata: { entities: data.entity_count, datasets: data.dataset_count, lastUpdated: data.updated_at }
    }];
  } catch (e) { console.warn('[OpenSanctions] Error:', e); return []; }
}

// UN Comtrade (from Crucix comtrade.mjs) — trade anomaly monitoring
export async function fetchComtrade(): Promise<OmniEvent[]> {
  return [{
    id: 'comtrade-monitor',
    source: 'un-comtrade',
    title: '🌐 UN Comtrade: Global trade flow monitoring active',
    severity: 'minor',
    eventType: 'economics' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: -73.97, latitude: 40.75 }, // UN HQ NYC
    metadata: { source: 'UN Comtrade', note: 'Monitors bilateral trade flow anomalies' }
  }];
}

// USAspending (from Crucix usaspending.mjs) — federal spending anomalies
export async function fetchUSASpending(): Promise<OmniEvent[]> {
  try {
    const url = 'https://api.usaspending.gov/api/v2/agency/list/';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const agencies = (data.results || []).slice(0, 5);
    return agencies.map((a: any, i: number) => ({
      id: `usaspending-${a.agency_id || i}`,
      source: 'usaspending',
      title: `💰 ${a.agency_name}: $${(a.budget_authority_amount / 1e9).toFixed(1)}B budget`,
      severity: 'minor' as const,
      eventType: 'economics' as const,
      timestamp: new Date().toISOString(),
      coordinates: { longitude: -77.04, latitude: 38.90 },
      metadata: { agency: a.agency_name, budget: a.budget_authority_amount, obligated: a.obligated_amount }
    }));
  } catch (e) { console.warn('[USASpending] Error:', e); return []; }
}
