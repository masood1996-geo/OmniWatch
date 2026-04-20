import { OmniEvent } from './usgs';
import WebSocket from 'ws';

export async function fetchMaritime(): Promise<OmniEvent[]> {
    const key = process.env.AISSTREAM_API_KEY;
    if (!key) return [];
    
    return new Promise((resolve) => {
        const events: OmniEvent[] = [];
        try {
            const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");

            socket.on('open', function () {
                const subscriptionMessage = {
                    Apikey: key,
                    BoundingBoxes: [
                        [[12.0, 110.0], [22.0, 120.0]], // South China Sea
                        [[41.0, 27.0], [46.0, 41.0]],   // Black Sea
                        [[23.0, 50.0], [26.0, 55.0]]    // Persian Gulf
                    ]
                };
                socket.send(JSON.stringify(subscriptionMessage));
            });

            socket.on('message', function (dataRaw) {
                try {
                   const data = JSON.parse(dataRaw.toString());
                   if (data.MessageType === "PositionReport" && data.Message?.PositionReport) {
                       const msg = data.Message.PositionReport;
                       if (events.length > 20) return; // Prevent map overloading
                       
                       if (!events.find(e => e.id === `maritime-${msg.UserID}`)) {
                           events.push({
                              id: `maritime-${msg.UserID}`,
                              source: 'aisstream',
                              title: `Naval Vessel (MMSI: ${msg.UserID})`,
                              severity: 'minor',
                              eventType: 'maritime' as any,
                              timestamp: new Date().toISOString(),
                              coordinates: { longitude: msg.Longitude, latitude: msg.Latitude },
                              metadata: { sog: msg.Sog, cog: msg.Cog, truesHeading: msg.TrueHeading }
                           });
                       }
                   }
                } catch(e) {}
            });
            
            // We sample the live websocket stream for 4 seconds then return the snapshot.
            setTimeout(() => {
                socket.close();
                resolve(events);
            }, 4000);
            
            socket.on('error', () => { resolve(events); });
        } catch(e) {
            resolve(events);
        }
    });
}
