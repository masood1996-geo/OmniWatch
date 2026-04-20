<div align="center">

**Stop juggling disconnected intelligence feeds.** 
OmniWatch fuses 48 global OSINT sources — from USGS Earthquakes and NASA Wildfires to ADS-B Military Aircraft, AIS Maritime Tracking, and Global Conflict Events — into one real-time dashboard with an AI-powered correlation engine. All self-hosted, all open source.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-green?style=for-the-badge)](LICENSE)
[![AI Powered](https://img.shields.io/badge/J.A.R.V.I.S-AI%20Terminal-FF6F00?style=for-the-badge&logo=ollama&logoColor=white)]()
[![Live Demo](https://img.shields.io/badge/%F0%9F%A4%97_Demo-Live_on_HuggingFace-orange?style=for-the-badge)](https://huggingface.co/spaces/masood1996-geo/omniwatch)

---

```text
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
> **No installation needed — [try the live demo on Hugging Face](https://huggingface.co/spaces/masood1996-geo/omniwatch)**
>
> Real-time monitoring of global infrastructure, transport, natural hazards, and conflicts with AI correlation.

---

Commercial OSINT platforms are heavily gated and expensive. OmniWatch brings 48 critical data streams into a unified Next.js + Express architecture for free.

| Commercial Platforms | OmniWatch |
|---------------------|-----------|
| ❌ Expensive enterprise licenses | ✅ **100% free** — AGPL-3.0 license |
| ❌ Proprietary, closed data | ✅ Transparent, open OSINT APIs |
| ❌ Disconnected tools | ✅ **48 sources unified** in a single React MapLibre GL instance |
| ❌ No live tracking | ✅ **10-second polling** for aircraft (OpenSky) and vessels (AIS) |
| ❌ Complex setup | ✅ **Single-command Docker** deploy or npm workspaces |

---

## ⚡ Quick Start

```bash
git clone https://github.com/masood1996-geo/OmniWatch.git
cd OmniWatch

# 1. Install server
cd omniwatch-server
npm install
cp .env.template .env # Edit with your API keys if desired
npm run start &

# 2. Start client
cd ../omniwatch-client
npm install
npm run dev
# -> http://localhost:3000
```

> **Note**: No API keys are required to use the vast majority of the 48 tracking sources. The server will gracefully degrade/skip any sources requiring missing keys.

---

## ✨ Core Features

| Feature | Description |
|---------|-------------|
| 🌍 **48-Source Aggregation** | Merges 8 tiers of intelligence: Environment, Military, Maritime, Economics, Security, Health, Social, and SIGINT. |
| 🔴 **Real-Time Streaming** | Server-Sent Events push live intelligence sweeps directly to the dashboard, plus high-frequency tracking for planes/ships. |
| 🤖 **J.A.R.V.I.S Terminal** | An integrated Ollama-powered AI chat agent that understands the current global intel landscape to answer user queries. |
| 🗺️ **37 Map Layers** | Toggleable visualizations combining markers and CartoDB styles. |
| 🔍 **Locate Filter** | Instantly search for specific events or track vectors across the globe. |
| 🎨 **Dynamic View Modes** | Switch seamlessly between Standard, Satellite, FLIR, NVG, and CRT map styles. |
| 📈 **Delta Intelligence** | Automatically calculates what's new, cleared, or escalated between 15-minute sweep cycles. |

---

## 🏗️ Architecture

```text
omniwatch-server/     Express + TypeScript backend
├── src/
│   ├── clients/      48 OSINT data source adapters
│   │   ├── usgs.ts         USGS Earthquakes
│   │   ├── firms.ts        NASA FIRMS Fires
│   │   ├── adsb.ts         Military Aircraft
│   │   ├── opensky.ts      Commercial Flights
│   │   ├── maritime.ts     AIS Vessel Tracking
│   │   ├── gdelt.ts        Conflict Events
│   │   └── ...
│   ├── pipeline/
│   │   ├── sweep.ts        Tiered sweep orchestrator
│   │   └── llm.ts          AI correlation engine
│   └── index.ts            Express server + SSE

omniwatch-client/     Next.js 16 + MapLibre GL dashboard
├── src/app/
│   └── page.tsx      Full dashboard (37 toggleable layers)
```

---

## 📡 Signal Tiers (48 Sources)

| Tier | Category | Sources | Examples |
|------|----------|---------|----------|
| **1.** | Environment & Hazard | 8 | USGS, FIRMS, NOAA, Safecast |
| **2.** | Military & Conflict | 7 | ADS-B, GDELT, DeepState, ACLED |
| **3.** | Aviation & Maritime | 5 | OpenSky, AIS, Fishing Watch |
| **4.** | Economics & Markets | 11 | FRED, Yahoo Finance, Polymarket |
| **5.** | Cyber & Security | 4 | CISA KEV, Cloudflare Radar |
| **6.** | Health & Humanitarian | 3 | WHO, ReliefWeb, EPA RadNet |
| **7.** | Social Intelligence | 2 | Reddit, Bluesky OSINT |
| **8.** | SIGINT & Infrastructure | 8 | SatNOGS, TinyGS, KiwiSDR |

---

## 🔌 API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/events` | Merged, normalized disaster/intel events |
| `GET` | `/api/live-tracking` | Fast-polling (10s) object updates (Flight/Vessel) |
| `GET` | `/api/stream` | Server-Sent Events — real-time push for sweeps |
| `GET` | `/api/health` | Upstream source status |
| `GET` | `/api/delta` | Changes since last intelligence sweep |
| `POST` | `/api/chat` | AI geo-intelligence assistant (Ollama) |
| `POST` | `/api/sweep` | Force a manual sweep cycle |

---

## ⚙️ Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4100` | Server listening port |
| `OLLAMA_HOST` | No | `http://localhost:11434` | Endpoint for the J.A.R.V.I.S Terminal |
| `OLLAMA_MODEL` | No | `gemma3:27b` | Name of the LLM to use via Ollama |
| `OLLAMA_API_KEY` | No | — | Key for cloud-hosted Ollama providers |

---

## 🗺️ Part of the Masood Sultan Ecosystem

| Project | Description |
|---------|-------------|
| **[OmniWatch](https://github.com/masood1996-geo/OmniWatch)** | Global Intelligence & Tracking Platform *(this repo)* |
| **[TerraMind Core](https://github.com/masood1996-geo/terramind-core)** | Global disaster intelligence focus via TerraMind |
| **[OpenHouse Bot](https://github.com/masood1996-geo/openhouse-bot)** | AI-powered apartment hunting |
| **[AI Scraper](https://github.com/masood1996-geo/ai-scraper)** | Self-learning web scraper |

---

## Acknowledgments

OmniWatch is fundamentally built upon the pioneering work of **Crucix** by [@calesthio](https://github.com/calesthio). 
Their original intelligence gathering scripts provided the foundational logic. OmniWatch extends Crucix by transitioning the stack fully to TypeScript, migrating to a Next.js/React MapLibre ecosystem, and implementing live 10s vessel/aircraft polling logic alongside extended infrastructure endpoints. 

<div align="center">

**Built at the intersection of OSINT, Geoscience, and AI 🌍**

*AGPL-3.0 License · Built by [@calesthio](https://github.com/calesthio) & [@masood1996-geo](https://github.com/masood1996-geo)*

</div>
