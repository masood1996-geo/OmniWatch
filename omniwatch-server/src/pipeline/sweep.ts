import { fetchEarthquakes } from '../clients/usgs';
import type { OmniEvent } from '../clients/usgs';
import { fetchFires } from '../clients/eonet';
import { fetchMilitaryAircraft } from '../clients/adsb';
import { fetchWeatherAlerts } from '../clients/noaa';
import { fetchConflictEvents } from '../clients/gdelt';
import { fetchSatellites } from '../clients/satellite';
import { fetchMaritime } from '../clients/maritime';
import { fetchEconomics } from '../clients/economics';
import { fetchInfrastructure } from '../clients/infrastructure';
import { evaluateIntelligence } from './llm';

// Phase B: Core data sources
import { fetchFIRMSFires } from '../clients/firms';
import { fetchOpenSkyFlights } from '../clients/opensky';
import { fetchSafecastRadiation } from '../clients/safecast';
import { fetchYahooFinanceMarkets } from '../clients/yfinance';
import { fetchVolcanoes } from '../clients/volcanoes';
import { fetchAirQuality } from '../clients/airquality';
import { fetchSpaceWeather } from '../clients/spaceweather';
import { fetchFREDEconomics } from '../clients/fred';

// Phase C: Shadowbroker parity
import { fetchUkraineFrontline } from '../clients/deepstate';
import { fetchInternetOutages } from '../clients/ioda';
import { fetchPowerPlants, fetchMilitaryBases, fetchDataCenters } from '../clients/strategic';
import { fetchCarrierGroups } from '../clients/carriers';
import { fetchSatNOGS, fetchTinyGS, fetchKiwiSDR } from '../clients/sigint';
import { fetchAmtrakTrains, fetchEuropeanTrains } from '../clients/trains';
import { fetchFishingActivity, fetchPredictionMarkets, fetchRSSIntel } from '../clients/osint';
import { fetchCCTVCameras } from '../clients/cctv';

// Phase D: Crucix parity — security, economics, social
import { fetchCISAVulns, fetchWHOAlerts, fetchReliefWeb, fetchEPARadNet } from '../clients/crucix-security';
import { fetchTreasuryYields, fetchBLSData, fetchGSCPI, fetchOFACSanctions, fetchOpenSanctions, fetchComtrade, fetchUSASpending } from '../clients/crucix-economics';
import { fetchRedditOSINT, fetchBlueskyOSINT, fetchEIAEnergy, fetchACLED, fetchPatentIntel, fetchCloudflareRadar } from '../clients/crucix-social';

export interface SweepResult {
  events: OmniEvent[];
  timestamp: string;
  sources: Record<string, { status: string; count: number }>;
  sweepDurationMs: number;
}

// Delta tracking
let previousEvents: OmniEvent[] = [];
let lastSweepResult: SweepResult | null = null;

export function getLastSweep(): SweepResult | null {
  return lastSweepResult;
}

export function getPreviousEvents(): OmniEvent[] {
  return previousEvents;
}

export async function runSweep(): Promise<OmniEvent[]> {
  const sourceCount = 48;
  console.log(`[Sweep] Initiating global intelligence sweep (${sourceCount} sources)...`);
  const startTime = Date.now();
  const sources: Record<string, { status: string; count: number }> = {};

  const results = await Promise.allSettled([
    // === TIER 1: Environment & Hazard (0-7) ===
    fetchEarthquakes(),           // 0: USGS
    fetchFires(),                 // 1: NASA EONET
    fetchFIRMSFires(),            // 2: NASA FIRMS
    fetchVolcanoes(),             // 3: Smithsonian GVP
    fetchWeatherAlerts(),         // 4: NOAA Weather
    fetchAirQuality(),            // 5: OpenAQ
    fetchSpaceWeather(),          // 6: NOAA SWPC
    fetchSafecastRadiation(),     // 7: Safecast radiation
    // === TIER 2: Military & Conflict (8-14) ===
    fetchMilitaryAircraft(),      // 8: ADSB.lol
    fetchConflictEvents(),        // 9: GDELT
    fetchUkraineFrontline(),      // 10: DeepState
    fetchMilitaryBases(),         // 11: Military installations
    fetchCarrierGroups(),         // 12: USN Carriers
    fetchACLED(),                 // 13: ACLED conflict data
    fetchSatellites(),            // 14: CelesTrak
    // === TIER 3: Aviation & Maritime (15-19) ===
    fetchOpenSkyFlights(),        // 15: OpenSky
    fetchMaritime(),              // 16: AISStream
    fetchFishingActivity(),       // 17: Global Fishing Watch
    fetchAmtrakTrains(),          // 18: Amtrak
    fetchEuropeanTrains(),        // 19: DigiTraffic
    // === TIER 4: Economics & Markets (20-30) ===
    fetchEconomics(),             // 20: Finnhub VIX
    fetchYahooFinanceMarkets(),   // 21: Yahoo Finance
    fetchFREDEconomics(),         // 22: FRED
    fetchTreasuryYields(),        // 23: US Treasury
    fetchBLSData(),               // 24: BLS Employment
    fetchGSCPI(),                 // 25: NY Fed Supply Chain
    fetchComtrade(),              // 26: UN Comtrade
    fetchUSASpending(),           // 27: USASpending
    fetchEIAEnergy(),             // 28: EIA Energy
    fetchPredictionMarkets(),     // 29: Polymarket
    fetchOFACSanctions(),         // 30: OFAC Sanctions
    // === TIER 5: Cyber & Security (31-34) ===
    fetchCISAVulns(),             // 31: CISA KEV
    fetchOpenSanctions(),         // 32: OpenSanctions
    fetchCloudflareRadar(),       // 33: Cloudflare Radar
    fetchInternetOutages(),       // 34: IODA
    // === TIER 6: Health & Humanitarian (35-37) ===
    fetchWHOAlerts(),             // 35: WHO
    fetchReliefWeb(),             // 36: ReliefWeb OCHA
    fetchEPARadNet(),             // 37: EPA RadNet
    // === TIER 7: Social Intelligence (38-39) ===
    fetchRedditOSINT(),           // 38: Reddit
    fetchBlueskyOSINT(),          // 39: Bluesky
    // === TIER 8: SIGINT & Infrastructure (40-47) ===
    fetchSatNOGS(),               // 40: SatNOGS
    fetchTinyGS(),                // 41: TinyGS LoRa
    fetchKiwiSDR(),               // 42: KiwiSDR
    fetchPowerPlants(),           // 43: WRI Power Plants
    fetchDataCenters(),           // 44: Data Centers
    fetchCCTVCameras(),           // 45: CCTV Cameras
    fetchInfrastructure(),        // 46: Overpass (TerraMind)
    fetchPatentIntel(),           // 47: USPTO Patents
  ]);

  const sourceNames = [
    // T1: Environment
    'usgs', 'nasa-eonet', 'nasa-firms', 'smithsonian',
    'noaa-weather', 'openaq', 'noaa-swpc', 'safecast',
    // T2: Military
    'adsb', 'gdelt', 'deepstate', 'mil-bases',
    'carrier-osint', 'acled', 'celestrak',
    // T3: Aviation/Maritime
    'opensky', 'aisstream', 'fishing-watch', 'amtrak', 'digitraffic',
    // T4: Economics
    'finnhub', 'yahoo-finance', 'fred', 'us-treasury',
    'bls', 'ny-fed-gscpi', 'un-comtrade', 'usaspending',
    'eia', 'polymarket', 'ofac',
    // T5: Cyber
    'cisa-kev', 'opensanctions', 'cloudflare-radar', 'ioda',
    // T6: Health
    'who', 'reliefweb', 'epa-radnet',
    // T7: Social
    'reddit', 'bluesky',
    // T8: SIGINT/Infra
    'satnogs', 'tinygs', 'kiwisdr',
    'wri-powerplants', 'datacenters', 'cctv-mesh',
    'overpass', 'uspto',
  ];

  let allEvents: OmniEvent[] = [];

  results.forEach((result, i) => {
    const name = sourceNames[i] || `source-${i}`;
    if (result.status === 'fulfilled') {
      sources[name] = { status: 'ok', count: result.value.length };
      allEvents.push(...result.value);
    } else {
      sources[name] = { status: 'error', count: 0 };
      console.error(`[Sweep] ${name} failed:`, result.reason?.message || result.reason);
    }
  });

  const okCount = Object.values(sources).filter(s => s.status === 'ok').length;
  console.log(`[Sweep] Data collection complete. ${allEvents.length} signals from ${okCount}/${sourceNames.length} sources.`);

  // Phase 3: AI Correlation Engine
  allEvents = await evaluateIntelligence(allEvents);

  // Store for delta computation
  previousEvents = lastSweepResult?.events || [];

  const sweepDurationMs = Date.now() - startTime;
  lastSweepResult = {
    events: allEvents,
    timestamp: new Date().toISOString(),
    sources,
    sweepDurationMs
  };

  console.log(`[Sweep] Complete in ${(sweepDurationMs / 1000).toFixed(1)}s.`);
  return allEvents;
}
