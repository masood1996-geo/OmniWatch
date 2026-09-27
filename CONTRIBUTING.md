# Contributing

Thanks for helping make OmniWatch more auditable.

## Ground rules

1. **Never fabricate data.** No mocked/simulated/stale value may be presented as live. If a
   source cannot be fetched, throw; the health panel will show the failure.
2. Every new event-producing adapter must carry provider, license, attribution, a fetch class,
   and stable IDs. See `docs/DATA_INTEGRITY.md`.
3. Never weaken validation, rate limits, or security checks to make CI pass.
4. Keep the "shadowbroker" dark aesthetic; changes should improve honesty and usability.

## Setup

```bash
git clone https://github.com/masood1996-geo/OmniWatch.git
cd OmniWatch
npm install          # npm workspaces: server + client
npm run typecheck
npm run test
npm run lint
npm run build
```

Run the server: `npm run dev` (from the repo root) with `omniwatch-server/.env` copied from
`.env.example`. Run the client dev server separately: `npm run dev:client`.

## Before opening a PR

```bash
npm run typecheck && npm run lint && npm run test && npm run build
npm run sources      # per-adapter status; attach notable changes to docs/evidence/
python publish_hf.py --check
```

- Add tests for behavior changes (normalizers, delta, provenance, rate limiting, alerts).
- Update `docs/DATA_SOURCES.md` and `.env.example` when adding/changing a source.
- Do not commit `.env`, keys, tokens, or generated artifacts (`out/`, `dist/`, `data/`).

## Licensing and a CLA

OmniWatch is AGPL-3.0 (derivative of Crucix). By contributing you agree your contribution is
licensed under AGPL-3.0. If the maintainers plan to offer proprietary forks or dual
licensing, external contributions require a signed Contributor License Agreement; open an
issue first to coordinate.

## Reporting bugs

Include: version/commit, environment (OS, Node), the affected source id from
`GET /api/adapters`, the exact request, and the response/status. For security issues follow
`SECURITY.md` instead of opening a public issue.
