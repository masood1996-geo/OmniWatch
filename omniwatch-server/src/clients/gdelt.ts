import { fetchJson, hashId, toIso } from '../sources/helpers';
import type { OmniEvent } from '../types';

const DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const QUERY = '(military OR conflict OR attack OR troops) sourcelang:english';

export function parseGdeltDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!match) return toIso(value);
  const [, y, mo, d, h, mi, s] = match;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeGdeltArticles(payload: any): OmniEvent[] {
  const articles = payload?.articles;
  if (!Array.isArray(articles)) return [];
  const events: OmniEvent[] = [];
  for (const article of articles) {
    const title = String(article?.title || '').trim();
    const url = String(article?.url || '').trim();
    if (!title || !url) continue;
    const seendate = parseGdeltDate(article?.seendate) || new Date().toISOString();
    events.push({
      id: `gdelt-${hashId(title, url, seendate)}`,
      source: 'gdelt',
      title,
      severity: 'moderate',
      eventType: 'conflict',
      coordinates: null,
      timestamp: seendate,
      sourceTimestamp: seendate,
      metadata: {
        url,
        domain: article?.domain,
        language: article?.language,
        note: 'GDELT DOC 2.0 article; no geocoding available from this endpoint',
      },
    });
  }
  return events;
}

export async function fetchConflictEvents(): Promise<OmniEvent[]> {
  const url = `${DOC_API}?query=${encodeURIComponent(QUERY)}&mode=artlist&maxrecords=50&format=json&sort=datedesc`;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const payload = await fetchJson<any>(url, {}, 12000);
      return normalizeGdeltArticles(payload);
    } catch (err) {
      lastError = err as Error;
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error(`GDELT DOC API unavailable after retries: ${lastError?.message || 'unknown error'}`);
}
