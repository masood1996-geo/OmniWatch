# Data sources

Registry: `omniwatch-server/src/sources/registry.ts` (49 adapters as of 2026-09-27,
verified programmatically with `npm run verify:counts`). Runtime status is always visible in
`GET /api/adapters` and `GET /api/health` → `sourceHealth`.

- `live` — fetched during the sweep from the provider.
- `delayed` — provider data has inherent latency (TLE elements, unofficial endpoints,
  monthly indices).
- `disabled` — no credentials or no viable live endpoint; **no events are emitted**, and the
  reason is displayed in the UI and API.
- No adapter is allowed to fabricate data. Static datasets were removed or converted to live
  queries during the v2 productization (see `docs/AUDIT.md`).

Status column = observed 2026-09-27 in the reference environment
(`docs/evidence/sweep-2026-09-27.md`); key-gated sources are live when their key is present.

| # | ID | Tier | Provider / endpoint | Key | Cadence | Class (default) | License / attribution | Status 2026-09-27 |
|---|----|------|---------------------|-----|---------|-----------------|-----------------------|-------------------|
| 1 | usgs | 1 | USGS Earthquake Hazards, `earthquake.usgs.gov` feed | — | 15 min | live | Public domain (USGS) | OK (43) |
| 2 | nasa-eonet | 1 | NASA EONET v3 `eonet.gsfc.nasa.gov` | — | 15 min | live | Public domain (NASA) | OK (2, 7-day window) |
| 3 | nasa-firms | 1 | NASA FIRMS area CSV `firms.modaps.eosdis.nasa.gov` | FIRMS_MAP_KEY | 15 min | live/disabled | Public domain (NASA) | disabled (no key) |
| 4 | volcanoes | 1 | GDACS `gdacs.org/gdacsapi` (aggregates Smithsonian GVP) | — | 30 min | live | GDACS open data (EC JRC) / GVP | OK (6) |
| 5 | noaa-weather | 1 | NWS `api.weather.gov/alerts/active` | — | 15 min | live | Public domain (US Gov) | OK (50 cap) |
| 6 | openaq | 1 | OpenAQ v3 `api.openaq.org/v3` | OPENAQ_API_KEY | 30 min | live/disabled | CC BY 4.0 (OpenAQ) | disabled (v2 retired 410) |
| 7 | noaa-swpc | 1 | NOAA SWPC planetary K-index JSON | — | 15 min | live | Public domain (US Gov) | OK (1) |
| 8 | safecast | 1 | Safecast `api.safecast.org` measurements | — | 15 min | live | CC0 1.0 (Safecast) | OK (23) |
| 9 | adsb | 2 | adsb.lol `api.adsb.lol/v2/mil` | — | 15 min | live | **ODbL 1.0 (adsb.lol)** | OK (51) |
| 10 | gdelt | 2 | GDELT DOC 2.0 artlist (no geocoding) | — | 15 min | live | GDELT terms (attribution) | error (429 sometimes) |
| 11 | deepstate | 2 | DeepState UA `deepstatemap.live/api/history/last` | — | 15 min | live | DeepState public map data | OK (40) |
| 12 | mil-bases | 2 | OSM Overpass `military=base` (4 macro-regions) | — | 6 h | live | ODbL 1.0 (OpenStreetMap) | OK (40, ~33 s) |
| 13 | carrier-ais | 2 | AISStream MMSI filter (global bbox) | AISSTREAM_API_KEY + CARRIER_MMSIS | 15 min | live/disabled | AISStream terms | disabled (no verified MMSI list) |
| 14 | acled | 2 | ACLED OAuth API `acleddata.com` | ACLED_API_KEY + ACLED_EMAIL | 60 min | live/disabled | ACLED terms | disabled (no key) |
| 15 | celestrak | 2 | CelesTrak TLE `celestrak.org` (military group) | — | 60 min | **delayed** | CelesTrak public data | OK (15) |
| 16 | opensky | 3 | OpenSky `opensky-network.org` **OAuth2 only** | OPENSKY_CLIENT_ID/SECRET (+OPENSKY_BBOX) | 15 min | live/disabled | OpenSky terms (non-commercial, attribution) | disabled (no creds) |
| 17 | aisstream | 3 | AISStream managed WebSocket, snapshot TTL 10 min | AISSTREAM_API_KEY | 15 min | live/disabled | AISStream terms | OK (500 snapshot) |
| 18 | gfw-fishing | 3 | Global Fishing Watch v3 events API | GFW_API_KEY | 60 min | live/disabled | GFW API terms | disabled (no key) |
| 19 | amtrak | 3 | Amtrak getTrainsData | — | 15 min | disabled | Amtrak public feed | disabled (payload now encrypted) |
| 20 | digitraffic | 3 | Fintraffic DigiTraffic `rata.digitraffic.fi` | — | 15 min | live | CC BY 4.0 (Fintraffic) | OK (30) |
| 21 | finnhub | 4 | Finnhub quote `^VIX` | FINNHUB_API_KEY | 15 min | live/disabled | Finnhub ToS | error (free tier lacks VIX) |
| 22 | yahoo-finance | 4 | Yahoo Finance v8 chart (unofficial) | — | 15 min | delayed | Unofficial; Yahoo ToS | OK (8) |
| 23 | fred | 4 | FRED series API | FRED_API_KEY | 6 h | live/disabled | FRED terms | OK (6) |
| 24 | us-treasury | 4 | Treasury daily yield-curve CSV | — | 6 h | live | Public domain (US Gov) | OK (1, ~20 s) |
| 25 | bls | 4 | BLS public API v2 (unemployment) | — | 12 h | live | Public domain (US Gov) | OK (1) |
| 26 | ny-fed-gscpi | 4 | NY Fed GSCPI XLSX | — | 24 h | disabled | NY Fed public data | disabled (file URL 404) |
| 27 | un-comtrade | 4 | UN Comtrade public preview API | — | 6 h | live | UN Comtrade terms | OK (1) |
| 28 | usaspending | 4 | USAspending toptier agencies | — | 12 h | live | Public domain (US Gov) | OK (5) |
| 29 | eia | 4 | EIA v2 API (crude stocks) | EIA_API_KEY | 12 h | live/disabled | Public domain (US Gov) | disabled (no key) |
| 30 | polymarket | 4 | Polymarket Gamma API | — | 15 min | live | Polymarket API terms | OK (20, no geo) |
| 31 | ofac | 4 | OFAC SDN.CSV export (~5.7 MB) | — | 24 h | live | Public domain (US Gov) | OK/retry (transient) |
| 32 | cisa-kev | 5 | CISA KEV JSON catalog | — | 6 h | live | Public domain (US Gov) | OK (15) |
| 33 | opensanctions | 5 | OpenSanctions statistics JSON | — | 24 h | live | CC BY 4.0 | OK (1) |
| 34 | cloudflare-radar | 5 | Cloudflare Radar outage annotations | CLOUDFLARE_API_TOKEN | 60 min | live/disabled | Cloudflare Radar terms | disabled (no key) |
| 35 | ioda | 5 | Georgia Tech IODA outages API | — | 15 min | live | IODA terms (attribution) | OK (50) |
| 36 | who | 6 | WHO Disease Outbreak News (OData) | — | 60 min | live | WHO terms | OK (10) |
| 37 | reliefweb | 6 | ReliefWeb API v2 | — | 30 min | live | CC BY 4.0 / provider terms | error from this network (403/410) |
| 38 | epa-radnet | 6 | US EPA RadNet | — | 60 min | disabled | Public domain (US Gov) | disabled (no public API) |
| 39 | reddit | 7 | Reddit OAuth2 `oauth.reddit.com` | REDDIT_CLIENT_ID/SECRET | 30 min | live/disabled | Reddit API terms | disabled (no OAuth app) |
| 40 | bluesky | 7 | Bluesky public AppView `api.bsky.app` | — | 30 min | live | Public API; author-owned content | OK (10, no geo) |
| 41 | rss | 7 | BBC World, The Guardian World, Al Jazeera RSS | — | 15 min | live | Per-feed terms; headlines + links only | OK (6, no geo) |
| 42 | satnogs | 8 | SatNOGS network station list | — | 6 h | live | SatNOGS open data | OK (50) |
| 43 | tinygs | 8 | TinyGS stations API | — | 6 h | disabled | TinyGS terms | disabled (API 404) |
| 44 | kiwisdr | 8 | KiwiSDR receiver list (linkfanel) over HTTP | — | 6 h | live | Public receiver list | OK (60) |
| 45 | powerplants | 8 | OSM Overpass `power=plant` | ENABLE_OVERPASS_POWERPLANTS | 24 h | live/disabled | ODbL 1.0 (OpenStreetMap) | disabled by default (Overpass timeouts) |
| 46 | datacenters | 8 | PeeringDB facilities API | — | 24 h | live | PeeringDB terms (attribution) | OK/retry (429 backoff) |
| 47 | cctv-mesh | 8 | TfL JamCams, NYC DOT, Singapore LTA | — | 30 min | live | Public agency feeds | OK (38) |
| 48 | overpass | 8 | OSM Overpass Taiwan sample | — | 6 h | live | ODbL 1.0 (OpenStreetMap) | OK (0–20, sample) |
| 49 | uspto | 8 | PatentsView API (USPTO) | PATENTSVIEW_API_KEY | 24 h | live/disabled | USPTO public data | disabled (no key) |

## Retired or converted in v2

| Old dataset | Old problem | v2 disposition |
|---|---|---|
| Global Fishing Watch "hotspot" counts | Fabricated vessel counts, no API call | Deleted; GFW adapter is key-gated and calls the real v3 API |
| Carrier strike-group positions | Hardcoded positions presented as OSINT | Replaced with AIS MMSI-filtered tracking (`CARRIER_MMSIS`); disabled without a verified list |
| Power plants / military bases / data centers curated lists | Static data with fresh timestamps | Power plants → OSM (opt-in); bases → OSM live; data centers → PeeringDB live |
| EIA / ACLED / Cloudflare static text | Presented as live | Converted to key-gated live adapters or disabled with reasons |
| EPA RadNet "status: Normal" | Fabricated readings | Deleted; Safecast is the live radiation source |
| Static WHO / KiwiSDR / Safecast / DeepState / GDELT / Polymarket fallbacks | Fabricated "live" events | Deleted; failures surface as errors, never as events |
| Reddit `.json` | 403 since 2026-05-28 | OAuth2-only adapter; disabled without credentials |
| Reuters RSS | Dead for years | Removed; only verified feeds (BBC/Guardian/Al Jazeera) are used |
| TinyGS / Amtrak | API retired / payload encrypted | Disabled with recorded reasons |
| GDELT GEO API | 404 (retired) | Switched to DOC 2.0 headlines (no coordinates) |

## Paid / future options (not bundled)

Kpler, MarineTraffic, ADS-B Exchange, Planet, Dataminr — describe in `docs/PRODUCT.md`.
