# Changelog

## 2.0.0 — 2026-09-27

### Integrity (breaking changes to the event contract)

- Added `provenance` to every event: `fetchClass` (`live|delayed|static|simulated|disabled`),
  `fetchedAt`, `sourceTimestamp`, `provider`, `sourceId`, `license`, `attribution`,
  `confidence`, plus `statusNote`/`verifiedAsOf` where relevant.
- `coordinates` is now nullable; non-geolocated events (headlines, prediction markets) are
  never plotted at {0,0}.
- Removed all fabricated data: fake AIS chokepoint vessels, GDELT fallback events, fishing
  hotspot counts, EPA RadNet "Normal" readings, carrier positions, static WHO/KiwiSDR/
  Safecast/DeepState/Polymarket fallbacks, and the dead `radiation.ts` module.
- Converted curated static datasets to live queries: military bases (OSM Overpass), power
  plants (OSM, opt-in), data centers (PeeringDB); EIA/ACLED/Cloudflare/GFW are key-gated live.
- Replaced the index-aligned sweep arrays with a 49-adapter registry; per-source health and
  a circuit breaker with exponential backoff are exposed at `/api/health` and `/api/adapters`.
- Delta/dedupe now uses stable deterministic IDs and provider timestamps.
- Retired broken feeds with explicit reasons (Reddit `.json` 403, Reuters dead, TinyGS 404,
  Amtrak encrypted payload, GDELT GEO 404 → DOC 2.0 headlines).

### Sources

- OpenSky: OAuth2 client-credentials token cache, bounded bounding-box queries, anonymous
  mode opt-in only.
- AISStream: one managed reconnecting WebSocket with a bounded snapshot TTL; carriers track
  only configured, verified MMSIs.
- GDELT: DOC 2.0 with hash IDs and retries; no fallback events.
- NOAA: polygon centroid + 50-alert cap; NOAA SWPC parser updated to the new payload.
- Reddit: OAuth2-only (disabled without credentials).
- RSS: BBC World, The Guardian, Al Jazeera (verified live).
- Volcanoes via GDACS; internet outages via the current IODA outages API; data centers via
  PeeringDB; PeeringDB/OFAC retry with backoff.

### Product

- SQLite (better-sqlite3) `HistoryStore`: sweeps, events, source health, retention,
  pagination (`/api/history`), restart durability.
- Alert engine: stored rules, persisted dedupe (one alert per rule/event/channel), generic
  webhook (Discord/Slack compatible), Telegram, SMTP; local test endpoint.
- API keys: hashed storage, `read`/`admin` scopes, per-key rate limiting, admin issuance.
- OpenAPI 3.1 spec (`docs/openapi.yaml`).
- Frontend: components extracted, provenance badges + legend, default live/delayed-only
  filter, severity/time/source filters, stale-data banner, responsive <900px, runtime API
  base (`NEXT_PUBLIC_API_BASE`), marker cap; `flights`/`flight` bug fixed.

### Security

- `publish_hf.py --check` preflight refuses to upload non-template `.env` files and scans for
  hardcoded secrets.
- Server: configurable CORS, per-IP token-bucket rate limiting (stricter for chat),
  `ADMIN_API_KEY` guard, JSON 404 for unknown API routes, security headers, body limits,
  SSE client cap.
- `SECURITY.md` with disclosure process and scope.

### Build / DevX

- Root npm workspace with `install/build/start/dev/test/lint/typecheck/sources` scripts.
- Server scripts (`dev/build/start/typecheck/test/check:sources/verify:counts`); client
  `typecheck`/`test`.
- Multi-stage Dockerfile (non-root, no source mutation, healthcheck) + `docker-compose.yml`
  + `.dockerignore`.
- GitHub Actions CI: install, typecheck, lint, tests, build, integrity greps, secret preflight.
- `.env.example` replaces the stale `.env.template`.
- 60 server tests + 6 client tests; `typescript.ignoreBuildErrors` removed.

### Licensing

- Added `LICENSE` (full AGPL-3.0) and `NOTICE` with upstream Crucix attribution and the
  network-use source offer; UI ticker links to the source.

### Breaking API notes

- `/api/events` events include `provenance`; `coordinates` may be `null`; `/api/events`
  response now includes `refreshIntervalMs` and `provenanceCounts`.
- `/api/health` now includes `sourceHealth`, `totalSources`, `liveSources`,
  `disabledSources`, `errorSources`; `sweepDurationMs` is retained.
- `/api/live-tracking` adds `status` with per-class fetch class and notes.
- New routes: `/api/adapters`, `/api/history*`, `/api/alert-rules*`, `/api/admin/keys*`.
