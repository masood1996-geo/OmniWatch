# Security policy

## Scope and intended use

OmniWatch is situational-awareness software for research and monitoring. It is **not** an
operational, safety-critical, or decision-making system. Do not use it as the sole basis for
safety, navigation, financial, legal, or military decisions. Upstream data can be delayed,
wrong, or unavailable; always check the provenance panel (`fetchClass`, provider, license,
timestamps) before acting on a signal.

## Reporting a vulnerability

Please report suspected vulnerabilities privately:

- Open a GitHub security advisory: `https://github.com/masood1996-geo/OmniWatch/security/advisories/new`
- Or email the maintainer listed in the repository profile.

Include: affected version/commit, reproduction steps, impact, and any suggested fix. Do not
open a public issue for undisclosed vulnerabilities. We aim to acknowledge within 5 business
days.

## What the project does to reduce risk

- Secrets live in environment variables. `.env` files are gitignored and excluded from the
  Hugging Face publisher by a preflight check (`python publish_hf.py --check`).
- Expensive endpoints are rate limited per IP (stricter for `POST /api/chat`).
- `POST /api/sweep`, alert-rule writes, and API-key administration require `ADMIN_API_KEY`
  when it is set; in production they are locked when it is not set.
- Unknown `/api/*` routes return JSON 404 instead of the SPA shell.
- Security headers (nosniff, frame-deny, referrer-policy, permissions-policy, and a CSP in
  production) are applied to all responses.
- CORS is configurable; the default is `*` in development and deny-remote in production.
- API keys are stored as SHA-256 hashes and compared with timing-safe comparison.
- LLM input treats event titles as untrusted content and instructs the model not to follow
  instructions inside them. Prompts are still model input; treat chat output as untrusted.

## Known limitations

- No user accounts or multi-tenancy in this version; the API is protected only by optional
  API keys and an admin key.
- Alert deliveries are best-effort; no retry queue beyond the persisted dedupe state.
- Third-party endpoints and IP-blocking behavior (OpenSky on clouds, Reddit, ReliefWeb 403,
  Overpass timeouts) can change without notice; the UI reports per-source health instead of
  hiding failures.
