'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import Map, { Marker, NavigationControl, Popup, type MapRef } from 'react-map-gl/maplibre';
import {
  Activity, AlertTriangle, CloudLightning, Crosshair, Factory, Flame, Mountain,
  Plane, Radio, Satellite, Ship, TrendingDown, Wind, Zap,
} from 'lucide-react';
import { ProvenanceRow } from './ProvenanceBadge';
import { hasCoordinates, severityColor } from '../lib/format';
import type { LiveTrack, OmniEvent, Severity } from '../lib/types';

const DARK_MATTER = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const VOYAGER = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const MARKER_CAP = 400;

const SEVERITY_ORDER: Record<Severity, number> = { critical: 3, major: 2, moderate: 1, minor: 0 };

function EventIcon({ event, size }: { event: OmniEvent; size: number }) {
  const color = severityColor(event.severity);
  const style = { filter: `drop-shadow(0 0 4px ${color})` };
  const common = { size, color, strokeWidth: 2.5, style };
  switch (event.eventType) {
    case 'fire': return <Flame {...common} />;
    case 'firmsfire': return <Flame {...common} color="#ff6b35" />;
    case 'earthquake': return <Activity {...common} />;
    case 'military': return <Crosshair {...common} />;
    case 'flight': return <Plane {...common} color="#60a5fa" strokeWidth={2} />;
    case 'conflict': return <AlertTriangle {...common} />;
    case 'weather': return <CloudLightning {...common} />;
    case 'satellite': return <Satellite {...common} color="#818cf8" strokeWidth={2} />;
    case 'maritime': return <Ship {...common} color="#06b6d4" strokeWidth={2} />;
    case 'economics': return <TrendingDown {...common} color="#10b981" strokeWidth={2} />;
    case 'radiation': return <Radio {...common} color="#eab308" />;
    case 'volcano': return <Mountain {...common} color="#f43f5e" />;
    case 'airquality': return <Wind {...common} color="#94a3b8" strokeWidth={2} />;
    case 'spaceweather': return <Zap {...common} color="#c084fc" />;
    default: return <Factory {...common} color="#64748b" strokeWidth={2} />;
  }
}

export function EventPopupContent({ event }: { event: OmniEvent }) {
  const meta = Object.entries(event.metadata || {}).filter(([k]) => k !== 'alertDispatched').slice(0, 8);
  return (
    <div style={{ background: '#111', color: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', minWidth: '260px', maxWidth: '340px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <EventIcon event={event} size={18} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '13px', lineHeight: 1.3 }}>{event.title}</div>
          <div style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace', marginTop: '2px' }}>
            {event.source.toUpperCase()} • {event.severity.toUpperCase()}
          </div>
        </div>
      </div>
      <div style={{ fontSize: '11px', color: '#888', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
        <Row label="LOCATION" value={event.coordinates ? `${event.coordinates.latitude.toFixed(4)}, ${event.coordinates.longitude.toFixed(4)}` : 'not geolocated'} />
        <Row label="EVENT TIME" value={event.sourceTimestamp ? new Date(event.sourceTimestamp).toLocaleString() : 'not provided'} />
        {meta.map(([key, val]) => (
          <Row key={key} label={key.toUpperCase()} value={String(val)} />
        ))}
      </div>
      <ProvenanceRow provenance={event.provenance} />
      {Boolean(event.metadata?.correlation) && (
        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(239, 68, 68, 0.15)', borderLeft: '2px solid #ef4444', color: '#ef4444', fontSize: '11px', borderRadius: '4px' }}>
          <AlertTriangle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          {String(event.metadata.correlation)}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', borderBottom: '1px solid #1a1a1a', paddingBottom: '3px' }}>
      <span>{label}</span>
      <span style={{ color: '#ddd', maxWidth: '190px', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

interface MapViewProps {
  events: OmniEvent[];
  liveTracks: LiveTrack[];
  showAircraft: boolean;
  showVessels: boolean;
  selected: OmniEvent | null;
  onSelect: (event: OmniEvent | null) => void;
  visualMode: string;
  focusToken: number;
}

export function MapView({ events, liveTracks, showAircraft, showVessels, selected, onSelect, visualMode, focusToken }: MapViewProps) {
  const mapRef = useRef<MapRef | null>(null);

  const plotted = useMemo(() => {
    const withCoords = events.filter(hasCoordinates);
    const capped = withCoords.length > MARKER_CAP
      ? [...withCoords].sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]).slice(0, MARKER_CAP)
      : withCoords;
    const seen = new Set<string>();
    return capped.filter(e => {
      const key = `${e.coordinates!.latitude.toFixed(3)},${e.coordinates!.longitude.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [events]);

  useEffect(() => {
    if (selected?.coordinates && mapRef.current) {
      mapRef.current.flyTo({ center: [selected.coordinates.longitude, selected.coordinates.latitude], zoom: Math.max(4, mapRef.current.getZoom()), duration: 900 });
    }
  }, [selected, focusToken]);

  const mapStyle = visualMode === 'satellite' ? VOYAGER : DARK_MATTER;
  const filterClass = visualMode === 'flir' || visualMode === 'nvg' || visualMode === 'crt' ? `map-style-${visualMode}` : '';

  return (
    <div className={filterClass} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 0, latitude: 20, zoom: 2.5 }}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />

        {plotted.map(event => (
          <Marker
            key={`marker-${event.id}`}
            longitude={event.coordinates!.longitude}
            latitude={event.coordinates!.latitude}
            anchor="center"
            onClick={e => { e.originalEvent.stopPropagation(); onSelect(event); }}
          >
            <div style={{ cursor: 'crosshair', padding: '3px' }}>
              <EventIcon event={event} size={event.severity === 'critical' ? 20 : 14} />
            </div>
          </Marker>
        ))}

        {showAircraft && liveTracks.filter(t => t.type === 'aircraft').map(track => (
          <Marker key={`live-${track.id}`} longitude={track.lon} latitude={track.lat} anchor="center"
            onClick={e => {
              e.originalEvent.stopPropagation();
              onSelect({
                id: track.id, source: 'opensky-live', title: `${track.callsign} | ${track.speed}kts | ${track.altitude?.toLocaleString()}ft`,
                severity: 'minor', eventType: 'flight', timestamp: new Date(track.timestamp).toISOString(), sourceTimestamp: new Date(track.timestamp).toISOString(),
                coordinates: { longitude: track.lon, latitude: track.lat },
                metadata: { callsign: track.callsign, speed: `${track.speed} kts`, altitude: `${track.altitude?.toLocaleString()} ft`, heading: `${Math.round(track.heading)}°`, origin: track.origin || 'Unknown', tracking: 'LIVE 15s' },
                provenance: { fetchClass: 'live', fetchedAt: new Date(track.timestamp).toISOString(), sourceTimestamp: new Date(track.timestamp).toISOString(), provider: 'OpenSky Network', sourceId: 'opensky', license: 'OpenSky Network terms (non-commercial, attribution)', attribution: 'OpenSky Network', confidence: 0.9 },
              });
            }}>
            <div style={{ transform: `rotate(${track.heading}deg)`, transition: 'all 8s linear', cursor: 'pointer', filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.7))', fontSize: '16px', lineHeight: 1 }}
              title={`${track.callsign} | ${track.speed}kts`}>
              ✈️
            </div>
          </Marker>
        ))}

        {showVessels && liveTracks.filter(t => t.type === 'vessel').map(track => (
          <Marker key={`live-${track.id}`} longitude={track.lon} latitude={track.lat} anchor="center"
            onClick={e => {
              e.originalEvent.stopPropagation();
              onSelect({
                id: track.id, source: 'ais-live', title: `${track.callsign} | ${track.speed}kts`,
                severity: 'minor', eventType: 'maritime', timestamp: new Date(track.timestamp).toISOString(), sourceTimestamp: null,
                coordinates: { longitude: track.lon, latitude: track.lat },
                metadata: { callsign: track.callsign, mmsi: track.mmsi, speed: `${track.speed} kts`, heading: `${Math.round(track.heading)}°`, tracking: 'AIS snapshot' },
                provenance: { fetchClass: 'live', fetchedAt: new Date(track.timestamp).toISOString(), sourceTimestamp: null, provider: 'AISStream.io', sourceId: 'aisstream', license: 'AISStream terms (attribution)', attribution: 'AISStream.io', confidence: 0.75 },
              });
            }}>
            <div style={{ transform: `rotate(${track.heading}deg)`, transition: 'all 8s linear', cursor: 'pointer', filter: 'drop-shadow(0 0 3px rgba(34,197,94,0.6))', fontSize: '14px', lineHeight: 1 }}
              title={`${track.callsign} | ${track.speed}kts`}>
              🚢
            </div>
          </Marker>
        ))}

        {selected && hasCoordinates(selected) && (
          <Popup
            longitude={selected.coordinates!.longitude}
            latitude={selected.coordinates!.latitude}
            anchor="top"
            onClose={() => onSelect(null)}
            closeOnClick={false}
            maxWidth="360px"
          >
            <EventPopupContent event={selected} />
          </Popup>
        )}
      </Map>
      <div style={{ position: 'absolute', top: '56px', right: '12px', zIndex: 5, fontSize: '9px', color: '#555', fontFamily: 'monospace', textAlign: 'right' }}>
        {plotted.length} mapped / {events.length} filtered events
        {events.length - plotted.length > 0 && <div>{events.length - plotted.length} without map location (see feed)</div>}
      </div>
    </div>
  );
}
