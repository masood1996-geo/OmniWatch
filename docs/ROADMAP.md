# Roadmap

## Done in v2 (2026-09-27)

- Provenance model (`fetchClass`, fetched vs event time, provider/license/attribution,
  confidence) on every event, API and UI.
- All fabricated/static-as-live data removed or converted to live queries; disabled sources
  report reasons instead of silence.
- Registry-driven sweep with per-source health, caching by refresh interval, and a circuit
  breaker with exponential backoff.
- SQLite history (sweeps/events/health) with retention, pagination, restart durability.
- Alert rules + persisted dedupe + webhook/Telegram/SMTP channels + local test harness.
- Hashed API keys with scopes and per-key rate limiting; OpenAPI 3.1 spec.
- Security: configurable CORS, rate limits, admin key, JSON 404, security headers,
  `publish_hf.py --check` preflight.
- Reproducible builds: npm workspaces at the root, multi-stage Dockerfile, Compose, CI.
- 66 automated tests (60 server + 6 client) and a source-check CLI.

## 30 days

- Entity resolution across sources (same quake/fire reported by multiple adapters).
- SSE replay buffer (short ring) so reconnects do not need a full refetch.
- Clustering/marker virtualization for >300 points (measure before/after).
- Paid-feed adapter stubs (Kpler, MarineTraffic, ADS-B Exchange) behind env keys.
- Uptime/status page recipe; opt-in anonymous instance telemetry endpoint.

## 60 days

- Hosted Cloud Pro beta: multi-instance, per-tenant API keys, managed Postgres option.
- Alert rule UI improvements (map-drawn bbox, rule dry-run against history).
- Digest schedules (hourly/daily rollups) and Slack app packaging.
- i18n scaffold (en/es/uk/ar) on top of the extracted components.
- Threat-model review and third-party dependency audit cadence.

## 90 days

- On-prem contracts and support tooling (config export/import, air-gapped install docs).
- Mobile-friendly PWA pass and shareable deep links for events/rules.
- Data-quality scorecards: per-source lag distributions, error budgets, weekly evidence file.
- Marketplace of alert recipes and source adapters with a contribution guide (CLA required
  for proprietary forks).
