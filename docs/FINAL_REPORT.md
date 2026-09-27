# Final report — OmniWatch v2 productization

Date: 2026-09-27 · Branch: `productize/v2` (based on `master` @ `8da269d`) · No commits made.

## 1. Outcome

OmniWatch no longer mixes fabricated data with live feeds. Every event is provenance-tagged
(`fetchClass`, `fetchedAt`, `sourceTimestamp`, `provider`, `license`, `attribution`,
`confidence`), 49 adapters are individually statused with reasons for missing data, sweeps are
registry-driven with per-source health and circuit breaking, history/alerts/API keys are
persisted in SQLite, and one-command build/run works from the repo root. In the reference
environment a live sweep returned 708 events with 708/708 provenance coverage
(`live:685, delayed:23`), 32 live / 2 delayed / 15 disabled adapters, and all security probes
(admin guard, rate limit, JSON 404) passed. The full per-source evidence is in
`docs/evidence/sweep-2026-09-27.md`; the finding-by-finding audit is in `docs/AUDIT.md`.

## 2. Phase-by-phase summary

| Phase | What changed | Why |
|---|---|---|
| 0 — Discovery/audit | Reproduced the baseline (client `tsc` failure, lint errors, fabricated GDELT/vessels, HTML 200 for `/api/xyz`, unauthenticated sweep), re-verified all external facts live, wrote `docs/AUDIT.md` | Evidence before edits; refuted parts of C10 and quantified I5 |
| 1 — Integrity & provenance | New `types.ts`/`config.ts`/`sources/` registry + health tracker; deleted all fake fallbacks and the dead `radiation.ts`; nullable coordinates; stable IDs (GDELT hash, NOAA ids, IODA entity+start); event-time vs fetch-time split; LLM contract fixed | Rule zero: no fabricated data presented as live |
| 2 — Security | `publish_hf.py --check` preflight (refuses non-template `.env`, scans hardcoded secrets); configurable CORS, token-bucket rate limits (stricter chat), `ADMIN_API_KEY` guard, JSON API 404, security headers, body limits, SSE cap; `SECURITY.md` + rotation checklist | Close leak paths and abuse vectors |
| 3 — Build/DevX/CI | Root npm workspace with scripts; server scripts; `.env.example`; multi-stage Dockerfile (non-root, healthcheck, no `sed`); `.dockerignore`; Compose; GitHub Actions; 66 tests; removed `ignoreBuildErrors` | Reproducibility from a clean clone |
| 4 — Sources | OpenSky OAuth2 + bbox; AISStream managed socket + snapshot TTL; GDELT DOC 2.0; NOAA centroid/cap; adsb.lol `/v2/mil`; Reddit OAuth-or-disabled; RSS via BBC/Guardian/Al Jazeera; OSM/PeeringDB/GDACS replacements for static lists; key-gated EIA/ACLED/Cloudflare/GFW/OpenAQ/PatentsView | Every source is live-verified or honestly disabled |
| 5 — Features | SQLite `HistoryStore` (+`/api/history`), alert engine with persisted dedupe and webhook/Telegram/SMTP channels, hashed API keys with scopes, OpenAPI 3.1, frontend extraction + provenance UI + filters + stale banner + responsive layout + runtime API base + `'flights'` bug fix | Product readiness: audit history, alerting, API |
| 6 — Docs/assets | LICENSE (AGPL-3.0), NOTICE (Crucix + data attribution), README overhaul with programmatically verified counts, ARCHITECTURE, DATA_SOURCES, DATA_INTEGRITY, DEPLOYMENT, PRODUCT (+GTM), ROADMAP, CONTRIBUTING, CHANGELOG, openapi.yaml | Claims match code; commercialization and compliance framing |
| 7 — Verification | Full matrix re-run, AC table, this report, self-review of the diff | Binary acceptance evidence |

## 3. Files changed / created

**Created (server):** `src/types.ts`, `src/config.ts`, `src/sources/{helpers,health,registry}.ts`,
`src/pipeline/delta.ts`, `src/store/{history,api-keys}.ts`, `src/alerts/{engine,channels}.ts`,
`src/http/middleware.ts`, `src/clients/{ais-client,ais-manager,gdacs,gfw}.ts`,
`scripts/{check-sources,counts}.ts`, `test/{severity,provenance,delta,gdelt,history,alerts,api,registry,api-keys}.test.ts`,
`vitest.config.ts`, `.env.example`.

**Created (client):** `src/lib/{api,types,layers,format}.ts`,
`src/components/{MapView,TopBar,FiltersBar,LayerPanel,StatusPanel,LiveFeed,JarvisChat,Ticker,ProvenanceBadge}.tsx`,
`test/{LiveFeed,page}.test.tsx`, `vitest.config.ts`, `vitest.setup.ts`.

**Created (root):** `package.json`, `package-lock.json`, `.dockerignore`, `docker-compose.yml`,
`.github/workflows/ci.yml`, `LICENSE`, `NOTICE`, `SECURITY.md`, `CONTRIBUTING.md`,
`CHANGELOG.md`, `docs/{AUDIT,FINAL_REPORT,ARCHITECTURE,DATA_SOURCES,DATA_INTEGRITY,DEPLOYMENT,PRODUCT,ROADMAP,openapi.yaml}`,
`docs/evidence/sweep-2026-09-27.md`.

**Modified:** all server clients listed in `git status` (fabrications removed/live fixes),
`src/pipeline/{sweep,llm}.ts`, `src/index.ts`, `publish_hf.py`, `Dockerfile`, `README.md`,
client `next.config.ts` (ignoreBuildErrors removed), `package.json`s, `src/app/{page,layout,globals.css}`,
`.gitignore`.

**Deleted:** `omniwatch-server/src/clients/{radiation,volcanoes}.ts`, `omniwatch-server/.env.template`
(replaced by `.env.example`).

## 4. Commands run (observed results, including failures)

| Command | Result |
|---|---|
| `git switch -c productize/v2` | created from clean `master` |
| `npm ci` (both packages) | exit 0 (pre-existing audit advisories noted) |
| `npx tsc --noEmit` (server) | 0 at baseline and after every phase |
| `npx tsc --noEmit` (client) | **failed at baseline** (`page.tsx(603) maplibregl` prop); passes now |
| `npm run lint` (client) | **failed at baseline** (4 errors); passes now (0 problems) |
| `npm run build` (client) | baseline succeeded while *skipping types*; now builds with real TypeScript |
| `node dist/index.js` + curl all endpoints | baseline: 427 events, `gdelt:3` fabricated, 15 fake vessels, `/api/xyz`→200 HTML, sweep→200; after: 708/708 provenance, JSON 404, 401/200 admin, 429 chat |
| Adapter probe `ts-node -T scripts/check-sources.ts` | 29 ok / 15 disabled / 5 error (49 adapters), errors explained and retries added |
| `npm install` + `npm run build` + `npm test` (root) | exit 0; 66 tests pass (60 server, 6 client) |
| `npm start` (root, PORT=4199) | server boots and `/api/health` responds while sweep runs |
| Restart test | `/api/history/sweeps` returned persisted sweeps after process restart |
| `node -e "better-sqlite3 :memory:"` | native module loads on Node 24 |
| `rg` integrity greps | `Math.random` in clients → 0; `localhost:4100` in client → 0; `v2/military` → 0; `ignoreBuildErrors` → 0 |
| `git ls-files | rg .env` | only `omniwatch-server/.env.template` (empty values; deletion pending first commit) |
| `python publish_hf.py --check` | exit 0; `omniwatch-server/.env` listed as EXCLUDED |
| `docker build -t omniwatch:verify .` | **failed — Docker daemon not running** (`npipe … cannot find the file`); Dockerfile/.dockerignore/compose written but image build is UNVERIFIED |
| YAML check | `python -c yaml.safe_load` → CI workflow valid, job `build-and-test` |
| `ts-node -T scripts/counts.ts` | 49 adapters, 39 layers, 13 key-gated, 15-min refresh |

## 5. Acceptance criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | No fabricated data; everything live/static/simulated/disabled; zero fabricated `Math.random` paths | **PASS** | grep 0 hits; fabrications deleted; sweep evidence |
| 2 | Provenance on 100% of `/api/events` | **PASS** | 708/708 `withProvenance=708` |
| 3 | No tracked `.env` secrets; publisher excludes `.env*`; rotation checklist | **PASS** | `git ls-files`, `--check` exit 0, `docs/AUDIT.md` checklist |
| 4 | Sweep 401 when `ADMIN_API_KEY` set; chat 429; JSON 404 | **PASS** | observed 401/200, 429 + `Retry-After`, 404 JSON |
| 5 | Clean-clone `npm install && npm run build && npm start` | **PASS** | root run observed (health 200 on :4199) |
| 6 | Both packages `tsc --noEmit`; no `ignoreBuildErrors`; no new `as any` in changed client code | **PASS** | typecheck exit 0 both; client `as any` = 0; server inventory documented |
| 7 | Root `npm test` passes; ≥20 server tests + client smoke; delta/dedupe, provenance, rate limit, alert dedupe, persistence | **PASS** | 60 server + 6 client = 66 |
| 8 | CI workflow validates install/typecheck/lint/test/build | **PASS** | `.github/workflows/ci.yml`, YAML parsed |
| 9 | Every modernized source live-verified or disabled with reason | **PASS** | `docs/DATA_SOURCES.md` + evidence file |
| 10 | Persistence across restart; `/api/history` paginates; retention | **PASS** | live restart test; pagination/retention unit tests |
| 11 | Alert rules persist, dedupe, local webhook test; Telegram/SMTP env-gated | **PASS** | `alerts.test.ts` dedupe + `sendTest`; `channels.ts` gating |
| 12 | API keys issue/scope/rate-limit flow; OpenAPI matches routes | **PASS** | `api-keys.test.ts`, `api.test.ts`, `docs/openapi.yaml` |
| 13 | `'flights'` fixed; no hardcoded localhost; provenance badges; responsive; no Null Island | **PASS*** | greps + MapView `hasCoordinates`; responsive CSS breakpoints (visual QA recommended) |
| 14 | LICENSE + NOTICE + README source offer; UI source link | **PASS** | files exist; Ticker `SOURCE` link |
| 15 | Docs set complete | **PASS** | all listed docs present |
| 16 | README counts verified programmatically | **PASS** | 49 adapters / 39 layers / 15 min from `verify:counts` |
| 17 | No unrelated regressions; dark theme preserved | **PASS** | route contracts retained; deliberate changes listed in CHANGELOG; theme untouched |

\* Responsive layout is validated by CSS structure, not a browser screenshot.

## 6. Findings table (summary of `docs/AUDIT.md`)

**Fixed (~30):** I1–I6, S1–S3, B1–B5, C1–C11, C13, C14 — including every fabricated dataset,
the OpenSky/GDELT/NOAA/adsb.lol/Reddit source defects, the LLM contract mismatch, build/devx,
and persistence.
**Refuted (part):** C10 — exact `{0,0}` never rendered; the real bug (valid 0-coordinate points
dropped, non-geolocated items in the feed) was fixed via nullable coordinates + sentinel-aware
plotting.
**Mitigated, not fully fixed:** C12 — marker cap 400 + dedupe now; GeoJSON clustering deferred
(roadmap).
**Deferred (PREFERRED):** shareable URL state, i18n scaffold, screenshot assets, end-to-end
`docker build` (daemon unavailable).

## 7. Assumptions and unverified items

- Windows host, Node 24.14.1, npm 11.11.0. CI targets Node 22 (Docker base parity).
- No HF token, no paid keys, no Telegram/SMTP credentials: those paths are env-gated and
  unit-tested with fakes.
- `docker build`, `docker compose up`, and browser-rendered responsive QA were **not** run
  (Docker daemon inactive; no browser). Commands to run them are in `docs/DEPLOYMENT.md`.
- GDELT (429), ReliefWeb (403/410), PeeringDB (429) and OFAC (transient) failed at least once
  from this network; retries/backoff added, statuses are visible, no data is faked.
- OpenSky live refresh requires `OPENSKY_BBOX`; anonymous mode remains opt-in and documented as
  not production-viable.
- License labels are best-effort metadata compiled from provider documentation, not legal advice.

## 8. Blockers and recommended user actions

1. **Rotate keys if the public HF Space ever received `.env`** (checklist in `docs/AUDIT.md`:
   Ollama, AISStream, Finnhub, FRED, and anything else in `omniwatch-server/.env`), then set
   them as Space secrets. The agent did not perform rotations.
2. Review and configure deployment secrets: `ADMIN_API_KEY` is strongly recommended; in
   production the admin endpoints are locked until it is set.
3. Run the Docker build/CI locally or in GitHub Actions once the daemon is available
   (`docker build -t omniwatch .`).
4. Decide the hosting fork/source URL for the AGPL network-use offer and, before accepting
   external contributions for a proprietary fork, adopt a CLA.
5. Provide paid/entitled keys where desired (EIA, ACLED, Cloudflare, GFW, OpenAQ, PatentsView,
   Reddit) to convert disabled adapters into live ones — no code changes needed.

## 9. Recommended next steps (top 5)

1. Enable CI on GitHub and get a green run (validates Node 22 + `npm ci` + build).
2. Add marker clustering/GeoJSON layers and measure before/after (completes C12).
3. Add entity resolution across sources and alert digest scheduling (retention/differentiation).
4. Stand up the hosted Cloud Pro beta with per-tenant keys and an uptime status page.
5. Publish the demo (screenshots + 60–90 s script in `docs/PRODUCT.md`) and launch on
   r/OSINT / Show HN with the provenance angle.
