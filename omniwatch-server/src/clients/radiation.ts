import { OmniEvent } from './usgs';

export async function fetchRadiation(): Promise<OmniEvent[]> {
    // Simulating RadMon network feeds near key reactors
    return [
       {
           id: 'radmon-zaporizhzhia',
           source: 'radmon',
           title: 'Zaporizhzhia NPP Sensor Node',
           severity: 'moderate',
           eventType: 'radiation' as any,
           timestamp: new Date().toISOString(),
           coordinates: { longitude: 34.58 , latitude: 47.51 },
           metadata: { cpm: '14.2 CPM', status: 'Elevated Background' }
       }
    ];
}
