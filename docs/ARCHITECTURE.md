# Architecture

```
                       ┌─────────────────────────────────────────────┐
                       │  omniwatch-client (Next.js 16, static)       │
                       │  MapLibre GL · layer panel · provenance UI   │
                       │  J.A.R.V.I.S chat · filters · stale banner   │
                       └───────────────┬─────────────────────────────┘
                                       │ HTTP (relative /api by default) + SSE
                                       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ omniwatch-server (Express 5, TypeScript, CommonJS)                        │
│                                                                           │
│  GET  /api/adapters        registry metadata (49 adapters, fetch classes) │
│  GET  /api/events          latest sweep, filters, provenance counts       │
│  GET  /api/health          per-source health, circuit breaker state       │
│  GET  /api/delta           new / removed / escalated vs previous sweep    │
│  GET  /api/history         paginated SQLite event + sweep history         │
│  GET  /api/stream          SSE sweep push (event ids, keepalive)          │
│  POST /api/chat            LLM chat, stricter rate limit, offline fallback│
│  POST /api/sweep           manual sweep (admin key in production)         │
│  GET  /api/live-tracking   aircraft/vessel snapshot + honest class status │
│  /api/alert-rules*         rules CRUD + channel test (admin for writes)   │
│  /api/admin/keys*          hashed API keys, scopes (admin)                │
└──────────────┬────────────────────────────────────────────────────────────┘
               │
     ┌─────────┴──────────────┬───────────────────────┬────────────────────┐
     ▼                        ▼                       ▼                    ▼
 SweepEngine             HealthTracker            HistoryStore        AlertEngine
 registry of 49          per-source state,        SQLite (better-     rules + persisted
 adapters, per-adapter   consecutive failures,    sqlite3): sweeps,   dedupe; webhook /
 cache by refreshMs,     exponential backoff      events, health,     Telegram / SMTP
 global timeout                                   keys, alerts        channels
     │
     ▼
 normalizeEvent() → EventProvenance → OmniEvent[] → SSE + store + delta
```

## Module boundaries

| Path | Responsibility |
|---|---|
| `src/types.ts` | Shared types: `OmniEvent`, `EventProvenance`, `FetchClass`, `SourceAdapter` |
| `src/config.ts` | Single env config module (one source of truth for defaults) |
| `src/sources/registry.ts` | Adapter catalogue with provenance/license/keys metadata |
| `src/sources/helpers.ts` | Timeout fetch, stable hashing, centroid math, coordinate validation |
| `src/sources/health.ts` | `HealthTracker`: statuses, failure counts, circuit breaker |
| `src/clients/*.ts` | One module per upstream; return raw `OmniEvent[]`, throw on failure |
| `src/pipeline/sweep.ts` | `SweepEngine`: parallel adapters, caching, normalization, listeners |
| `src/pipeline/delta.ts` | Pure diff logic (new/removed/escalated) |
| `src/pipeline/llm.ts` | Optional correlation (Ollama), strict parsers, no fabricated flags |
| `src/store/history.ts` | SQLite persistence, retention, pagination, restart durability |
| `src/store/api-keys.ts` | Hashed API keys, scopes, revoke |
| `src/alerts/*` | Rule matching, persisted dedupe, webhook/Telegram/SMTP channels |
| `src/http/middleware.ts` | CORS, security headers, rate limiting, admin guard, JSON 404 |
| `src/index.ts` | `createApp(deps)` factory (testable) + `main()` bootstrap |
| `scripts/check-sources.ts` | Per-adapter status CLI used for verification evidence |
| `scripts/counts.ts` | Programmatic count verification for docs claims |

## Sweep lifecycle

1. `SweepEngine.run()` iterates the registry.
2. Disabled adapters are skipped (status `disabled`, reason recorded).
3. Open circuits are skipped until their backoff expiry (`3` consecutive failures → 30 s,
   doubling to a 30-minute cap).
4. Adapters within their `refreshMs` window return cached normalized events (no upstream call).
5. Each adapter runs under a 60 s timeout; failures update health, never emit data.
6. `normalizeEvent` attaches provenance and confidence.
7. Optional LLM correlation may escalate severity with a recorded `metadata.correlation`.
8. Listeners fire: SSE broadcast, SQLite record, alert evaluation for first-seen events.

## Frontend

`src/app/page.tsx` is a composition root; UI lives in `src/components/`
(`TopBar`, `FiltersBar`, `LayerPanel`, `StatusPanel`, `LiveFeed`, `JarvisChat`, `Ticker`,
`MapView`) with `src/lib/` for API access, layer definitions, formatting, and types.
The API base is `NEXT_PUBLIC_API_BASE` (empty = same origin); no host is hardcoded.
SSE is the primary update channel with a 60 s fallback poll; live positions poll at 15 s.

## Adding a source

See `docs/DATA_INTEGRITY.md` → "Adding a source (30-minute checklist)".
