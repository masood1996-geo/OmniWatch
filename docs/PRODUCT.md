# Product & go-to-market

## Positioning

**OmniWatch is the OSINT situational-awareness dashboard you can audit.** Every signal is
labeled with its provider, license, fetch class (live/delayed/static/simulated/disabled),
event time vs fetch time, and a rules-based confidence score. It self-hosts with one command,
persists history, alerts on rules you control, and exposes a documented API.

The category is crowded with map walls; the differentiator is not more dots, it is **trust,
reproducibility, and operational plumbing** (alerting, history, API, audit trail).

## Target segments / ICPs

| Segment | Pain | Why OmniWatch |
|---|---|---|
| Journalists / OSINT researchers | Need citable, timestamped sources; no budget for terminals | Provenance on every event, RSS/API export, self-host, AGPL |
| NGOs / humanitarian logistics | Need hazard + infrastructure picture in regions where cloud SaaS is sensitive | Self-hostable, offline-friendly SQLite, OSM/GDACS/ReliefWeb sources |
| Supply-chain / commodity risk | Chokepoints, strikes, outages, commodity prints | AIS + conflict + economics + outage layers, alert rules, API |
| Security teams / SOC adjacent | Geopolitical context for incidents | Webhook alerts, confidence scoring, audit history |
| Infrastructure operators | Hazards + internet/energy anomalies | IODA, GDACS, NOAA, radiation, alert dedupe |
| Developers / integrators | Need data without a $10k contract | API keys, OpenAPI spec, per-key rate limits |

## Competitive landscape (as of 2026-09)

| Product | Model | Strengths | Gaps OmniWatch exploits |
|---|---|---|---|
| World Monitor (worldmonitor.app) | Free/OSS, very popular | Huge source list, brand reach | Provenance/confidence not first-class; no first-party alerting API |
| OSIRIS (`simplifaisoul/osiris`, MIT) | OSS Next.js/MapLibre dashboard | Clean UI, active | Demo-oriented; limited history/alerting/multi-source health |
| Crucix (`calesthio/Crucix`, AGPL) | OSS upstream of OmniWatch | Broad ingestion catalogue | Mixes static/fallback data; no persistence/alerts/API keys |
| Sovereign_Watch (`d3mocide`, AGPL) | OSS, same niche | Community energy | No provenance model; no alert engine |
| Liveuamap | Commercial | Speed on specific conflicts | Narrow scope; expensive; opaque sourcing |
| Dataminr | Commercial enterprise | Real-time signal detection | Enterprise pricing; closed data |
| osint.watch | Commercial SaaS | Hosted convenience | No self-host; less auditability |

**Defensible wedge:** transparent provenance + confidence, persisted audit history, alert
rules with dedupe, API keys with scopes, and honest disabled-source reporting. These are
boring, sticky features an animated map alone cannot copy in a weekend.

## Pricing (recommended)

| Tier | Price | Contents |
|---|---|---|
| Community (self-host) | Free (AGPL-3.0) | Full app, all unkeyed sources, BYO keys, no support SLA |
| Cloud Pro | $39/mo | Hosted instance, 50k API calls/mo, 30-day history, webhook/Telegram alerts |
| Team | $199/mo | 5 seats, shared rules, 12-month history, SSO-lite (allow-list), priority egress |
| Enterprise / on-prem | From $15k/yr | On-prem or VPC deployment, support SLA, custom adapters, paid-feed integration |

Rationale: the free tier creates distribution (the map is shareable); paid tiers sell
reliability and plumbing, not data. Price against analyst time, not data fees.

## AGPL commercialization strategy

OmniWatch is a derivative of Crucix (AGPL-3.0), so the network-use clause applies: hosted
users must be offered the corresponding source. Strategy:

- Sell **hosting, support, SLAs, and custom integration** — permitted under AGPL.
- Keep the hosted fork's source available at a public URL and link it in the UI (the ticker
  links to the source repository; replace with your deployment's fork).
- **Do not accept external code contributions without a CLA** (or keep contributions in a
  separate, permissively licensed directory) if you plan proprietary forks; otherwise all
  improvements must ship under AGPL.
- Trademark the name/logo if you commercialize; the license does not grant trademark rights.

## Data compliance / licensing matrix (summary)

`live` unkeyed government/agency data (USGS, NOAA, EIA, BLS, Treasury, CISA, WHO, UN, EPA,
USASpending) is generally public-domain or attribution-only. Community/ODbL sources
(adsb.lol, OpenStreetMap/Overpass, PeeringDB) require attribution — OmniWatch stores and
displays it per event. AISStream, OpenSky, GFW, ACLED, Finnhub, FRED, EIA, Cloudflare each
have their own terms; the adapter metadata records the license label so deployments can audit
compliance. Headlines (RSS, GDELT) are shown as title + link only, never republished bodies.
This is an engineering summary, **not legal advice**; counsel review is recommended before
commercial launch.

## Disclaimers (ship these in the UI and docs)

- Not an operational or safety-critical system; do not use as the sole basis for decisions.
- Upstream data may be delayed, incomplete, or wrong; check provenance before acting.
- `simulated` events (alert tests) are synthetic and clearly labeled.
- AIS/military layers show what providers broadcast; absence of a contact is not evidence.

## Launch plan (GTM)

**Assets**
- 60–90 s demo script (below), GIF/screenshot pack, `docs/PRODUCT.md` as the landing page
  source, a live public demo Space with `ADMIN_API_KEY` set and rate limits tuned.
- Comparison table (above) and a "how provenance works" explainer post.

**Channels**
- r/OSINT, r/geopolitics, Hacker News "Show HN: auditable OSINT dashboard", Mastodon/Bluesky
  threads with the provenance angle, GitHub topics (`osint`, `situational-awareness`,
  `maplibre`), newsletter sponsorships (OSINT-focused), conference lightning talks.

**Metrics**
- Activation: % of new self-hosters with ≥1 source `ok` within 10 minutes.
- Retention: weekly active instances pinging a version endpoint (opt-in telemetry later).
- Conversion: demo visitors → Cloud Pro trials; alert rules created per instance.

**30 / 60 / 90**
- 30: harden docs, fix live-source regressions weekly, publish demo + Show HN, collect 20
  self-host reports.
- 60: Cloud Pro waitlist + hosted beta; webhook marketplace recipes (Slack/Discord/Telegram);
  entity dedupe across sources.
- 90: paid launch, on-prem pilot contracts (2+), paid data adapters (Kpler/MarineTraffic) as
  add-ons, uptime SLO and status page.

## 60–90 second demo script

1. Open the dashboard: "Everything you see is provenance-tracked — the badge on each event
   tells you if it is live."
2. Toggle **Sources**: show 49 adapters, several disabled with reasons (no silent failures).
3. Open an earthquake → popup shows provider, license, fetched vs event time, confidence.
4. Filter severity=critical, window=day; show the ticker and the stale banner logic.
5. Create an alert rule (severity≥major, bbox, keywords) and hit "Test channels".
6. `curl /api/events?severity=critical` with an API key → show the OpenAPI-driven API.
7. Close on history: restart the container, show the same events in `/api/history`.
