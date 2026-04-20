import { OmniEvent } from './usgs';

export async function fetchWeatherAlerts(): Promise<OmniEvent[]> {
  try {
    const response = await fetch('https://api.weather.gov/alerts/active', {
      headers: { 'User-Agent': 'OmniWatch/1.0 (admin@omniwatch.local)' }
    });
    if (!response.ok) return [];
    
    const data = await response.json() as any;
    const events: OmniEvent[] = [];
    
    for (const feature of data.features || []) {
      if (!feature.geometry || feature.geometry.type !== 'Polygon') continue;
      
      // Simple centroid approximation for polygon
      const coords = feature.geometry.coordinates[0][0];
      if (!coords) continue;
      
      const props = feature.properties;
      
      let severity: 'minor' | 'moderate' | 'major' | 'critical' = 'minor';
      if (props.severity === 'Severe') severity = 'major';
      if (props.severity === 'Extreme') severity = 'critical';
      if (props.severity === 'Moderate') severity = 'moderate';
      
      events.push({
        id: feature.id || `noaa-${Date.now()}-${Math.random()}`,
        source: 'noaa',
        title: props.event || 'Severe Weather Alert',
        severity,
        coordinates: {
          longitude: coords[0],
          latitude: coords[1]
        },
        timestamp: props.effective || new Date().toISOString(),
        eventType: 'fire', // using fire icon as generic warning for now, or map it properly in frontend
        metadata: {
          headline: props.headline,
          description: props.description,
          certainty: props.certainty
        }
      });
      // Override event type to specific weather event
      events[events.length - 1].eventType = 'weather' as any;
    }
    
    return events;
  } catch (error) {
    console.error('[NOAA] Error fetching weather alerts:', error);
    return [];
  }
}
