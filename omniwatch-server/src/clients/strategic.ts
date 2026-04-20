import { OmniEvent } from './usgs';

// Global Power Plants — WRI 35,000+ facility database (from Shadowbroker)
// We use a curated subset of the most strategically significant facilities
export async function fetchPowerPlants(): Promise<OmniEvent[]> {
  // WRI Global Power Plant Database — top strategic facilities by capacity
  const plants = [
    // Nuclear
    { name: 'Zaporizhzhia NPP', type: 'Nuclear', cap: 5700, lon: 34.59, lat: 47.51, country: 'UA' },
    { name: 'Bruce Nuclear', type: 'Nuclear', cap: 6232, lon: -81.60, lat: 44.33, country: 'CA' },
    { name: 'Kashiwazaki-Kariwa', type: 'Nuclear', cap: 7965, lon: 138.60, lat: 37.43, country: 'JP' },
    { name: 'Kori Nuclear', type: 'Nuclear', cap: 6040, lon: 129.34, lat: 35.46, country: 'KR' },
    { name: 'Gravelines', type: 'Nuclear', cap: 5460, lon: 2.11, lat: 51.02, country: 'FR' },
    { name: 'Palo Verde', type: 'Nuclear', cap: 3937, lon: -112.86, lat: 33.39, country: 'US' },
    { name: 'Tianwan', type: 'Nuclear', cap: 4340, lon: 119.46, lat: 34.69, country: 'CN' },
    { name: 'Kudankulam', type: 'Nuclear', cap: 2000, lon: 77.71, lat: 8.17, country: 'IN' },
    // Hydro
    { name: 'Three Gorges Dam', type: 'Hydro', cap: 22500, lon: 111.00, lat: 30.82, country: 'CN' },
    { name: 'Itaipu Dam', type: 'Hydro', cap: 14000, lon: -54.59, lat: -25.41, country: 'BR/PY' },
    { name: 'Guri Dam', type: 'Hydro', cap: 10235, lon: -62.98, lat: 7.76, country: 'VE' },
    // Gas/Oil critical
    { name: 'Shoaiba Power', type: 'Oil', cap: 5600, lon: 39.08, lat: 20.68, country: 'SA' },
    { name: 'Surgut-2 GRES', type: 'Gas', cap: 5597, lon: 73.52, lat: 61.27, country: 'RU' },
    { name: 'West Burton', type: 'Gas', cap: 2012, lon: -0.81, lat: 53.37, country: 'GB' },
    { name: 'Taichung Power', type: 'Coal', cap: 5788, lon: 120.48, lat: 24.21, country: 'TW' },
    // Renewables mega
    { name: 'Bhadla Solar Park', type: 'Solar', cap: 2245, lon: 71.92, lat: 27.54, country: 'IN' },
    { name: 'Gansu Wind Farm', type: 'Wind', cap: 8000, lon: 95.77, lat: 40.14, country: 'CN' },
    { name: 'Hornsea Wind Farm', type: 'Wind', cap: 2852, lon: 1.80, lat: 53.88, country: 'GB' },
  ];

  return plants.map((p, i) => ({
    id: `powerplant-${i}`,
    source: 'wri-gppd',
    title: `⚡ ${p.name} (${p.type}, ${p.cap} MW)`,
    severity: (p.type === 'Nuclear' ? 'major' : 'minor') as OmniEvent['severity'],
    eventType: 'infrastructure' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: p.lon, latitude: p.lat },
    metadata: {
      type: p.type,
      capacity: `${p.cap} MW`,
      country: p.country,
      dataset: 'WRI Global Power Plant Database'
    }
  }));
}

// Military Bases — Global military installations (from Shadowbroker)
export async function fetchMilitaryBases(): Promise<OmniEvent[]> {
  const bases = [
    // US
    { name: 'Ramstein AB', lon: 7.60, lat: 49.44, country: 'DE', type: 'USAF' },
    { name: 'Camp Humphreys', lon: 127.05, lat: 36.96, country: 'KR', type: 'US Army' },
    { name: 'Yokota AB', lon: 139.35, lat: 35.75, country: 'JP', type: 'USAF' },
    { name: 'Diego Garcia', lon: 72.41, lat: -7.32, country: 'IO', type: 'USN/USAF' },
    { name: 'Al Udeid AB', lon: 51.31, lat: 25.12, country: 'QA', type: 'USAF' },
    { name: 'Incirlik AB', lon: 35.43, lat: 37.00, country: 'TR', type: 'USAF' },
    { name: 'Camp Lemonnier', lon: 43.15, lat: 11.55, country: 'DJ', type: 'USN' },
    { name: 'Guantanamo Bay', lon: -75.13, lat: 19.91, country: 'CU', type: 'USN' },
    { name: 'Thule AB', lon: -68.70, lat: 76.53, country: 'GL', type: 'USSF' },
    // Russia
    { name: 'Kaliningrad-Chkalovsk', lon: 20.35, lat: 54.77, country: 'RU', type: 'RuAF' },
    { name: 'Hmeimim AB', lon: 35.95, lat: 35.41, country: 'SY', type: 'RuAF' },
    { name: 'Tartus Naval', lon: 35.89, lat: 34.89, country: 'SY', type: 'RuN' },
    { name: 'Sevastopol Naval', lon: 33.53, lat: 44.62, country: 'UA/RU', type: 'RuN' },
    // China
    { name: 'Djibouti Support', lon: 43.09, lat: 11.59, country: 'DJ', type: 'PLA' },
    { name: 'Fiery Cross Reef', lon: 112.89, lat: 9.55, country: 'SCS', type: 'PLA Navy' },
    { name: 'Mischief Reef', lon: 115.54, lat: 9.90, country: 'SCS', type: 'PLA Navy' },
    // Other
    { name: 'Akrotiri RAF', lon: 32.99, lat: 34.59, country: 'CY', type: 'RAF' },
    { name: 'Pine Gap', lon: 133.74, lat: -23.80, country: 'AU', type: 'CIA/ASD' },
    { name: 'Dimona/Negev', lon: 35.15, lat: 31.00, country: 'IL', type: 'IDF/Nuclear' },
    { name: 'Natanz', lon: 51.73, lat: 33.73, country: 'IR', type: 'Nuclear' },
  ];

  return bases.map((b, i) => ({
    id: `milbase-${i}`,
    source: 'mil-db',
    title: `🏗️ ${b.name} (${b.type})`,
    severity: 'moderate' as OmniEvent['severity'],
    eventType: 'military' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: b.lon, latitude: b.lat },
    metadata: {
      baseType: b.type,
      country: b.country,
      dataset: 'Global Military Installation Database'
    }
  }));
}

// Data Centers — 2000+ global (from Shadowbroker)
// Using curated list of largest/most strategic facilities
export async function fetchDataCenters(): Promise<OmniEvent[]> {
  const dcs = [
    { name: 'The Citadel (Switch)', city: 'Tahoe Reno', lon: -119.77, lat: 39.53, operator: 'Switch', mw: 650 },
    { name: 'Lakeside Technology', city: 'Chicago', lon: -87.63, lat: 41.88, operator: 'Digital Realty', mw: 100 },
    { name: 'Ashburn VA Cluster', city: 'Ashburn', lon: -77.49, lat: 39.04, operator: 'Multiple', mw: 2000 },
    { name: 'LINX/Telehouse', city: 'London Docklands', lon: -0.00, lat: 51.51, operator: 'KDDI', mw: 90 },
    { name: 'Equinix SG3', city: 'Singapore', lon: 103.83, lat: 1.32, operator: 'Equinix', mw: 25 },
    { name: 'Equinix TY5', city: 'Tokyo', lon: 139.70, lat: 35.69, operator: 'Equinix', mw: 18 },
    { name: 'DE-CIX Frankfurt', city: 'Frankfurt', lon: 8.68, lat: 50.11, operator: 'Interxion', mw: 130 },
    { name: 'AMS-IX', city: 'Amsterdam', lon: 4.90, lat: 52.37, operator: 'Equinix', mw: 75 },
    { name: 'Alibaba Zhangbei', city: 'Hebei', lon: 114.72, lat: 41.16, operator: 'Alibaba', mw: 150 },
    { name: 'Google Council Bluffs', city: 'Iowa', lon: -95.86, lat: 41.26, operator: 'Google', mw: 250 },
    { name: 'Microsoft Quincy', city: 'Washington', lon: -119.85, lat: 47.23, operator: 'Microsoft', mw: 200 },
    { name: 'AWS US-East-1', city: 'Virginia', lon: -77.46, lat: 39.04, operator: 'Amazon', mw: 500 },
    { name: 'Meta Luleå', city: 'Luleå', lon: 22.15, lat: 65.58, operator: 'Meta', mw: 120 },
    { name: 'OVHcloud Roubaix', city: 'Roubaix', lon: 3.18, lat: 50.69, operator: 'OVH', mw: 45 },
    { name: 'Baidu Yangquan', city: 'Shanxi', lon: 113.57, lat: 37.86, operator: 'Baidu', mw: 100 },
  ];

  return dcs.map((dc, i) => ({
    id: `dc-${i}`,
    source: 'datacenter-db',
    title: `🖥️ ${dc.name} (${dc.operator}, ${dc.mw}MW)`,
    severity: 'minor' as OmniEvent['severity'],
    eventType: 'infrastructure' as const,
    timestamp: new Date().toISOString(),
    coordinates: { longitude: dc.lon, latitude: dc.lat },
    metadata: {
      operator: dc.operator,
      city: dc.city,
      capacity: `${dc.mw} MW`,
      dataset: 'Global Data Center Map'
    }
  }));
}
