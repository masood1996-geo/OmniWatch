import { config as defaultConfig, type AppConfig } from '../config';
import type { SourceAdapter, OmniEvent } from '../types';

import { fetchEarthquakes } from '../clients/usgs';
import { fetchFires } from '../clients/eonet';
import { fetchFIRMSFires } from '../clients/firms';
import { fetchWeatherAlerts } from '../clients/noaa';
import { fetchAirQuality } from '../clients/airquality';
import { fetchSpaceWeather } from '../clients/spaceweather';
import { fetchSafecastRadiation } from '../clients/safecast';
import { fetchMilitaryAircraft } from '../clients/adsb';
import { fetchConflictEvents } from '../clients/gdelt';
import { fetchUkraineFrontline } from '../clients/deepstate';
import { fetchMilitaryBases, fetchPowerPlants, fetchDataCenters } from '../clients/strategic';
import { fetchCarrierGroups } from '../clients/carriers';
import { fetchVolcanoes } from '../clients/gdacs';
import { fetchSatellites } from '../clients/satellite';
import { fetchOpenSkyFlights, hasOpenSkyCredentials } from '../clients/opensky';
import { fetchMaritime } from '../clients/maritime';
import { fetchFishingActivity } from '../clients/gfw';
import { fetchAmtrakTrains, fetchEuropeanTrains } from '../clients/trains';
import { fetchEconomics } from '../clients/economics';
import { fetchYahooFinanceMarkets } from '../clients/yfinance';
import { fetchFREDEconomics } from '../clients/fred';
import { fetchPredictionMarkets, fetchRSSIntel } from '../clients/osint';
import { fetchCCTVCameras } from '../clients/cctv';
import { fetchCISAVulns, fetchWHOAlerts, fetchReliefWeb } from '../clients/crucix-security';
import {
  fetchTreasuryYields,
  fetchBLSData,
  fetchOFACSanctions,
  fetchOpenSanctions,
  fetchComtrade,
  fetchUSASpending,
} from '../clients/crucix-economics';
import {
  fetchRedditOSINT,
  fetchBlueskyOSINT,
  fetchEIAEnergy,
  fetchACLED,
  fetchPatentIntel,
  fetchCloudflareRadar,
} from '../clients/crucix-social';
import { fetchSatNOGS, fetchKiwiSDR } from '../clients/sigint';
import { fetchInternetOutages } from '../clients/ioda';
import { fetchInfrastructure } from '../clients/infrastructure';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function adapter(
  partial: Omit<SourceAdapter, 'fetch'> & { fetch: SourceAdapter['fetch'] },
): SourceAdapter {
  return partial;
}

async function disabled(reason: string): Promise<OmniEvent[]> {
  throw new Error(reason);
}

export function buildRegistry(cfg: AppConfig = defaultConfig): SourceAdapter[] {
  const key = (name: keyof AppConfig['keys']): string => cfg.keys[name] || '';
  const openskyLive = hasOpenSkyCredentials() || cfg.opensky.allowAnonymous;

  const adapters: SourceAdapter[] = [
    adapter({
      id: 'usgs', label: 'USGS Earthquakes', tier: 1, fetchClass: 'live',
      provider: 'USGS Earthquake Hazards Program', license: 'Public domain (USGS)',
      attribution: 'USGS Earthquake Hazards Program', confidence: 0.98, refreshMs: 15 * MIN,
      fetch: () => fetchEarthquakes(),
    }),
    adapter({
      id: 'nasa-eonet', label: 'NASA EONET Wildfires', tier: 1, fetchClass: 'live',
      provider: 'NASA EONET', license: 'Public domain (NASA)',
      attribution: 'NASA Earth Observatory Natural Event Tracker', confidence: 0.9, refreshMs: 15 * MIN,
      fetch: () => fetchFires(),
    }),
    adapter({
      id: 'nasa-firms', label: 'NASA FIRMS Fires', tier: 1, fetchClass: key('firms') ? 'live' : 'disabled',
      provider: 'NASA FIRMS', license: 'Public domain (NASA)',
      attribution: 'NASA Fire Information for Resource Management System', confidence: 0.95, refreshMs: 15 * MIN,
      requiresKeys: ['FIRMS_MAP_KEY'],
      disabledReason: 'FIRMS_MAP_KEY not set; satellite fire detections disabled',
      fetch: () => fetchFIRMSFires(),
    }),
    adapter({
      id: 'volcanoes', label: 'Volcanoes (GDACS)', tier: 1, fetchClass: 'live',
      provider: 'GDACS (EC JRC) / Smithsonian GVP', license: 'GDACS open data (EC JRC)',
      attribution: 'GDACS and the Smithsonian Global Volcanism Program', confidence: 0.85, refreshMs: 30 * MIN,
      fetch: () => fetchVolcanoes(),
    }),
    adapter({
      id: 'noaa-weather', label: 'NOAA Weather Alerts', tier: 1, fetchClass: 'live',
      provider: 'NOAA National Weather Service', license: 'Public domain (US Government)',
      attribution: 'NOAA / National Weather Service', confidence: 0.95, refreshMs: 15 * MIN,
      fetch: () => fetchWeatherAlerts(),
    }),
    adapter({
      id: 'openaq', label: 'OpenAQ Air Quality', tier: 1, fetchClass: key('openaq') ? 'live' : 'disabled',
      provider: 'OpenAQ', license: 'CC BY 4.0 (OpenAQ)',
      attribution: 'OpenAQ community', confidence: 0.85, refreshMs: 30 * MIN,
      requiresKeys: ['OPENAQ_API_KEY'],
      disabledReason: 'OpenAQ v2 API retired (HTTP 410); set OPENAQ_API_KEY for the v3 API',
      fetch: () => fetchAirQuality(),
    }),
    adapter({
      id: 'noaa-swpc', label: 'NOAA Space Weather', tier: 1, fetchClass: 'live',
      provider: 'NOAA Space Weather Prediction Center', license: 'Public domain (US Government)',
      attribution: 'NOAA SWPC', confidence: 0.95, refreshMs: 15 * MIN,
      fetch: () => fetchSpaceWeather(),
      notes: 'Marker plotted at the north pole as a global indicator',
    }),
    adapter({
      id: 'safecast', label: 'Safecast Radiation', tier: 1, fetchClass: 'live',
      provider: 'Safecast', license: 'CC0 1.0 (Safecast)',
      attribution: 'Safecast community radiation monitoring', confidence: 0.85, refreshMs: 15 * MIN,
      fetch: () => fetchSafecastRadiation(),
    }),
    adapter({
      id: 'adsb', label: 'Military Aircraft (adsb.lol)', tier: 2, fetchClass: 'live',
      provider: 'adsb.lol', license: 'ODbL 1.0 (adsb.lol)',
      attribution: 'adsb.lol community network (ODbL 1.0)', confidence: 0.85, refreshMs: 15 * MIN,
      fetch: () => fetchMilitaryAircraft(),
    }),
    adapter({
      id: 'gdelt', label: 'GDELT Conflict Articles', tier: 2, fetchClass: 'live',
      provider: 'GDELT Project', license: 'GDELT terms of use (attribution)',
      attribution: 'The GDELT Project', confidence: 0.65, refreshMs: 15 * MIN,
      fetch: () => fetchConflictEvents(),
      notes: 'DOC 2.0 headlines only; GDELT GEO API returns 404 as of 2026-09-27, no coordinates emitted',
    }),
    adapter({
      id: 'deepstate', label: 'Ukraine Frontline', tier: 2, fetchClass: 'live',
      provider: 'DeepState UA', license: 'DeepState public map data',
      attribution: 'DeepState UA', confidence: 0.8, refreshMs: 15 * MIN,
      fetch: () => fetchUkraineFrontline(),
    }),
    adapter({
      id: 'mil-bases', label: 'Military Bases (OSM)', tier: 2, fetchClass: 'live',
      provider: 'OpenStreetMap via Overpass API', license: 'ODbL 1.0 (OpenStreetMap)',
      attribution: 'OpenStreetMap contributors', confidence: 0.7, refreshMs: 6 * HOUR,
      fetch: () => fetchMilitaryBases(),
      notes: 'Live OSM query sampled per region; not a complete global inventory',
    }),
    adapter({
      id: 'carrier-ais', label: 'Carrier Strike Groups (AIS)', tier: 2, fetchClass: cfg.aisstream.apiKey && cfg.features.carrierMmsis.length > 0 ? 'live' : 'disabled',
      provider: 'AISStream.io (MMSI filter)', license: 'AISStream terms (attribution)',
      attribution: 'AISStream.io', confidence: 0.6, refreshMs: 15 * MIN,
      requiresKeys: ['AISSTREAM_API_KEY', 'CARRIER_MMSIS'],
      disabledReason: 'No live carrier feed without verified CARRIER_MMSIS + AISSTREAM_API_KEY; positions appear only if a hull is transmitting AIS',
      fetch: () => fetchCarrierGroups(),
    }),
    adapter({
      id: 'acled', label: 'ACLED Conflicts', tier: 2, fetchClass: key('acled') && key('acledEmail') ? 'live' : 'disabled',
      provider: 'ACLED', license: 'ACLED terms of use (attribution, non-commercial)',
      attribution: 'Armed Conflict Location & Event Data Project', confidence: 0.9, refreshMs: 60 * MIN,
      requiresKeys: ['ACLED_API_KEY', 'ACLED_EMAIL'],
      disabledReason: 'ACLED_API_KEY / ACLED_EMAIL not set; ACLED requires registration',
      fetch: () => fetchACLED(),
    }),
    adapter({
      id: 'celestrak', label: 'Military Satellites (TLE)', tier: 2, fetchClass: 'delayed',
      provider: 'CelesTrak', license: 'CelesTrak public data (attribution)',
      attribution: 'CelesTrak / Dr. T.S. Kelso', confidence: 0.9, refreshMs: 60 * MIN,
      fetch: () => fetchSatellites(),
      notes: 'Positions propagated from TLE elements; accuracy degrades with element age',
    }),
    adapter({
      id: 'opensky', label: 'OpenSky Flights', tier: 3, fetchClass: openskyLive ? 'live' : 'disabled',
      provider: 'OpenSky Network', license: 'OpenSky Network terms (non-commercial, attribution)',
      attribution: 'OpenSky Network', confidence: 0.9, refreshMs: 15 * MIN,
      requiresKeys: ['OPENSKY_CLIENT_ID', 'OPENSKY_CLIENT_SECRET'],
      disabledReason: hasOpenSkyCredentials()
        ? 'OpenSky live tracking disabled until OPENSKY_BBOX is set (credit-bounded)'
        : 'OpenSky requires OAuth2 client credentials (username/password and anonymous polling are not supported); set OPENSKY_CLIENT_ID/SECRET',
      fetch: () => fetchOpenSkyFlights(),
    }),
    adapter({
      id: 'aisstream', label: 'Maritime Vessels (AIS)', tier: 3, fetchClass: cfg.aisstream.apiKey ? 'live' : 'disabled',
      provider: 'AISStream.io', license: 'AISStream terms (attribution)',
      attribution: 'AISStream.io', confidence: 0.75, refreshMs: 15 * MIN,
      requiresKeys: ['AISSTREAM_API_KEY'],
      disabledReason: 'AISSTREAM_API_KEY not set; no vessel positions (free key at https://aisstream.io)',
      fetch: () => fetchMaritime(),
    }),
    adapter({
      id: 'gfw-fishing', label: 'Fishing Activity (GFW)', tier: 3, fetchClass: key('gfw') ? 'live' : 'disabled',
      provider: 'Global Fishing Watch', license: 'GFW API terms (attribution, non-commercial)',
      attribution: 'Global Fishing Watch', confidence: 0.8, refreshMs: 60 * MIN,
      requiresKeys: ['GFW_API_KEY'],
      disabledReason: 'GFW_API_KEY not set; Global Fishing Watch requires a registered token',
      fetch: () => fetchFishingActivity(),
    }),
    adapter({
      id: 'amtrak', label: 'Amtrak Trains', tier: 3, fetchClass: 'disabled',
      provider: 'Amtrak public map feed', license: 'Amtrak public feed (no explicit license)',
      attribution: 'Amtrak', confidence: 0, refreshMs: 15 * MIN,
      disabledReason: 'Amtrak getTrainsData now returns an encrypted/obfuscated payload (verified 2026-09-27); no public parseable feed',
      fetch: () => disabled('Amtrak feed is encrypted and cannot be parsed'),
    }),
    adapter({
      id: 'digitraffic', label: 'Finnish Rail (DigiTraffic)', tier: 3, fetchClass: 'live',
      provider: 'Fintraffic DigiTraffic', license: 'CC BY 4.0 (Fintraffic)',
      attribution: 'Fintraffic / DigiTraffic', confidence: 0.9, refreshMs: 15 * MIN,
      fetch: () => fetchEuropeanTrains(),
    }),
    adapter({
      id: 'finnhub', label: 'VIX (Finnhub)', tier: 4, fetchClass: key('finnhub') ? 'live' : 'disabled',
      provider: 'Finnhub', license: 'Finnhub terms of service (free tier)',
      attribution: 'Finnhub', confidence: 0.85, refreshMs: 15 * MIN,
      requiresKeys: ['FINNHUB_API_KEY'],
      disabledReason: 'FINNHUB_API_KEY not set; VIX signal disabled',
      fetch: () => fetchEconomics(),
    }),
    adapter({
      id: 'yahoo-finance', label: 'Markets (Yahoo Finance)', tier: 4, fetchClass: 'delayed',
      provider: 'Yahoo Finance (unofficial chart endpoint)', license: 'Unofficial endpoint; Yahoo ToS applies',
      attribution: 'Yahoo Finance', confidence: 0.6, refreshMs: 15 * MIN,
      fetch: () => fetchYahooFinanceMarkets(),
      notes: 'Unofficial endpoint; no SLA. Markers at exchange cities are reference locations',
    }),
    adapter({
      id: 'fred', label: 'FRED Economic Series', tier: 4, fetchClass: key('fred') ? 'live' : 'disabled',
      provider: 'Federal Reserve Bank of St. Louis (FRED)', license: 'FRED terms (attribution)',
      attribution: 'FRED, Federal Reserve Bank of St. Louis', confidence: 0.95, refreshMs: 6 * HOUR,
      requiresKeys: ['FRED_API_KEY'],
      disabledReason: 'FRED_API_KEY not set; macro series disabled',
      fetch: () => fetchFREDEconomics(),
    }),
    adapter({
      id: 'us-treasury', label: 'US Treasury Yield Curve', tier: 4, fetchClass: 'live',
      provider: 'US Department of the Treasury', license: 'Public domain (US Government)',
      attribution: 'US Treasury', confidence: 0.95, refreshMs: 6 * HOUR,
      fetch: () => fetchTreasuryYields(),
    }),
    adapter({
      id: 'bls', label: 'BLS Employment', tier: 4, fetchClass: 'live',
      provider: 'US Bureau of Labor Statistics', license: 'Public domain (US Government)',
      attribution: 'Bureau of Labor Statistics', confidence: 0.95, refreshMs: 12 * HOUR,
      fetch: () => fetchBLSData(),
    }),
    adapter({
      id: 'ny-fed-gscpi', label: 'Supply Chain Pressure (GSCPI)', tier: 4, fetchClass: 'disabled',
      provider: 'Federal Reserve Bank of New York', license: 'NY Fed public data (attribution)',
      attribution: 'Federal Reserve Bank of New York', confidence: 0, refreshMs: 24 * HOUR,
      disabledReason: 'NY Fed publishes GSCPI only as XLSX; the documented file URL returns 404 as of 2026-09-27',
      fetch: () => disabled('GSCPI disabled: XLSX file URL unavailable'),
    }),
    adapter({
      id: 'un-comtrade', label: 'UN Comtrade', tier: 4, fetchClass: 'live',
      provider: 'UN Comtrade', license: 'UN Comtrade terms (attribution)',
      attribution: 'United Nations Comtrade Database', confidence: 0.8, refreshMs: 6 * HOUR,
      fetch: () => fetchComtrade(),
    }),
    adapter({
      id: 'usaspending', label: 'USAspending', tier: 4, fetchClass: 'live',
      provider: 'USAspending.gov', license: 'Public domain (US Government)',
      attribution: 'USAspending.gov', confidence: 0.9, refreshMs: 12 * HOUR,
      fetch: () => fetchUSASpending(),
    }),
    adapter({
      id: 'eia', label: 'EIA Energy', tier: 4, fetchClass: key('eia') ? 'live' : 'disabled',
      provider: 'US Energy Information Administration', license: 'Public domain (US Government)',
      attribution: 'US EIA', confidence: 0.9, refreshMs: 12 * HOUR,
      requiresKeys: ['EIA_API_KEY'],
      disabledReason: 'EIA_API_KEY not set; EIA v2 API requires a free key',
      fetch: () => fetchEIAEnergy(),
    }),
    adapter({
      id: 'polymarket', label: 'Polymarket Prediction Markets', tier: 4, fetchClass: 'live',
      provider: 'Polymarket Gamma API', license: 'Polymarket API terms',
      attribution: 'Polymarket', confidence: 0.75, refreshMs: 15 * MIN,
      fetch: () => fetchPredictionMarkets(),
      notes: 'No map marker: prediction markets are not geolocated',
    }),
    adapter({
      id: 'ofac', label: 'OFAC Sanctions (SDN)', tier: 4, fetchClass: 'live',
      provider: 'US Treasury OFAC', license: 'Public domain (US Government)',
      attribution: 'US Treasury Office of Foreign Assets Control', confidence: 0.9, refreshMs: 24 * HOUR,
      fetch: () => fetchOFACSanctions(),
    }),
    adapter({
      id: 'cisa-kev', label: 'CISA Known Exploited Vulnerabilities', tier: 5, fetchClass: 'live',
      provider: 'CISA', license: 'Public domain (US Government)',
      attribution: 'CISA Known Exploited Vulnerabilities catalog', confidence: 0.95, refreshMs: 6 * HOUR,
      fetch: () => fetchCISAVulns(),
    }),
    adapter({
      id: 'opensanctions', label: 'OpenSanctions', tier: 5, fetchClass: 'live',
      provider: 'OpenSanctions', license: 'CC BY 4.0 (OpenSanctions)',
      attribution: 'OpenSanctions', confidence: 0.85, refreshMs: 24 * HOUR,
      fetch: () => fetchOpenSanctions(),
    }),
    adapter({
      id: 'cloudflare-radar', label: 'Cloudflare Radar Outages', tier: 5, fetchClass: key('cloudflare') ? 'live' : 'disabled',
      provider: 'Cloudflare Radar', license: 'Cloudflare Radar terms',
      attribution: 'Cloudflare Radar', confidence: 0.8, refreshMs: 60 * MIN,
      requiresKeys: ['CLOUDFLARE_API_TOKEN'],
      disabledReason: 'CLOUDFLARE_API_TOKEN not set; Radar outage annotations disabled',
      fetch: () => fetchCloudflareRadar(),
    }),
    adapter({
      id: 'ioda', label: 'Internet Outages (IODA)', tier: 5, fetchClass: 'live',
      provider: 'Georgia Tech IODA', license: 'IODA terms (attribution)',
      attribution: 'Internet Outage Detection and Analysis (IODA), Georgia Tech', confidence: 0.8, refreshMs: 15 * MIN,
      fetch: () => fetchInternetOutages(),
    }),
    adapter({
      id: 'who', label: 'WHO Disease Outbreak News', tier: 6, fetchClass: 'live',
      provider: 'World Health Organization', license: 'WHO terms (attribution)',
      attribution: 'World Health Organization', confidence: 0.85, refreshMs: 60 * MIN,
      fetch: () => fetchWHOAlerts(),
    }),
    adapter({
      id: 'reliefweb', label: 'ReliefWeb Humanitarian', tier: 6, fetchClass: 'live',
      provider: 'ReliefWeb (UN OCHA)', license: 'CC BY 4.0 (ReliefWeb)',
      attribution: 'ReliefWeb / UN OCHA and report providers', confidence: 0.85, refreshMs: 30 * MIN,
      fetch: () => fetchReliefWeb(),
    }),
    adapter({
      id: 'epa-radnet', label: 'EPA RadNet', tier: 6, fetchClass: 'disabled',
      provider: 'US EPA RadNet', license: 'Public domain (US Government)',
      attribution: 'US EPA RadNet', confidence: 0, refreshMs: 60 * MIN,
      disabledReason: 'EPA RadNet has no public live API (Envirofacts probes return 404 as of 2026-09-27); Safecast is the live radiation source',
      fetch: () => disabled('EPA RadNet disabled: no public live API'),
    }),
    adapter({
      id: 'reddit', label: 'Reddit OSINT', tier: 7, fetchClass: key('redditClientId') && key('redditClientSecret') ? 'live' : 'disabled',
      provider: 'Reddit (OAuth2 client credentials)', license: 'Reddit API terms',
      attribution: 'Reddit', confidence: 0.6, refreshMs: 30 * MIN,
      requiresKeys: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'],
      disabledReason: 'Unauthenticated reddit .json endpoints return 403 since 2026-05-28; set REDDIT_CLIENT_ID/SECRET for OAuth2 access',
      fetch: () => fetchRedditOSINT(),
    }),
    adapter({
      id: 'bluesky', label: 'Bluesky OSINT', tier: 7, fetchClass: 'live',
      provider: 'Bluesky public API', license: 'Public API; post content owned by authors',
      attribution: 'Bluesky and post authors', confidence: 0.55, refreshMs: 30 * MIN,
      fetch: () => fetchBlueskyOSINT(),
      notes: 'No map marker: posts are not geolocated',
    }),
    adapter({
      id: 'rss', label: 'News Headlines (RSS)', tier: 7, fetchClass: 'live',
      provider: 'BBC World / The Guardian / Al Jazeera', license: 'Per-feed terms (headlines and links only)',
      attribution: 'BBC, The Guardian, Al Jazeera', confidence: 0.6, refreshMs: 15 * MIN,
      fetch: () => fetchRSSIntel(),
      notes: 'No map marker: headlines are not geolocated',
    }),
    adapter({
      id: 'satnogs', label: 'SatNOGS Ground Stations', tier: 8, fetchClass: 'live',
      provider: 'SatNOGS Network', license: 'SatNOGS open data (attribution)',
      attribution: 'SatNOGS Network contributors', confidence: 0.8, refreshMs: 6 * HOUR,
      fetch: () => fetchSatNOGS(),
    }),
    adapter({
      id: 'tinygs', label: 'TinyGS LoRa Stations', tier: 8, fetchClass: 'disabled',
      provider: 'TinyGS', license: 'TinyGS terms (attribution)',
      attribution: 'TinyGS community', confidence: 0, refreshMs: 6 * HOUR,
      disabledReason: 'TinyGS public API endpoints return 404 as of 2026-09-27',
      fetch: () => disabled('TinyGS disabled: API endpoint unavailable'),
    }),
    adapter({
      id: 'kiwisdr', label: 'KiwiSDR Receivers', tier: 8, fetchClass: 'live',
      provider: 'KiwiSDR receiver list (linkfanel)', license: 'Public receiver list (linkfanel)',
      attribution: 'KiwiSDR community / linkfanel.net', confidence: 0.7, refreshMs: 6 * HOUR,
      fetch: () => fetchKiwiSDR(),
    }),
    adapter({
      id: 'powerplants', label: 'Power Plants (OSM)', tier: 8, fetchClass: cfg.features.overpassPowerPlants ? 'live' : 'disabled',
      provider: 'OpenStreetMap via Overpass API', license: 'ODbL 1.0 (OpenStreetMap)',
      attribution: 'OpenStreetMap contributors', confidence: 0.7, refreshMs: 24 * HOUR,
      disabledReason: 'OSM Overpass global power-plant queries time out on public instances (verified 2026-09-27); set ENABLE_OVERPASS_POWERPLANTS=true to opt in',
      fetch: () => fetchPowerPlants(),
    }),
    adapter({
      id: 'datacenters', label: 'Data Centers (PeeringDB)', tier: 8, fetchClass: 'live',
      provider: 'PeeringDB', license: 'PeeringDB terms (attribution)',
      attribution: 'PeeringDB', confidence: 0.85, refreshMs: 24 * HOUR,
      fetch: () => fetchDataCenters(),
    }),
    adapter({
      id: 'cctv-mesh', label: 'Traffic Cameras', tier: 8, fetchClass: 'live',
      provider: 'TfL / NYC DOT / Singapore LTA', license: 'Public agency feeds (per-provider terms)',
      attribution: 'Transport for London, NYC DOT, Singapore LTA', confidence: 0.7, refreshMs: 30 * MIN,
      fetch: () => fetchCCTVCameras(),
    }),
    adapter({
      id: 'overpass', label: 'OSM Infrastructure (Taiwan sample)', tier: 8, fetchClass: 'live',
      provider: 'OpenStreetMap via Overpass API', license: 'ODbL 1.0 (OpenStreetMap)',
      attribution: 'OpenStreetMap contributors', confidence: 0.7, refreshMs: 6 * HOUR,
      fetch: () => fetchInfrastructure(),
      notes: 'Single-region sample query inherited from TerraMind; not a global inventory',
    }),
    adapter({
      id: 'uspto', label: 'Patent Intelligence', tier: 8, fetchClass: key('patentsview') ? 'live' : 'disabled',
      provider: 'PatentsView (USPTO)', license: 'USPTO public data via PatentsView',
      attribution: 'PatentsView / USPTO', confidence: 0.8, refreshMs: 24 * HOUR,
      requiresKeys: ['PATENTSVIEW_API_KEY'],
      disabledReason: 'USPTO legacy endpoint returns HTML; PatentsView now requires PATENTSVIEW_API_KEY',
      fetch: () => fetchPatentIntel(),
    }),
  ];

  return adapters.map(a => {
    const missingKeys = (a.requiresKeys || []).filter(name => {
      const map: Record<string, string> = {
        FIRMS_MAP_KEY: cfg.keys.firms,
        OPENAQ_API_KEY: cfg.keys.openaq,
        AISSTREAM_API_KEY: cfg.aisstream.apiKey,
        CARRIER_MMSIS: cfg.features.carrierMmsis.join(','),
        ACLED_API_KEY: cfg.keys.acled,
        ACLED_EMAIL: cfg.keys.acledEmail,
        OPENSKY_CLIENT_ID: cfg.opensky.clientId,
        OPENSKY_CLIENT_SECRET: cfg.opensky.clientSecret,
        GFW_API_KEY: cfg.keys.gfw,
        FINNHUB_API_KEY: cfg.keys.finnhub,
        FRED_API_KEY: cfg.keys.fred,
        EIA_API_KEY: cfg.keys.eia,
        CLOUDFLARE_API_TOKEN: cfg.keys.cloudflare,
        REDDIT_CLIENT_ID: cfg.keys.redditClientId,
        REDDIT_CLIENT_SECRET: cfg.keys.redditClientSecret,
        PATENTSVIEW_API_KEY: cfg.keys.patentsview,
      };
      return !map[name];
    });
    const fetchClass = a.fetchClass === 'disabled' || missingKeys.length > 0 ? 'disabled' as const : a.fetchClass;
    return {
      ...a,
      fetchClass,
      missingKeys,
      disabledReason: a.disabledReason || (missingKeys.length > 0 ? `Missing keys: ${missingKeys.join(', ')}` : undefined),
    };
  });
}
