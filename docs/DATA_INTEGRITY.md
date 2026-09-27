# Data integrity policy

**Rule zero: OmniWatch never fabricates data and never presents a synthetic value as real.**
This document defines the provenance model that enforces it, the confidence rules, and the
process for adding sources.

## Provenance model

Every event served by `/api/events`, `/api/history`, and the SSE stream carries a
`provenance` object:

| Field | Meaning |
|---|---|
| `fetchClass` | `live` \| `delayed` \| `static` \| `simulated` \| `disabled` |
| `fetchedAt` | When this server fetched the event (ISO 8601) |
| `sourceTimestamp` | Event time reported by the provider, or `null` when the provider has none |
| `provider` | Human-readable provider name |
| `sourceId` | Adapter id from the registry |
| `license` | Provider license/terms label |
| `attribution` | Required attribution text |
| `confidence` | 0–1, rules-based (below) |
| `verifiedAsOf` | For static reference data only |
| `statusNote` | Caveats, e.g. "no coordinates emitted", "sample region" |

`fetchClass` semantics:

- **live** — fetched from the provider during the latest sweep.
- **delayed** — provider data is inherently lagged (CelesTrak TLEs, Yahoo Finance unofficial
  endpoint). The UI badge says DELAYED.
- **static** — reference dataset with an explicit verification date. Hidden by default in the
  UI; never stamped with the current time. (No such layer ships enabled today.)
- **simulated** — synthetic events (only the alert test harness). Hidden by default and
  labeled SIMULATED everywhere.
- **disabled** — the adapter exists but has no credentials/viable endpoint. It emits **zero**
  events and a reason is shown in `/api/health` and the Sources panel.

## Confidence rules

Implemented in `src/pipeline/sweep.ts` (`normalizeEvent`):

```
confidence = adapter.confidence
           - 0.15  if the event is a geo event type but has no coordinates
           - 0.10  if the provider does not supply a source timestamp
clamped to [0, 1], rounded to 2 decimals
```

Base confidences: official agency APIs 0.95–0.98; structured aggregators 0.85–0.9;
community networks (adsb.lol, SatNOGS, KiwiSDR, Safecast) 0.7–0.85; scraped/unofficial and
headline-only sources 0.55–0.7.

Confidence answers "how trustworthy is this observation for its declared source class", not
"how important is this event". Severity is separate and provider-specific.

## What the UI guarantees

- Fetch-class badge on every event in the feed, popup, and status panel.
- "LIVE/DELAYED ONLY" filter is **on by default**; static/simulated events are hidden.
- The Sources panel shows per-source status, last success, latency, consecutive failures,
  circuit state, and the exact reason a source is disabled or failing.
- Non-geolocated events (RSS, GDELT headlines, prediction markets, Bluesky) are shown in the
  feed with "not geolocated" and are never plotted at {0,0}.
- A stale-data banner appears when the last sweep is older than 2.5× the configured refresh
  interval or when the API is unreachable.

## Adding a source (30-minute checklist)

1. Add a client in `src/clients/<id>.ts` that returns `OmniEvent[]`.
   - Throw on failure — never return fabricated or placeholder events.
   - Prefer provider timestamps (`sourceTimestamp`); leave `coordinates: null` when unknown.
   - Stable IDs: hash provider-stable fields (`hashId(title, url, date)`).
2. Register it in `src/sources/registry.ts` with `id`, `tier`, `provider`, `license`,
   `attribution`, `confidence`, `refreshMs`, and `requiresKeys` if applicable.
3. If it is key-gated, add the key name to `.env.example` and the README configuration table.
4. Add a normalizer test in `test/` (stable IDs, no coordinates when unknown, no fallback).
5. Run `npm run check:sources --workspace omniwatch-server` and record the status in
   `docs/evidence/`.
6. Update `docs/DATA_SOURCES.md`.

## Historical integrity incidents (fixed in v2)

The v1 codebase contained fabricated "live" data (fake vessels with `Math.random()` drift,
fake GDELT conflict events, fake radiation statuses, static lists stamped with the current
time). All of it is removed; see `docs/AUDIT.md` findings I1–I3 and the evidence file for the
before/after. The audit trail of what was deliberately deleted is part of the product.
