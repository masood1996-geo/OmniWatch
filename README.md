---
title: OmniWatch
emoji: 🌍
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---
<div align="center">

# OmniWatch

**Provenance-tracked OSINT situational awareness you can audit and self-host.**

Every signal carries its provider, license, fetch class (live/delayed/static/simulated/disabled),
event time vs fetch time, and a rules-based confidence score. When a source has no data, the UI
says so. Nothing is fabricated.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-green?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-66-22c55e?style=for-the-badge)]()
[![Adapters](https://img.shields.io/badge/adapters-49-blueviolet?style=for-the-badge)]()
[![Layers](https://img.shields.io/badge/layers-39-0ea5e9?style=for-the-badge)]()

</div>

---

## What it is

- **49 source adapters** (count verified by `npm run verify:counts`): government hazard and
  economic feeds, marine/aircraft tracking, conflict and sanctions, cyber, health, SIGINT
  stations, and headline feeds.
- **39 toggleable map layers** across 8 tiers, with severity/time/source filters.
- **Provenance on every event** — see `docs/DATA_INTEGRITY.md` for the model and confidence rules.
- **Honest failure states** — disabled sources list the exact reason (missing key, retired API,
  blocked network) in `/api/adapters`, `/api/health`, and the Sources panel.
- **History that survives restart** — SQLite-backed events/sweeps/health with retention and
  pagination (`/api/history`).
- **Alerting that dedupes** — stored rules (severity, keywords, bbox, sources, types) with
  webhook (Discord/Slack-compatible), Telegram, and SMTP channels.
- **A public API** — hashed API keys with `read`/`admin` scopes, per-key rate limits, and an
  OpenAPI 3.1 spec (`docs/openapi.yaml`).

Reference environment (2026-09-27, keys for AIS/Finnhub/FRED present): **32 live / 2 delayed /
15 disabled adapters**, 708 events, 100% with provenance. Full per-source evidence:
`docs/evidence/sweep-2026-09-27.md`.

## Quickstart (one command set, from a clean clone)

```bash
git clone https://github.com/masood1996-geo/OmniWatch.git
cd OmniWatch
npm install
npm run build
npm start            # http://localhost:4100
```

The API server also serves the built dashboard, so relative API calls just work. Keys are
optional; without them, fewer layers have data but every status is explained in the UI.

```bash
cp omniwatch-server/.env.example omniwatch-server/.env   # optional configuration
npm run dev                                              # server with ts-node
npm run dev:client                                       # Next dev server on :3000
npm test                                                 # 60 server + 6 client tests
npm run typecheck && npm run lint
npm run sources                                          # per-adapter live status table
```

### Docker

```bash
docker build -t omniwatch .
docker run --rm -p 7860:7860 --env-file omniwatch-server/.env -v omniwatch-data:/app/server/data omniwatch
# or
docker compose up --build -d
```

See `docs/DEPLOYMENT.md` for Hugging Face Spaces, VPS, TLS, and troubleshooting.

## Provenance model (short version)

```jsonc
{
  "id": "usgs-us6000txyf",
  "source": "usgs",
  "title": "M 4.3 - Iceland region",
  "severity": "moderate",
  "coordinates": { "longitude": -17.22, "latitude": 68.92 },
  "sourceTimestamp": "2026-09-27T10:57:07.641Z",   // provider event time
  "fetchedAt": "2026-09-27T11:44:35.000Z",          // our fetch time
  "provenance": {
    "fetchClass": "live",
    "provider": "USGS Earthquake Hazards Program",
    "license": "Public domain (USGS)",
    "attribution": "USGS Earthquake Hazards Program",
    "confidence": 0.98
  }
}
```

`fetchClass` meanings: `live` (fetched now), `delayed` (inherently lagged), `static`
(reference with `verifiedAsOf`, hidden by default), `simulated` (synthetic; alert tests only),
`disabled` (no data emitted; reason exposed). The dashboard's **LIVE/DELAYED ONLY** filter is
on by default.

## Source status (highlights)

| Adapter | Class | Notes |
|---|---|---|
| usgs, noaa-weather, noaa-swpc, safecast, gdacs volcanoes | live | Keyless agency feeds |
| adsb.lol military aircraft | live | Correct `/v2/mil` endpoint; **ODbL 1.0 attribution** |
| OpenSky flights | key-gated | OAuth2 client credentials only; anonymous mode is credit-metered/blocked on clouds |
| AISStream vessels | key-gated | One managed WebSocket, bounded 10-minute snapshot; never fabricated |
| GDELT | live | DOC 2.0 headlines (no geocoding); GEO API retired |
| CelesTrak satellites | delayed | Positions propagated from TLE elements |
| OSM military bases, PeeringDB data centers | live | ODbL/attribution displayed per event |
| Reddit | disabled without OAuth | `.json` endpoints return 403 since 2026-05-28 |
| GDELT, ReliefWeb, PeeringDB | live, may error | Rate limits/network blocks reported as errors, never faked |

Full matrix: `docs/DATA_SOURCES.md`.

## API (see `docs/openapi.yaml`)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/adapters` | Registry: fetch class, license, missing keys, disabled reasons |
| GET | `/api/events` | Filters: `source`, `severity`, `eventType`, `fetchClass`, `timeRange`, `hideNonLive` |
| GET | `/api/health` | Per-source health, circuit breaker state |
| GET | `/api/delta` | New / removed / escalated vs previous sweep |
| GET | `/api/history` | Paginated stored events (`cursor`, `limit`, filters) |
| GET | `/api/stream` | SSE sweep notifications (event ids + keepalive) |
| GET | `/api/live-tracking` | Aircraft/vessel snapshot + per-class status |
| POST | `/api/chat` | J.A.R.V.I.S (rate limited; offline fallback) |
| POST | `/api/sweep` | Manual sweep (admin key when configured) |
| GET/POST/PUT/DELETE | `/api/alert-rules` | Rules; writes require the admin key |
| GET/POST/DELETE | `/api/admin/keys` | API key issuance (returned once), list, revoke |

```bash
curl -s http://localhost:4100/api/events?severity=critical | jq '.count, .provenanceCounts'
curl -s -X POST http://localhost:4100/api/admin/keys \
     -H "X-Admin-Key: $ADMIN_API_KEY" -H 'Content-Type: application/json' \
     -d '{"name":"partner","scopes":["read"]}'
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4100` | Server port |
| `REFRESH_INTERVAL_MINUTES` | `15` | Sweep cadence |
| `HISTORY_DB_PATH` / `HISTORY_RETENTION_DAYS` | `./data/omniwatch.db` / `30` | Persistence |
| `ADMIN_API_KEY` | _unset_ | Locks sweep/alert/key admin endpoints |
| `CORS_ORIGIN` | dev `*`, prod deny-remote | Allowed origins |
| `RATE_LIMIT_PER_MIN` / `CHAT_RATE_LIMIT_PER_MIN` | `120` / `10` | Token buckets |
| `OLLAMA_HOST` / `OLLAMA_MODEL` / `OLLAMA_API_KEY` | `http://127.0.0.1:11434` / `gemma3:27b` | Chat + correlation |
| `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` / `OPENSKY_BBOX` | _unset_ | Live flights |
| `AISSTREAM_API_KEY` / `AISSTREAM_BBOXES` / `AIS_SNAPSHOT_TTL_MS` | _unset_ | Live vessels |
| `CARRIER_MMSIS` | _unset_ | Verified MMSI list for carrier tracking |
| `FIRMS_MAP_KEY`, `FRED_API_KEY`, `FINNHUB_API_KEY`, `EIA_API_KEY`, `ACLED_API_KEY`+`ACLED_EMAIL`, `CLOUDFLARE_API_TOKEN`, `GFW_API_KEY`, `OPENAQ_API_KEY`, `PATENTSVIEW_API_KEY`, `REDDIT_CLIENT_ID`+`REDDIT_CLIENT_SECRET` | _unset_ | Key-gated sources (each reports `disabled` until set) |
| `ALERT_WEBHOOK_URL` (`DISCORD_WEBHOOK_URL`), `TELEGRAM_BOT_TOKEN`+`TELEGRAM_CHAT_ID`, `SMTP_*`/`ALERT_EMAIL_TO` | _unset_ | Alert delivery channels |

The full, commented list lives in `omniwatch-server/.env.example`.

## Screenshots

> Placeholder: add `docs/assets/dashboard.png` (map + provenance popup), `docs/assets/sources.png`
> (per-source health), and `docs/assets/alerts.png` (rule manager). A 60–90 s demo script is in
> `docs/PRODUCT.md`.

## License, attribution, and source offer

OmniWatch is **AGPL-3.0** (`LICENSE`). It is a derivative work of
[Crucix](https://github.com/calesthio/Crucix) by @calesthio (AGPL-3.0); see `NOTICE` for full
attribution. If you interact with an OmniWatch instance over a network, you are entitled to the
corresponding source of that version; this repository is the reference source and the dashboard
links to it.

Data belongs to its providers. Attribution and license labels travel with every event and are
shown in the UI. Third-party terms apply; this project ships no paid data.

## Disclaimer

Not an operational, safety-critical, or decision-making system. Upstream feeds can be delayed,
wrong, or unavailable. Check provenance before acting. See `SECURITY.md` for the vulnerability
disclosure process.

<div align="center">
<em>Built at the intersection of OSINT, geoscience, and auditable data engineering.</em>
</div>
