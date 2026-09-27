import { describe, expect, it } from 'vitest';
import { normalizeGdeltArticles } from '../src/clients/gdelt';

const payload = {
  articles: [
    { title: 'Military exercise reported', url: 'https://example.com/a', seendate: '20260927T100000Z', domain: 'example.com', language: 'English' },
    { title: 'Ceasefire talks resume', url: 'https://example.com/b', seendate: '20260927T090000Z', domain: 'example.com', language: 'English' },
  ],
};

describe('GDELT normalization', () => {
  it('produces stable deterministic IDs for identical articles', () => {
    const first = normalizeGdeltArticles(payload);
    const second = normalizeGdeltArticles(payload);
    expect(first.map(e => e.id)).toEqual(second.map(e => e.id));
  });

  it('changing only the title produces a different ID', () => {
    const first = normalizeGdeltArticles(payload)[0].id;
    const changed = normalizeGdeltArticles({
      articles: [{ ...payload.articles[0], title: 'Different headline' }],
    })[0].id;
    expect(changed).not.toBe(first);
  });

  it('never emits coordinates (DOC API has no geocoding)', () => {
    const events = normalizeGdeltArticles(payload);
    expect(events.every(e => e.coordinates === null)).toBe(true);
  });

  it('returns [] for an unexpected payload instead of fabricating events', () => {
    expect(normalizeGdeltArticles(null)).toEqual([]);
    expect(normalizeGdeltArticles({})).toEqual([]);
    expect(normalizeGdeltArticles({ articles: 'nope' })).toEqual([]);
  });
});
