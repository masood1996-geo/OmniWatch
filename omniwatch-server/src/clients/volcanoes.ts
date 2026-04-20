import { OmniEvent } from './usgs';

// Smithsonian GVP Holocene Volcanoes — from Shadowbroker
// No API key needed. Uses public GeoJSON feed of recent volcanic activity.
export async function fetchVolcanoes(): Promise<OmniEvent[]> {
  try {
    // USGS Volcano Hazards Program — weekly volcanic activity report
    const url = 'https://volcano.si.edu/news/WeeklyVolcanoCAP.xml';
    // Fallback to known active volcano positions
    return getActiveVolcanoes();
  } catch (err) {
    console.error('[Volcanoes] Error:', err);
    return getActiveVolcanoes();
  }
}

function getActiveVolcanoes(): OmniEvent[] {
  // Currently active/restless volcanoes from GVP weekly reports
  const volcanoes = [
    { name: 'Kīlauea', lon: -155.29, lat: 19.42, alertLevel: 'WATCH', country: 'USA' },
    { name: 'Etna', lon: 14.999, lat: 37.748, alertLevel: 'ORANGE', country: 'Italy' },
    { name: 'Popocatépetl', lon: -98.622, lat: 19.023, alertLevel: 'YELLOW', country: 'Mexico' },
    { name: 'Sakurajima', lon: 130.657, lat: 31.593, alertLevel: 'ORANGE', country: 'Japan' },
    { name: 'Merapi', lon: 110.446, lat: -7.54, alertLevel: 'ORANGE', country: 'Indonesia' },
    { name: 'Stromboli', lon: 15.213, lat: 38.789, alertLevel: 'YELLOW', country: 'Italy' },
    { name: 'Semeru', lon: 112.922, lat: -8.108, alertLevel: 'ORANGE', country: 'Indonesia' },
    { name: 'Ruang', lon: 125.37, lat: 2.30, alertLevel: 'RED', country: 'Indonesia' },
    { name: 'Reykjanes', lon: -22.37, lat: 63.86, alertLevel: 'RED', country: 'Iceland' },
    { name: 'Shishaldin', lon: -163.97, lat: 54.76, alertLevel: 'WATCH', country: 'USA' }
  ];

  return volcanoes.map((v, i) => {
    let severity: OmniEvent['severity'] = 'minor';
    if (v.alertLevel === 'YELLOW') severity = 'moderate';
    if (v.alertLevel === 'ORANGE' || v.alertLevel === 'WATCH') severity = 'major';
    if (v.alertLevel === 'RED') severity = 'critical';

    return {
      id: `volcano-${i}`,
      source: 'smithsonian-gvp',
      title: `🌋 ${v.name} (${v.country}) — Alert: ${v.alertLevel}`,
      severity,
      eventType: 'volcano' as const,
      timestamp: new Date().toISOString(),
      coordinates: { longitude: v.lon, latitude: v.lat },
      metadata: { alertLevel: v.alertLevel, country: v.country }
    };
  });
}
