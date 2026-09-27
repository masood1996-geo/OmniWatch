import { fetchJson, fetchWithTimeout, toIso } from '../sources/helpers';
import type { OmniEvent } from '../types';

export function parseTreasuryCsv(csv: string): { date: string; y2: number; y10: number; y30: number } | null {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const idx2 = header.findIndex(h => h === '2 Yr');
  const idx10 = header.findIndex(h => h === '10 Yr');
  const idx30 = header.findIndex(h => h === '30 Yr');
  if (idx2 < 0 || idx10 < 0 || idx30 < 0) return null;
  const cols = lines[1].split(',');
  const y2 = Number(cols[idx2]);
  const y10 = Number(cols[idx10]);
  const y30 = Number(cols[idx30]);
  if (!Number.isFinite(y2) || !Number.isFinite(y10) || !Number.isFinite(y30)) return null;
  const [mm, dd, yyyy] = (cols[0] || '').split('/');
  const date = mm && dd && yyyy ? new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd))).toISOString() : null;
  if (!date) return null;
  return { date, y2, y10, y30 };
}

export async function fetchTreasuryYields(): Promise<OmniEvent[]> {
  const now = new Date();
  const month = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/all/${month}?type=daily_treasury_yield_curve&field_tdr_date_value_month=${month}`;
  let csv: string | null = null;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2 && csv === null; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { headers: { Accept: 'text/csv' } }, 30000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      csv = await res.text();
    } catch (err) {
      lastError = err as Error;
    }
  }
  if (csv === null) throw new Error(`US Treasury CSV request failed: ${lastError?.message || 'unknown error'}`);
  const parsed = parseTreasuryCsv(csv);
  if (!parsed) throw new Error('US Treasury CSV could not be parsed');
  const spread = parsed.y10 - parsed.y2;
  const inverted = spread < 0;
  return [{
    id: 'treasury-yield-curve',
    source: 'us-treasury',
    title: `📈 Yield curve ${parsed.date.slice(0, 10)}: 2Y=${parsed.y2}% 10Y=${parsed.y10}% 30Y=${parsed.y30}% | 10Y-2Y=${spread.toFixed(2)}pp${inverted ? ' INVERTED' : ''}`,
    severity: inverted ? 'critical' : 'minor',
    eventType: 'economics',
    coordinates: { longitude: -77.04, latitude: 38.90 },
    timestamp: parsed.date,
    sourceTimestamp: parsed.date,
    metadata: { '2Y': parsed.y2, '10Y': parsed.y10, '30Y': parsed.y30, spread: spread.toFixed(3), inverted: String(inverted), source: 'US Treasury daily yield curve CSV', venueNote: 'Marker at Washington DC (issuing agency)' },
  }];
}

export async function fetchBLSData(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>(
    'https://api.bls.gov/publicAPI/v2/timeseries/data/LNS14000000?latest=true',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seriesid: ['LNS14000000'], latest: true }) },
    15000,
  );
  const latest = data.Results?.series?.[0]?.data?.[0];
  if (!latest) throw new Error(`BLS returned no data (status: ${data.status || 'unknown'})`);
  const rate = Number(latest.value);
  const periodLabel = `${latest.periodName} ${latest.year}`;
  return [{
    id: 'bls-unemployment',
    source: 'bls',
    title: `📊 US unemployment: ${rate}% (${periodLabel})`,
    severity: rate > 5 ? 'major' : rate > 4 ? 'moderate' : 'minor',
    eventType: 'economics',
    coordinates: { longitude: -77.04, latitude: 38.90 },
    timestamp: new Date().toISOString(),
    sourceTimestamp: null,
    metadata: { rate, period: periodLabel, seriesId: 'LNS14000000', source: 'Bureau of Labor Statistics API v2' },
  }];
}

export async function fetchOFACSanctions(): Promise<OmniEvent[]> {
  let text: string | null = null;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2 && text === null; attempt++) {
    try {
      const res = await fetchWithTimeout('https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV', {
        headers: { Accept: 'text/csv' },
      }, 60000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
    } catch (err) {
      lastError = err as Error;
      if (attempt === 0) await new Promise(r => setTimeout(r, 4000));
    }
  }
  if (text === null) throw new Error(`OFAC SDN export failed: ${lastError?.message || 'unknown error'}`);
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  const entityCount = Math.max(0, lines.length - 1);
  if (entityCount === 0) throw new Error('OFAC SDN export was empty');
  return [{
    id: 'ofac-sdn',
    source: 'ofac',
    title: `🚫 OFAC SDN list: ${entityCount.toLocaleString()} designated entities`,
    severity: 'minor',
    eventType: 'sanctions',
    coordinates: { longitude: -77.04, latitude: 38.90 },
    timestamp: new Date().toISOString(),
    sourceTimestamp: null,
    metadata: { entityCount, list: 'Specially Designated Nationals (SDN)', source: 'US Treasury OFAC export', venueNote: 'Marker at Washington DC (issuing agency)' },
  }];
}

export async function fetchOpenSanctions(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>(
    'https://data.opensanctions.org/datasets/latest/default/statistics.json',
    {},
    15000,
  );
  const updated = toIso(data.updated_at);
  return [{
    id: 'opensanctions-stats',
    source: 'opensanctions',
    title: `🚫 OpenSanctions: ${Number(data.entity_count || 0).toLocaleString()} sanctioned entities tracked`,
    severity: 'minor',
    eventType: 'sanctions',
    coordinates: { longitude: 13.41, latitude: 52.52 },
    timestamp: updated || new Date().toISOString(),
    sourceTimestamp: updated,
    metadata: { entities: data.entity_count, datasets: data.dataset_count, lastUpdated: data.updated_at, venueNote: 'Marker at publisher location, Berlin' },
  }];
}

export async function fetchComtrade(): Promise<OmniEvent[]> {
  const period = new Date().getUTCFullYear() - 1;
  const data = await fetchJson<any>(
    `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=842&period=${period}&cmdCode=TOTAL&flowCode=X`,
    { headers: { Accept: 'application/json' } },
    20000,
  );
  const row = data.data?.[0];
  if (!row) throw new Error('UN Comtrade preview returned no rows');
  return [{
    id: `comtrade-${row.reporterCode}-${row.period}-${row.flowCode}`,
    source: 'un-comtrade',
    title: `🌐 UN Comtrade: US total exports ${row.period} reported (${Number(data.count || 0)} records)`,
    severity: 'minor',
    eventType: 'economics',
    coordinates: { longitude: -73.97, latitude: 40.75 },
    timestamp: new Date().toISOString(),
    sourceTimestamp: null,
    metadata: { reporterCode: row.reporterCode, period: row.period, flowCode: row.flowCode, classification: row.classificationCode, source: 'UN Comtrade public preview API', venueNote: 'Marker at UN HQ NYC (dataset issuer)' },
  }];
}

export async function fetchUSASpending(): Promise<OmniEvent[]> {
  const data = await fetchJson<any>('https://api.usaspending.gov/api/v2/references/toptier_agencies/?limit=20', {}, 30000);
  const agencies = (data.results || [])
    .filter((a: any) => Number(a.budget_authority_amount) > 0)
    .sort((a: any, b: any) => Number(b.budget_authority_amount) - Number(a.budget_authority_amount))
    .slice(0, 5);
  return agencies.map((a: any, i: number): OmniEvent => ({
    id: `usaspending-${a.agency_id || i}`,
    source: 'usaspending',
    title: `💰 ${a.agency_name}: $${(Number(a.budget_authority_amount || 0) / 1e9).toFixed(1)}B budget authority`,
    severity: 'minor',
    eventType: 'economics',
    coordinates: { longitude: -77.04, latitude: 38.90 },
    timestamp: new Date().toISOString(),
    sourceTimestamp: null,
    metadata: { agency: a.agency_name, budget: a.budget_authority_amount, obligated: a.obligated_amount, venueNote: 'Marker at Washington DC (dataset issuer)' },
  }));
}
