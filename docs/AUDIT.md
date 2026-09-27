# OmniWatch Audit — v2 productization

Date: 2026-09-27
Branch: `productize/v2` (based on `master` @ `8da269d`)
Method: static code reading + live HTTP status checks (no values of secrets printed).

## Baseline (pre-change) evidence

| Check | Command (abridged) | Result |
|---|---|---|
| Git state | `git status` | clean, on `master`, up to date with `origin/master` |
| Toolchain | `node -v`, `npm -v` | v24.14.1, 11.11.0 |
| Server install | `npm ci` | exit 0 (3 vulnerabilities) |
| Server typecheck | `npx tsc --noEmit` | exit 0 |
| Server build | `npx tsc` | exit 0, `dist/index.js` produced |
| Client install | `npm ci` | exit 0 (11 vulnerabilities) |
| Client typecheck | `npx tsc --noEmit` | **exit 2** — `page.tsx(603,11): Property 'maplibregl' does not exist` (masked by `typescript.ignoreBuildErrors: true`) |
| Client lint | `npm run lint` | **exit 1** — 4 errors `@typescript-eslint/no-explicit-any` (page.tsx:28,36,590,603), 1 warning unused `err` (page.tsx:224) |
| Client build | `npm run build` | exit 0 — log states "Skipping validation of types" |
| Server boot | `node dist/index.js` | started, initial sweep 8.1 s, 427 signals, 48 source entries |
| `GET /api/events` | curl | 200, 427 events, `gdelt` count=3 (fabricated fallback — GDELT GEO is 404, see below) |
| `GET /api/health` | curl | 200, `adsb:0`, `openaq:0`, `noaa-swpc:0`, `nasa-eonet:0` |
| `GET /api/live-tracking` | curl | 200, 215 tracks = 200 OpenSky aircraft + **15 fabricated chokepoint vessels** |
| `GET /api/delta` | curl | 200, `new:427` (empty previous sweep) |
| `GET /api/stream` | curl -N, 5 s | SSE `connected` frame received |
| `POST /api/chat` | curl | no response body captured within 30 s (LLM unreachable; offline fallback must be verified post-fix) |
| `GET /api/xyz` | curl | **200 text/html** — SPA catch-all answers unknown API routes |
| `POST /api/sweep` | curl (no key) | **200** — unauthenticated |
| Server stderr | log tail | `[USPTO] Error: SyntaxError: Unexpected token '<'` — USPTO endpoint returns HTML |

## Live upstream status checks (2026-09-27, status codes only)

| Endpoint | Code | Meaning for OmniWatch |
|---|---|---|
| `api.adsb.lol/v2/mil` | 200 | correct military endpoint |
| `api.adsb.lol/v2/military` (code uses this) | **503** | C3 confirmed — military layer silently empty |
| GDELT GEO API (http and https) | **404** | I2 confirmed — fake fallback is the *only* path ever taken |
| GDELT DOC 2.0 | 429 | rate-limited at test time; requires backoff, no fake data |
| OpenSky `/states/all` anonymous (small bbox) | 200 | works from residential IP; OAuth2-only for credentials, credit-metered, cloud IPs blocked |
| Reddit `hot.json` | **403** | C5 confirmed |
| Reuters RSS `feeds.reuters.com` | 000 (dead) | C9 confirmed |
| BBC World RSS | 200 | usable |
| NOAA `/alerts/active` (UA + Accept) | 200 | C6 is a geometry bug |
| Safecast measurements | 200 | usable |
| DeepState `history/last` | 200 | usable |
| CelesTrak GP JSON | 200 | usable |
| Polymarket CLOB / Gamma | 200 / 200 | current endpoint works; IDs/parsing still need fixing |

## Findings table

Legend: **CONFIRMED** = reproduced in code and/or live; **REFUTED (part)** = partially incorrect as stated; **FIXED** = resolved on this branch (evidence in `docs/FINAL_REPORT.md`).

### P0 — Data integrity

| ID | Finding | Status | Evidence |
|---|---|---|---|
| I1 | `live-tracking.ts` L79–118 returns 15 hardcoded chokepoint vessels with `Math.random()` drift, labeled `ais-live` "LIVE 10s" | CONFIRMED → FIXED | code read; live-tracking returned `vessels:15` with fabricated data |
| I2 | `gdelt.ts` returns 3 fabricated critical events on failure; random IDs `gdelt-${Date.now()}-${Math.random()}` | CONFIRMED → FIXED | GEO API 404 on http+https, so fallback is always used; `/api/events` `gdelt` count=3 |
| I3a | `osint.ts` fabricated fishing hotspots ("200+ vessels") | CONFIRMED → FIXED | code read L5–31 |
| I3b | `carriers.ts` hardcoded carrier positions presented as recent OSINT | CONFIRMED → FIXED | code read L8–20 |
| I3c | `strategic.ts` curated lists with `new Date().toISOString()` (power/bases/datacenters) | CONFIRMED → FIXED | registry count `mil-bases:20`; code L32–46 etc. |
| I3d | `crucix-security.ts` `fetchEPARadNet` fabricates "status: Normal"; `getStaticWHO` fallback | CONFIRMED → FIXED | code L88–110, L53–58 |
| I3e | `crucix-social.ts` EIA/ACLED/Cloudflare static content presented live; Reddit `.json` (403) | CONFIRMED → FIXED | live Reddit 403; code L70–158 |
| I3f | `sigint.ts` `getStaticKiwiSDR` fallback; `safecast.ts` fabricated CPM/status fallback; `deepstate.ts` present-tense fallback frontline | CONFIRMED → FIXED | code read |
| I3g | `radiation.ts` dead module "Simulating RadMon network feeds"; unused | CONFIRMED → FIXED (deleted) | code read |
| I4 | Adapters set `timestamp: now()` conflating event time with fetch time; delta/UI sort depend on it | CONFIRMED → FIXED | sweep/index code |
| I5 | README claims: one-command install (no root package.json), 48 sources (~20 static/fallback), 37 layers (actual 41), 10-s polling (server 15 s), no keys needed (AIS/FIRMS/FRED/Finnhub-gated), J.A.R.V.I.S "30 data sources" | CONFIRMED → FIXED | `LAYER_DEFS` count programmatically = 41; sweep fetchers = 48; no root package.json |
| I6 | README severity tables disagree with code (USGS: code ≥4 moderate/≥5.5 major vs README 3.0–4.9/5.0–6.9; Express 4.x claimed vs 5.2.1) | CONFIRMED → FIXED | usgs.ts L27–30; server package.json |

### P0 — Security

| ID | Finding | Status | Evidence |
|---|---|---|---|
| S1 | `publish_hf.py` `ignore_patterns` does not exclude `.env`; `private=False` | CONFIRMED → FIXED | code read |
| S2 | `cors({origin:*})`; no rate limiting; `POST /api/sweep` open; `POST /api/chat` free LLM proxy; catch-all HTML 200 for unknown API; no security headers | CONFIRMED → FIXED | `/api/xyz`→200 HTML, `/api/sweep`→200, code read |
| S3 | Secrets hygiene | CONFIRMED CLEAN → hardened | `git log --all --full-history -- "*/.env"` empty; `git ls-files` shows only `omniwatch-server/.env.template`; no secret patterns in tracked files |

### P0 — Build / DevX

| ID | Finding | Status | Evidence |
|---|---|---|---|
| B1 | No root `package.json`; README install one-liner fails; server `npm run start` missing | CONFIRMED → FIXED | repo root listing |
| B2 | Server package has only a failing stub `test` script | CONFIRMED → FIXED | package.json L6–8 |
| B3 | `.env.template` documents unused `OPENAI_API_KEY`; missing OLLAMA_*/FIRMS_MAP_KEY/FRED/OPENSKY/ADMIN_API_KEY; conflicting Ollama defaults | CONFIRMED → FIXED | `.env.template`; `index.ts:164` vs `llm.ts:32`; model `gemma3:27b` vs `gpt-oss:120b` |
| B4 | No `.dockerignore`; single-stage root image; `sed` mutates source; no healthcheck | CONFIRMED → FIXED in files (multi-stage, non-root, healthcheck, no `sed`, `.dockerignore`); **`docker build` not executed in this session — daemon unavailable**, documented in FINAL_REPORT | Dockerfile; `docker build` failed with npipe error |
| B5 | No `LICENSE` file though AGPL-3.0 claimed; attribution prose-only | CONFIRMED → FIXED | repo root listing |

### P1 — Correctness / reliability

| ID | Finding | Status | Evidence |
|---|---|---|---|
| C1 | `enabledLayers.has('flights')` — key is `flight`; live aircraft never render | CONFIRMED → FIXED | page.tsx:627 |
| C2 | Hardcoded `http://localhost:4100` ×4; Docker `sed` fix | CONFIRMED → FIXED | page.tsx:128,147,169,217 |
| C3 | adsb.lol wrong endpoint | CONFIRMED → FIXED | `/v2/military`=503, `/v2/mil`=200 |
| C4 | OpenSky unauthenticated full-world calls + Basic-auth misuse | CONFIRMED → FIXED | opensky.ts L7–15, live-tracking.ts L48 |
| C5 | Reddit `.json` dead on servers | CONFIRMED → FIXED | live 403 |
| C6 | NOAA uses first vertex, not centroid | CONFIRMED → FIXED | noaa.ts L17 |
| C7 | `sweep.ts` parallel-array + index-aligned `sourceNames`; hardcoded 48 | CONFIRMED → FIXED | sweep.ts L122–145 |
| C8 | LLM prompt/code contract mismatch (`flags` vs "array of IDs"); "OpenAI request failed"; literal `<@&CRITICAL_ROLE_ID>`; in-memory `alertDispatched`; early return skips most sweeps | CONFIRMED → FIXED | llm.ts L54–70 |
| C9 | Dead/stale code: `radiation.ts`, `fetchRSSIntel` imported but unused, Reuters dead, NOAA eventType hack, `as any` escapes, `ignoreBuildErrors` | CONFIRMED → FIXED | reads + lint |
| C10 | Null-Island concern | **REFUTED (part)** — marker condition `(lon && lat)` skips exact `{0,0}`; real bug is inverse: valid longitude/latitude `0` points are dropped, and non-geolocated items still show in feed/ticker without location | page.tsx:609; yfinance BTC `{0,0}`, RSS/Reddit/Bluesky |
| C11 | Duplicate fetching: 30 s poll + SSE refetch + 10 s live poll; SSE has no IDs/replay; no stale warning | CONFIRMED → FIXED | page.tsx L137–208 |
| C12 | Up to ~500+ DOM markers, no clustering | CONFIRMED → MITIGATED (marker cap 400 + coordinate dedupe + layer toggles); GeoJSON clustering deferred to the roadmap | `MapView.tsx` `MARKER_CAP` |
| C13 | No tests, no CI; `npm test` fails | CONFIRMED → FIXED | repo listing; package.json |
| C14 | No persistence; restart wipes history | CONFIRMED → FIXED | index.ts in-memory only |

## Repo hygiene evidence

- Tracked `.env*`: only `omniwatch-server/.env.template`.
- `git log --all --full-history -- "*/.env"` → no commits.
- No secret-like patterns (`sk-`, `ghp_`, `AKIA`) in tracked source; package-lock matches are coincidental substrings (e.g. `queue-microtask`).
- `.env` on disk: `omniwatch-server/.env` (untracked, ignored); never printed or modified.

## Rotation checklist (USER ACTION — not executed by the agent)

If `publish_hf.py` was ever run with the current `ignore_patterns`, the public Space may contain
`omniwatch-server/.env`. Rotate and re-provision as HF Space secrets (Settings → Variables and secrets):

1. `OLLAMA_API_KEY` — revoke and regenerate.
2. `AISSTREAM_API_KEY` — revoke and regenerate.
3. `FINNHUB_API_KEY` — revoke and regenerate.
4. `FRED_API_KEY` — revoke and regenerate.
5. Any other key present in `omniwatch-server/.env` (not listed here by value or name beyond those above).
6. Set replacement values only in HF Space secrets and your local `.env`; never commit them.

## Post-fix verification (2026-09-27)

Raw evidence: `docs/FINAL_REPORT.md` and `docs/evidence/sweep-2026-09-27.md`.

- `GET /api/events` → 708/708 events with provenance; counts `{live:685, delayed:23}`.
- `GET /api/adapters` → 49 adapters `{live:32, disabled:15, delayed:2}` in the reference env.
- `POST /api/sweep` → 401 without key, 200 with `x-admin-key`; `/api/xyz` → JSON 404.
- Chat loop → 429 with `Retry-After` after the strict bucket.
- Restart → `/api/history/sweeps` still returns prior sweeps (SQLite).
- `rg "Math.random" omniwatch-server/src/clients` → 0 hits.
- `rg "localhost:4100" omniwatch-client/src` → 0 hits.
- `rg "v2/military" omniwatch-server/src` → 0 hits.
- `python publish_hf.py --check` → exit 0, lists `omniwatch-server/.env` as EXCLUDED.
- Root `npm install && npm run build` → success; `npm test` → 66 passing (60 server + 6 client);
  `npm run typecheck` and `npm run lint` clean; client build now runs real TypeScript validation.

## `as any` inventory (server; client = 0)

Pre-existing database-row/cast patterns were reduced where practical. Remaining `as any` uses
are row-to-type mappings and legacy JSON parses; none are in client code:

- `src/store/history.ts` (row casts), `src/store/api-keys.ts` (row casts),
  `src/alerts/engine.ts` (row casts) — SQLite row objects mapped to typed records.
- `src/clients/fred.ts`, `src/clients/trains.ts` (2), `src/clients/infrastructure.ts`,
  `src/clients/strategic.ts` — legacy provider payload parses.
- Removed on this branch: `crucix-social.ts` Reddit token parse, `economics.ts` Finnhub parse,
  client `page.tsx` casts (client total = 0).

## PREFERRED items deferred (with reasons)

| Item | Reason |
|---|---|
| GeoJSON symbol layers + clustering | Marker cap/dedupe implemented; clustering needs a style/dataset pass and a before/after measurement (roadmap 30 days) |
| Shareable URL state for view/layers/selected event | Layer prefs are persisted in localStorage; URL state deferred as a UX polish item |
| i18n scaffold | Depends on the component extraction landing first (done); scheduled in roadmap 60 days |
| Screenshot/demo assets | Placeholders documented in README; requires a running deployment and capture pass |
| `docker build` end-to-end | Docker daemon unavailable on this host; Dockerfile is written per spec and CI can validate it |

## Execution plan (completed on this branch)

1. ✅ Phase 1 — provenance model + adapter registry, fabrications deleted/live-fixed, delta/dedupe.
2. ✅ Phase 2 — security hardening + `publish_hf.py` preflight.
3. ✅ Phase 3 — root workspace, scripts, env example, multi-stage Dockerfile, CI, tests.
4. ✅ Phase 4 — per-source live modernization with recorded sweep evidence.
5. ✅ Phase 5 — SQLite HistoryStore, alerts engine, API keys, OpenAPI, frontend rework.
6. ✅ Phase 6 — docs, LICENSE/NOTICE, README with computed counts.
7. ✅ Phase 7 — full verification matrix + `docs/FINAL_REPORT.md`.
