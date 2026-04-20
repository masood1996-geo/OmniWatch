<div align="center">

**Stop juggling disconnected OSINT feeds.** 
OmniWatch fuses USGS Earthquakes, NASA Wildfires, Military Aircraft (ADS-B), Maritime Vessels (AIS), GDELT Conflict Events, and 43 other sources into one real-time dashboard with an AI-powered correlation engine — all self-hosted, all open source.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-green?style=for-the-badge)](LICENSE)
[![AI Powered](https://img.shields.io/badge/J.A.R.V.I.S-AI%20Terminal-FF6F00?style=for-the-badge&logo=ollama&logoColor=white)]()
[![Data Sources](https://img.shields.io/badge/Sources-48%20Data%20APIs-blueviolet?style=for-the-badge)]()
[![Live Demo](https://img.shields.io/badge/%F0%9F%A4%97_Demo-Live_on_HuggingFace-orange?style=for-the-badge)](https://huggingface.co/spaces/masood1996/omniwatch)

---

```
   ██████╗ ███╗   ███╗███╗   ██╗██╗██╗    ██╗ █████╗ ████████╗██████╗ ██╗  ██╗
  ██╔═══██╗████╗ ████║████╗  ██║██║██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
  ██║   ██║██╔████╔██║██╔██╗ ██║██║██║ █╗ ██║███████║   ██║   ██║     ███████║
  ██║   ██║██║╚██╔╝██║██║╚██╗██║██║██║███╗██║██╔══██║   ██║   ██║     ██╔══██║
  ╚██████╔╝██║ ╚═╝ ██║██║ ╚████║██║╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║
   ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝
                      Global Intelligence & Tracking Platform
```

</div>
---

## 🎮 Try it Live
> **No installation needed — [try the live demo on Hugging Face](https://huggingface.co/spaces/masood1996/omniwatch)**
>
> Real-time monitoring of global infrastructure, transport, natural hazards, and conflicts with an AI correlation engine — updated continuously.

---

Commercial OSINT and threat-intelligence platforms are heavily gated and charge enterprise fees for what OmniWatch does for free. The difference:

| Commercial Platforms | OmniWatch |
|---------------------|-----------|
| ❌ Expensive enterprise API licenses | ✅ **100% free** — AGPL-3.0 license |
| ❌ Proprietary, closed data | ✅ Public government & OSINT APIs, full transparency |
| ❌ Disconnected specialized tools | ✅ **48 sources unified** in one schema |
| ❌ Static geospatial analysis | ✅ **Live tracking** (10-second polling for aircraft & vessels) |
| ❌ Human analysts required to correlate | ✅ **AI-powered J.A.R.V.I.S** correlates data |
| ❌ Pondersome enterprise deployment | ✅ **One command** to install and run |
| ❌ Pre-determined dashboards |  ✅ **37 toggleable layers** with 5 visual modes |

---

## ⚡ One-Line Install

```bash
git clone https://github.com/masood1996-geo/OmniWatch.git && cd OmniWatch && npm install && npm run build
```

Then start the server:
```bash
cd omniwatch-server && npm run start
```

> **No API keys needed to start!** The vast majority of tracked services (USGS, AIS, OpenSky, SatNOGS, and GDELT) operate completely open and require zero keys out of the box.

<details>
<summary><strong>Manual Setup & Development</strong></summary>

```bash
git clone https://github.com/masood1996-geo/OmniWatch.git
cd OmniWatch

# Server
cd omniwatch-server
npm install
cp .env.template .env # Edit with your API keys for increased rate limits (optional)
npx ts-node src/index.ts

# Client
cd ../omniwatch-client
npm install
npm run dev           # → http://localhost:3000
```

</details>

### Where to Get API Keys (Optional)

| Key | Free? | Link | What It Enables |
|-----|-------|------|-----------------|
| **Ollama Local/Cloud** | ✅ Free | [Ollama](https://ollama.com/) | Powers the J.A.R.V.I.S Terminal |
| **OpenSky API** | ✅ Free | [OpenSky](https://opensky-network.org/) | Higher rate limits for military flight tracking |
| **Finnhub Key** | ✅ Free tier | [Finnhub](https://finnhub.io) | Market volatility & economic data |

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🌍 **48-Source Aggregation** | Merges 8 tiers of intelligence: Environment, Military, Maritime, Economics, Security, Health, Social, and SIGINT. |
| 📊 **Unified Schema** | Heterogeneous global data normalized into `OmniEvent` for unified plotting and map interaction |
| 🔴 **Real-Time Streaming** | Server-Sent Events push live sweeps instantly to the dashboard, including high-frequency polling for planes/ships |
| 🤖 **J.A.R.V.I.S Terminal** | Integrated Ollama-powered AI chat agent that automatically parses active critical signals |
| 🗺️ **Interactive Multi-Mode Map** | React MapLibre GL instance with 37 toggleable layers and 5 map styles (Standard, Satellite, FLIR, NVG, CRT) |
| 📈 **Delta Intelligence** | Diff engine calculates what's new, cleared, or escalated between 15-minute sweep cycles. |
| 🎨 **Premium Aesthetic** | True "shadowbroker" theme with glassmorphism, dynamic risk gauges, and raw tracking |
| 🔍 **Locate Filter** | Instantly search for specific events, sources or track vectors |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                              │
│  Next.js 16 · MapLibre GL · Layer Toggles · AI Chat · Live Vectors   │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP / SSE
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Express.js API Server                            │
│                                                                      │
│  /api/events ──────── Merged + filtered intelligence sweeps          │
│  /api/live-tracking ─ Fast-polling (10s) objects (Flight/Vessel)     │
│  /api/stream ──────── Server-Sent Events (real-time sweep push)      │
│  /api/health ──────── Upstream status                                │
│  /api/delta ───────── Change detection (new/removed/escalated)       │
│  /api/chat ────────── Geo-intelligence assistant (Ollama)            │
│  /api/sweep ───────── Force a manual cycle                           │
│                                                                      │
│  Cross-Platform CORS · Rate Logic · Response Delta Tracking          │
└────┬───────────┬───────────┬───────────┬────────────────────────────┘
     │           │           │           │
     ▼           ▼           ▼           ▼
┌─────────┐┌─────────┐┌─────────┐┌──────────────┐┌──────────────┐
│  Tier 1 ││  Tier 2 ││  Tier 3 ││    Tier 4    ││  Tier 5-8    │
│ Hazards ││ Military││Aviation ││  Economics   ││   SIGINT     │
│  (8)    ││   (7)   ││   (5)   ││     (11)     ││    (17)      │
└────┬────┘└────┬────┘└────┬────┘└──────┬───────┘└──────┬───────┘
     │          │          │            │               │
     └──────────┴──────────┴────────────┴───────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Normalization Pipeline                             │
│  Multi-format parsing → Severity mapping → Extractor                 │
│  → OmniEvent JSON → Diff/Correlations                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📡 Data Sources

OmniWatch sweeps through 48 external intelligence APIs grouped into 8 tiers.

| Tier | Category | Sources | Examples |
|------|----------|---------|----------|
| **T1** | Environment & Hazard | 8 | USGS, FIRMS, NOAA, Safecast |
| **T2** | Military & Conflict | 7 | ADS-B, GDELT, DeepState, ACLED |
| **T3** | Aviation & Maritime | 5 | OpenSky, AIS, Fishing Watch |
| **T4** | Economics & Markets | 11 | FRED, Yahoo Finance, Polymarket |
| **T5** | Cyber & Security | 4 | CISA KEV, Cloudflare Radar |
| **T6** | Health & Humanitarian | 3 | WHO, ReliefWeb, EPA RadNet |
| **T7** | Social Intelligence | 2 | Reddit, Bluesky OSINT |
| **T8** | SIGINT & Infrastructure | 8 | SatNOGS, TinyGS, KiwiSDR |

> **🙌 Special Thanks:** OmniWatch is fundamentally built upon the pioneering work of **Crucix** by [@calesthio](https://github.com/calesthio). Their original data aggregation logic served as the foundation for the extended TypeScript architecture.

---

## 🔌 API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/events` | Merged intelligence events |
| `GET` | `/api/events?source=usgs` | Filter by data source |
| `GET` | `/api/events?severity=critical` | Filter by severity (`minor`, `moderate`, `major`, `critical`) |
| `GET` | `/api/events?timeRange=week` | Standard Time window (`hour`, `day`, `week`) |
| `GET` | `/api/live-tracking` | 10-second poll cache of dynamic assets (Aircraft, Vessels) |
| `GET` | `/api/stream` | Server-Sent Events — real-time sweep updates |
| `GET` | `/api/health` | Health check + upstream source status |
| `GET` | `/api/delta` | Changes since last intelligence sweep |
| `POST` | `/api/chat` | AI GeoScience correlation assistant |

---

## 📏 Severity Classification

OmniWatch automatically maps source-specific threat levels into four unified states:

<details>
<summary><strong>Earthquakes (USGS)</strong></summary>

| Magnitude | Severity |
|-----------|----------|
| < 3.0 | `minor` |
| 3.0 – 4.9 | `moderate` |
| 5.0 – 6.9 | `major` |
| ≥ 7.0 | `critical` |

</details>

<details>
<summary><strong>Economic / VIX Fear Index</strong></summary>

| VIX Level | Severity |
|------------|----------|
| < 15 | `minor` |
| 15 – 20 | `moderate` |
| 20 – 30 | `major` |
| ≥ 30 | `critical` |

</details>

<details>
<summary><strong>Space Weather (Kp Index)</strong></summary>

| Kp Index | Severity |
|-----------|----------|
| 0 – 3 | `minor` |
| 4 | `moderate` |
| 5 – 6 | `major` |
| ≥ 7 | `critical` |

</details>

---

## 🤖 GeoScience AI Assistant

The J.A.R.V.I.S Terminal automatically digests active threat signals and provides correlated responses:

- **Threat Synthesis** — Asks an attached LLM to cross-reference multiple OSINT streams (e.g. comparing flight diversions to conflict zones)
- **Fallback Engine** — The server guarantees rule-based degradation arrays if Ollama is unavailable
- **Bring Your Own Model** — Connects to any standard API format (`gemma3:27b` by default)

---

## 📂 Project Structure

```
OmniWatch/
├── omniwatch-server/          # Express + TypeScript Backend
│   ├── src/
│   │   ├── clients/           # Data ingestion routines per source
│   │   ├── pipeline/          # Sweep orchestrators & AI agents
│   │   └── index.ts           # SSE & Route Handling
├── omniwatch-client/          # Next.js 16 + React MapLibre GL
│   ├── src/app/
│   │   ├── page.tsx           # Dashboard composition + Map interface
│   │   ├── globals.css        # Thematic styles
│   └── next.config.ts         # Static export configuration
├── Dockerfile                 # Unified container orchestration
├── publish_hf.py              # Automated HuggingFace deployment
└── README.md
```

---

## ⚙️ Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4100` | Server listening port |
| `OLLAMA_HOST` | No | `http://localhost:11434` | Endpoint for the LLM |
| `OLLAMA_MODEL` | No | `gemma3:27b` | Standard inference model for correlations |
| `REFRESH_INTERVAL_MINUTES` | No | `15` | Polling frequency for static data sweeps |

---

## 🛡️ Security

Because OmniWatch aggregates highly sensitive OSINT data, we recommend self-hosting on private networks. By default:
- Backend routes are internally exposed API layers meant to be consumed solely by the Next.js static files.
- The `Dockerfile` natively builds a static UI bundle that connects securely to the same container runtime.

---

## 🔗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Language | TypeScript (strict mode) |
| HTTP | Express.js 4.x |
| Frontend | Next.js 16 (App Router, Static Export) |
| Mapping | MapLibre GL + react-map-gl |
| Icons | Lucide React |
| AI | Ollama |
| Deployment | Docker |

---

## 🗺️ Part of the Masood Sultan Ecosystem

| Project | Description |
|---------|-------------|
| **[OmniWatch](https://github.com/masood1996-geo/OmniWatch)** | Global Intelligence Platform *(this repo)* |
| **[TerraMind Core](https://github.com/masood1996-geo/terramind-core)** | Global disaster intelligence focus via TerraMind |
| **[OpenHouse Bot](https://github.com/masood1996-geo/openhouse-bot)** | AI-powered apartment hunting across portals |
| **[AI Scraper](https://github.com/masood1996-geo/ai-scraper)** | Self-learning web scraper |

---

<div align="center">

**Built at the intersection of OSINT, Geoscience, and AI 🌍**

*AGPL-3.0 License · Built by [@calesthio](https://github.com/calesthio) & [@masood1996-geo](https://github.com/masood1996-geo)*

</div>
