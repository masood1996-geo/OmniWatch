export interface OmniEvent {
  id: string;
  source: string;
  title: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  coordinates: { longitude: number; latitude: number };
  timestamp: string;
  eventType:
    | 'earthquake' | 'fire' | 'military' | 'conflict'
    | 'weather' | 'satellite' | 'maritime' | 'economics'
    | 'radiation' | 'infrastructure' | 'volcano' | 'airquality'
    | 'spaceweather' | 'flight' | 'firmsfire'
    | 'cyber' | 'health' | 'humanitarian' | 'sanctions'
    | 'social' | 'technology';
  metadata: Record<string, any>;
}

export async function fetchEarthquakes(): Promise<OmniEvent[]> {
  try {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    
    return data.features.map((feature: any): OmniEvent => {
      const mag = feature.properties.mag;
      let severity: 'minor' | 'moderate' | 'major' | 'critical' = 'minor';
      if (mag >= 4.0) severity = 'moderate';
      if (mag >= 5.5) severity = 'major';
      if (mag >= 7.0) severity = 'critical';
  
      return {
        id: `usgs-${feature.id}`,
        source: 'usgs',
        title: feature.properties.title,
        severity,
        coordinates: {
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
        },
        timestamp: new Date(feature.properties.time).toISOString(),
        eventType: 'earthquake',
        metadata: {
          magnitude: mag,
          depth: feature.geometry.coordinates[2]
        }
      };
    });
  } catch (error) {
    console.error('[USGS] Error fetching earthquakes:', error);
    return [];
  }
}
