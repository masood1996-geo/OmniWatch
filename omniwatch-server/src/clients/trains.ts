import { OmniEvent } from './usgs';

// Amtrak Train Tracking — US rail network (from Shadowbroker)
// Public API, no key needed
export async function fetchAmtrakTrains(): Promise<OmniEvent[]> {
  try {
    const url = 'https://maps.amtrak.com/services/MapDataService/trains/getTrainsData';
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return [];

    const data = await response.json() as any;
    const events: OmniEvent[] = [];
    const features = data.features || [];

    for (const feature of features.slice(0, 40)) {
      const props = feature.properties;
      const coords = feature.geometry?.coordinates;
      if (!coords || !props) continue;

      events.push({
        id: `amtrak-${props.TrainNum}-${props.TrainState}`,
        source: 'amtrak',
        title: `🚂 ${props.RouteName || 'Amtrak'} #${props.TrainNum}`,
        severity: 'minor',
        eventType: 'infrastructure' as const,
        timestamp: props.LastValTS || new Date().toISOString(),
        coordinates: { longitude: coords[0], latitude: coords[1] },
        metadata: {
          trainNumber: props.TrainNum,
          route: props.RouteName,
          status: props.TrainState,
          speed: props.Velocity ? `${props.Velocity} mph` : 'N/A',
          heading: props.Heading
        }
      });
    }
    console.log(`[Amtrak] Fetched ${events.length} trains.`);
    return events;
  } catch (err) {
    console.warn('[Amtrak] Error:', err);
    return [];
  }
}

// European Rail — DigiTraffic Finland (from Shadowbroker)
export async function fetchEuropeanTrains(): Promise<OmniEvent[]> {
  try {
    const url = 'https://rata.digitraffic.fi/api/v1/train-locations/latest/';
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];

    const data = await response.json() as any;
    const events: OmniEvent[] = [];

    for (const train of data.slice(0, 30)) {
      if (!train.location?.coordinates) continue;

      events.push({
        id: `digitraffic-${train.trainNumber}`,
        source: 'digitraffic',
        title: `🚆 Finnish Rail #${train.trainNumber}`,
        severity: 'minor',
        eventType: 'infrastructure' as const,
        timestamp: train.timestamp || new Date().toISOString(),
        coordinates: {
          longitude: train.location.coordinates[0],
          latitude: train.location.coordinates[1]
        },
        metadata: {
          trainNumber: train.trainNumber,
          speed: train.speed ? `${train.speed} km/h` : 'N/A',
          departureDate: train.departureDate
        }
      });
    }
    console.log(`[DigiTraffic] Fetched ${events.length} European trains.`);
    return events;
  } catch (err) {
    console.warn('[DigiTraffic] Error:', err);
    return [];
  }
}
