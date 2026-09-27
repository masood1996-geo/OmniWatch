# Deployment

## Prerequisites

- Node.js >= 22 (Docker image uses `node:22-slim`), npm 10+
- Optional: Docker + Compose for containers; Python 3 only for `publish_hf.py`

## Local development (two terminals)

```bash
# terminal 1 — API + sweep engine (http://localhost:4100)
cd omniwatch-server
cp .env.example .env        # optional; fill in keys you have
npm install
npm run dev

# terminal 2 — Next dev server (http://localhost:3000)
cd omniwatch-client
npm install
# point the browser at the API
echo "NEXT_PUBLIC_API_BASE=http://localhost:4100" > .env.local
npm run dev
```

## Single-command production build (repo root, npm workspaces)

```bash
npm install
npm run build        # builds client static export, then server (tsc)
npm start            # serves API + built client on http://localhost:4100
```

`npm start` serves `omniwatch-client/out` from the API server, so the default relative API
base works with no configuration.

## Environment

All variables are optional. Without a key, a source is reported as `disabled` with the reason
in `/api/adapters` and the Sources panel — nothing is faked. Full list with comments:
`omniwatch-server/.env.example`.

Defaults include: `PORT=4100`, `REFRESH_INTERVAL_MINUTES=15`, `HISTORY_DB_PATH=./data/omniwatch.db`,
`HISTORY_RETENTION_DAYS=30`, `RATE_LIMIT_PER_MIN=120`, `CHAT_RATE_LIMIT_PER_MIN=10`,
`OLLAMA_HOST=http://127.0.0.1:11434`, `OLLAMA_MODEL=gemma3:27b`.
`CORS_ORIGIN` defaults to `*` in development and deny-remote in production.

Security-related variables: `ADMIN_API_KEY` (required to unlock `POST /api/sweep`, alert rule
writes, and key administration; in production those endpoints are locked when it is unset),
`REQUIRE_API_KEY`, `TRUST_PROXY=1` behind a reverse proxy.

## Docker

```bash
docker build -t omniwatch .
docker run --rm -p 7860:7860 --env-file omniwatch-server/.env \
  -v omniwatch-data:/app/server/data omniwatch
```

- Multi-stage build: client export → server `tsc` → slim runtime as non-root `node` user.
- No source mutation during build; API base is a build arg (`NEXT_PUBLIC_API_BASE`, empty =
  same origin).
- Healthcheck hits `/api/health` with Node's built-in fetch.
- History DB lives in `/app/server/data`; mount a volume to persist it.

Compose (recommended for self-hosting):

```bash
docker compose up --build -d
docker compose logs -f omniwatch
```

`docker-compose.yml` wires the env file, a named volume for the DB, and the healthcheck.

## Hugging Face Spaces (Docker SDK)

> **Constraints observed 2026-09-27 (verify current policy):**
> - Docker Spaces on free `cpu-basic` now return **402 Payment Required** ("hosting Gradio and
>   Docker Spaces on free cpu-basic requires a PRO subscription") when (re)creating.
> - A Space can be **paused with `errorMessage: "Flagged as abusive"`**; restart then returns
>   **503**. This is an account/Space moderation or billing state resolved only through Space
>   settings or Hugging Face support — not fixable in the repository.
> - Never upload `node_modules`/build output. `publish_hf.py` preflights for `.env` files and
>   asserts `node_modules` never enters the upload; a first version of the script leaked local
>   `node_modules` (root paths were not matched by `**/node_modules/**` in `fnmatch`), which was
>   cleaned with `delete_patterns`.
> - `publish_hf.py` now prints the runtime stage after upload and exits non-zero when the Space
>   is not RUNNING.
>
> Alternatives if HF cannot host it: Docker Compose on a VPS, Fly.io/Render, or the GitHub
> release artifacts. The app is self-contained and needs one port plus a data volume.

1. Create a Docker Space; its README front-matter already contains `sdk: docker` and
   `app_port: 7860`.
2. **Never upload `.env`.** The publisher refuses to run when secrets would be included:

   ```bash
   python publish_hf.py --check   # exits 0 and lists .env files as excluded
   python publish_hf.py           # uploads (requires a HF token via browser login)
   ```

3. Configure keys in **Space → Settings → Variables and secrets** (they become container
   env vars). At minimum, set `ADMIN_API_KEY` for a public deployment.
4. Cloud IP caution: OpenSky may block hyperscaler ranges (use OAuth2 credentials or accept
   the disabled status), and Reddit/ReliefWeb may reject datacenter IPs.

If the Space was ever published before this hardening, rotate any keys that may have been
uploaded — see the rotation checklist in `docs/AUDIT.md`.

## VPS (systemd sketch)

```
[Unit]
Description=OmniWatch
After=network.target

[Service]
WorkingDirectory=/opt/omniwatch/omniwatch-server
EnvironmentFile=/opt/omniwatch/omniwatch-server/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
User=omniwatch

[Install]
WantedBy=multi-user.target
```

Put Caddy/nginx in front for TLS, set `TRUST_PROXY=1`, and set `CORS_ORIGIN` to your
dashboard origin if it is served separately.

## Troubleshooting

| Symptom | Check |
|---|---|
| `/api/health` shows `totalSignals: 0` | Initial sweep may still be running (~60 s max); inspect `sourceHealth` reasons |
| Everything disabled | Missing keys; open Sources panel in the UI for exact reasons |
| Aircraft layer empty | OpenSky needs `OPENSKY_CLIENT_ID/SECRET`; cloud IPs are often blocked |
| Vessels empty | `AISSTREAM_API_KEY` missing or WebSocket blocked by egress rules |
| History empty after restart | `HISTORY_DB_PATH` must point at a writable, persistent volume |
| 429 on chat | Expected: `CHAT_RATE_LIMIT_PER_MIN` (default 10); `Retry-After` header is set |
| Admin endpoints 503 | Set `ADMIN_API_KEY` (locked intentionally in production without it) |
