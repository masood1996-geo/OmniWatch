"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Map, { Marker, NavigationControl, Popup } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Activity, Flame, ShieldAlert, Crosshair, CloudLightning, FileText,
  Satellite, Eye, Tv, Map as MapIcon, Ship, TrendingDown, Radio,
  MessageSquare, Terminal, Factory, Mountain, Wind, Zap, Plane,
  Layers, ChevronDown, ChevronRight, RefreshCw, Wifi, WifiOff,
  Heart, AlertTriangle, Search, X, Anchor, Train, Camera, Globe,
  Shield, Database, Fish, Bug, Siren, Users, DollarSign, Fuel,
  BookOpen, Lock, Newspaper
} from 'lucide-react';

const DARK_MATTER = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const VOYAGER = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"; 

interface OmniEvent {
  id: string;
  source: string;
  title: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  coordinates: { longitude: number; latitude: number };
  timestamp: string;
  eventType: string;
  metadata: Record<string, any>;
}

interface SourceStatus {
  [key: string]: { status: string; count: number };
}

// All toggleable layer definitions — matching Shadowbroker's 37+ layers
const LAYER_DEFS: { key: string; label: string; icon: any; color: string; types: string[]; sources?: string[] }[] = [
  // === Environment & Hazard ===
  { key: 'earthquake', label: 'Earthquakes', icon: Activity, color: '#f97316', types: ['earthquake'] },
  { key: 'fire', label: 'Wildfires (EONET)', icon: Flame, color: '#ef4444', types: ['fire'] },
  { key: 'firmsfire', label: 'FIRMS Fires (VIIRS)', icon: Flame, color: '#ff6b35', types: ['firmsfire'] },
  { key: 'volcano', label: 'Volcanoes', icon: Mountain, color: '#f43f5e', types: ['volcano'] },
  { key: 'weather', label: 'Severe Weather', icon: CloudLightning, color: '#a78bfa', types: ['weather'] },
  { key: 'radiation', label: 'Radiation Monitors', icon: Radio, color: '#eab308', types: ['radiation'] },
  { key: 'airquality', label: 'Air Quality (PM2.5)', icon: Wind, color: '#94a3b8', types: ['airquality'] },
  { key: 'spaceweather', label: 'Space Weather', icon: Zap, color: '#c084fc', types: ['spaceweather'] },
  // === Military & Conflict ===
  { key: 'military', label: 'Military Aircraft', icon: Crosshair, color: '#dc2626', types: ['military'], sources: ['adsb.lol'] },
  { key: 'milbases', label: 'Military Bases', icon: Shield, color: '#b91c1c', types: ['military'], sources: ['mil-db'] },
  { key: 'conflict', label: 'Conflict Events', icon: ShieldAlert, color: '#ef4444', types: ['conflict'], sources: ['gdelt', 'gdelt(mirror)'] },
  { key: 'ukraine', label: 'Ukraine Frontline', icon: ShieldAlert, color: '#fbbf24', types: ['conflict'], sources: ['deepstate'] },
  { key: 'carriers', label: 'Carrier Strike Groups', icon: Anchor, color: '#1d4ed8', types: ['maritime'], sources: ['carrier-osint'] },
  // === Maritime ===
  { key: 'maritime', label: 'Maritime Vessels', icon: Ship, color: '#06b6d4', types: ['maritime'], sources: ['aisstream'] },
  { key: 'fishing', label: 'Fishing Activity', icon: Fish, color: '#0891b2', types: ['maritime'], sources: ['global-fishing-watch'] },
  // === Aviation ===
  { key: 'flight', label: 'Commercial Flights', icon: Plane, color: '#60a5fa', types: ['flight'] },
  { key: 'satellite', label: 'Military Satellites', icon: Satellite, color: '#818cf8', types: ['satellite'] },
  // === Economics ===
  { key: 'economics', label: 'Markets & Finance', icon: TrendingDown, color: '#10b981', types: ['economics'], sources: ['finnhub', 'yahoo-finance', 'fred'] },
  { key: 'predictions', label: 'Prediction Markets', icon: Globe, color: '#34d399', types: ['economics'], sources: ['polymarket'] },
  // === Infrastructure ===
  { key: 'powerplants', label: 'Power Plants', icon: Zap, color: '#f59e0b', types: ['infrastructure'], sources: ['wri-gppd'] },
  { key: 'datacenters', label: 'Data Centers', icon: Database, color: '#8b5cf6', types: ['infrastructure'], sources: ['datacenter-db'] },
  { key: 'ioda', label: 'Internet Outages', icon: WifiOff, color: '#6b7280', types: ['infrastructure'], sources: ['ioda'] },
  { key: 'cctv', label: 'CCTV Cameras', icon: Camera, color: '#22d3ee', types: ['infrastructure'], sources: ['tfl-jamcam', 'nyc-dot', 'sg-lta', 'cctv-mesh'] },
  // === Transport ===
  { key: 'trains', label: 'Rail Networks', icon: Train, color: '#a3e635', types: ['infrastructure'], sources: ['amtrak', 'digitraffic'] },
  // === SIGINT ===
  { key: 'satnogs', label: 'SatNOGS Stations', icon: Satellite, color: '#14b8a6', types: ['infrastructure'], sources: ['satnogs'] },
  { key: 'tinygs', label: 'TinyGS LoRa', icon: Radio, color: '#2dd4bf', types: ['infrastructure'], sources: ['tinygs'] },
  { key: 'kiwisdr', label: 'KiwiSDR Receivers', icon: Radio, color: '#5eead4', types: ['infrastructure'], sources: ['kiwisdr'] },
  // === General ===
  { key: 'infra_other', label: 'Other Infrastructure', icon: Factory, color: '#64748b', types: ['infrastructure'], sources: ['overpass(terramind)'] },
  // === CRUCIX TIER: Cyber & Security ===
  { key: 'cyber', label: 'Cyber Threats (CISA)', icon: Bug, color: '#f43f5e', types: ['cyber'] },
  { key: 'sanctions', label: 'Sanctions Watch', icon: Lock, color: '#dc2626', types: ['sanctions'] },
  { key: 'cables', label: 'Submarine Cables', icon: Globe, color: '#0ea5e9', types: ['infrastructure'], sources: ['cloudflare-radar'] },
  // === CRUCIX TIER: Health & Humanitarian ===
  { key: 'health', label: 'WHO Health Alerts', icon: Siren, color: '#f97316', types: ['health'] },
  { key: 'humanitarian', label: 'ReliefWeb (UN OCHA)', icon: Heart, color: '#ec4899', types: ['humanitarian'] },
  { key: 'epa', label: 'EPA RadNet', icon: Radio, color: '#d97706', types: ['radiation'], sources: ['epa-radnet'] },
  // === CRUCIX TIER: Economics Extended ===
  { key: 'treasury', label: 'US Treasury Yields', icon: DollarSign, color: '#22c55e', types: ['economics'], sources: ['us-treasury'] },
  { key: 'bls', label: 'BLS Employment', icon: Users, color: '#3b82f6', types: ['economics'], sources: ['bls'] },
  { key: 'energy', label: 'Energy (EIA/SPR)', icon: Fuel, color: '#f59e0b', types: ['economics'], sources: ['eia'] },
  { key: 'spending', label: 'Federal Spending', icon: DollarSign, color: '#6366f1', types: ['economics'], sources: ['usaspending'] },
  // === CRUCIX TIER: Social Intelligence ===
  { key: 'social', label: 'Social Intel (Reddit)', icon: Newspaper, color: '#ff4500', types: ['social'] },
  { key: 'acled', label: 'ACLED Conflicts', icon: ShieldAlert, color: '#991b1b', types: ['conflict'], sources: ['acled'] },
  // === CRUCIX TIER: Technology ===
  { key: 'patents', label: 'Patent Intelligence', icon: BookOpen, color: '#a855f7', types: ['technology'] },
];

export default function OmniWatchDashboard() {
  const [events, setEvents] = useState<OmniEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [visualMode, setVisualMode] = useState<'standard' | 'satellite' | 'flir' | 'nvg' | 'crt'>('standard');
  const [selectedEvent, setSelectedEvent] = useState<OmniEvent | null>(null);
  const [sweepDuration, setSweepDuration] = useState(0);
  const [sourcesStatus, setSourcesStatus] = useState<SourceStatus>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Layer toggles — all on by default (from Shadowbroker pattern)
  const [enabledLayers, setEnabledLayers] = useState<Set<string>>(new Set(LAYER_DEFS.map(l => l.key)));
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);

  // Source status panel
  const [statusOpen, setStatusOpen] = useState(false);

  // J.A.R.V.I.S Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLog, setChatLog] = useState<{sender: string, text: string}[]>([{sender: 'AI', text: 'Initializing GeoScience neural interface... Online.'}]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // SSE Connection
  const [sseConnected, setSseConnected] = useState(false);

  // Live Tracking — fast poll for aircraft + vessels
  interface LiveTrack { id: string; type: 'aircraft' | 'vessel'; callsign: string; lat: number; lon: number; heading: number; speed: number; altitude?: number; origin?: string; timestamp: number; }
  const [liveTracks, setLiveTracks] = useState<LiveTrack[]>([]);
  const [liveTrackCount, setLiveTrackCount] = useState({ aircraft: 0, vessels: 0 });

  const fetchLiveTracks = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:4100/api/live-tracking');
      if (res.ok) {
        const data = await res.json();
        setLiveTracks(data.tracks || []);
        setLiveTrackCount({ aircraft: data.aircraft || 0, vessels: data.vessels || 0 });
      }
    } catch {}
  }, []);

  // Fast poll live tracking every 10 seconds
  useEffect(() => {
    fetchLiveTracks();
    const intv = setInterval(fetchLiveTracks, 10000);
    return () => clearInterval(intv);
  }, [fetchLiveTracks]);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:4100/api/events');
      if (res.ok) {
         const data = await res.json();
         setEvents(data.events);
         setLastUpdate(data.timestamp);
         setSweepDuration(data.sweepDurationMs || 0);
         setSourcesStatus(data.sources || {});
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // SSE connection for real-time updates
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout;

    function connect() {
      try {
        es = new EventSource('http://localhost:4100/api/stream');
        es.onopen = () => {
          console.log('[SSE] Connected');
          setSseConnected(true);
        };
        es.onmessage = (event) => {
          setSseConnected(true); // Confirm connected on each message
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'sweep_complete') {
              fetchEvents();
            }
          } catch {}
        };
        es.onerror = () => {
          // EventSource auto-reconnects, only mark disconnected if fully closed
          if (es?.readyState === EventSource.CLOSED) {
            setSseConnected(false);
            // Retry after 5s
            retryTimeout = setTimeout(connect, 5000);
          }
        };
      } catch {
        setSseConnected(false);
        retryTimeout = setTimeout(connect, 5000);
      }
    }

    connect();
    return () => { 
      es?.close(); 
      clearTimeout(retryTimeout);
    };
  }, [fetchEvents]);

  useEffect(() => {
    fetchEvents();
    const intv = setInterval(fetchEvents, 30000);
    return () => clearInterval(intv);
  }, [fetchEvents]);

  const sendQuery = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    setChatLog(prev => [...prev, { sender: 'USER', text: msg }]);
    
    try {
       const res = await fetch('http://localhost:4100/api/chat', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ query: msg })
       });
       const data = await res.json();
       setChatLog(prev => [...prev, { sender: 'AI', text: data.reply }]);
    } catch (err) {
       setChatLog(prev => [...prev, { sender: 'AI', text: '[ERROR] Link to intelligence core severed.' }]);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, chatOpen]);

  const toggleLayer = (key: string) => {
    setEnabledLayers(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getEventIcon = (event: OmniEvent) => {
    const size = event.severity === 'critical' ? 20 : 14;
    let color = '#3b82f6';
    if (event.severity === 'critical') color = '#ef4444'; 
    else if (event.severity === 'major') color = '#f97316'; 
    else if (event.severity === 'moderate') color = '#facc15'; 

    const shadow = `drop-shadow(0 0 4px ${color})`;
    const style = { filter: shadow };

    switch (event.eventType) {
      case 'fire': return <Flame size={size} color={color} strokeWidth={2.5} style={style}/>;
      case 'firmsfire': return <Flame size={size} color={'#ff6b35'} strokeWidth={2.5} style={style}/>;
      case 'earthquake': return <Activity size={size} color={color} strokeWidth={2.5} style={style}/>;
      case 'military': return <Crosshair size={size} color={color} strokeWidth={2.5} style={style}/>;
      case 'flight': return <Plane size={size} color={'#60a5fa'} strokeWidth={2} style={style}/>;
      case 'conflict': return <ShieldAlert size={size} color={color} strokeWidth={2.5} style={style}/>;
      case 'weather': return <CloudLightning size={size} color={color} strokeWidth={2.5} style={style}/>;
      case 'satellite': return <Satellite size={size} color={'#818cf8'} strokeWidth={2} style={style}/>;
      case 'maritime': return <Ship size={size} color={'#06b6d4'} strokeWidth={2} style={style}/>;
      case 'economics': return <TrendingDown size={size} color={'#10b981'} strokeWidth={2} style={style}/>;
      case 'radiation': return <Radio size={size} color={'#eab308'} strokeWidth={2.5} style={style}/>;
      case 'volcano': return <Mountain size={size} color={'#f43f5e'} strokeWidth={2.5} style={style}/>;
      case 'airquality': return <Wind size={size} color={'#94a3b8'} strokeWidth={2} style={style}/>;
      case 'spaceweather': return <Zap size={size} color={'#c084fc'} strokeWidth={2.5} style={style}/>;
      case 'infrastructure': return <Factory size={size} color={'#64748b'} strokeWidth={2} style={style}/>;
      default: return <div style={{width: 8, height: 8, backgroundColor: color, borderRadius: 4}}></div>;
    }
  };

  // Filter events by enabled layers — source-specific matching for granular control
  const visibleEvents = events.filter(ev => {
    // Find the most specific layer that matches (source-based layers take priority)
    const specificLayer = LAYER_DEFS.find(l => l.sources && l.sources.includes(ev.source) && l.types.includes(ev.eventType));
    if (specificLayer) return enabledLayers.has(specificLayer.key);
    // Fallback to type-only matching
    const typeLayer = LAYER_DEFS.find(l => !l.sources && l.types.includes(ev.eventType));
    if (typeLayer) return enabledLayers.has(typeLayer.key);
    return true; // Unknown types always shown
  });

  // Search/Locate filter
  const searchResults = searchQuery.trim()
    ? visibleEvents.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.source.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Stats
  const criticalCount = visibleEvents.filter(e => e.severity === 'critical').length;
  const majorCount = visibleEvents.filter(e => e.severity === 'major').length;
  const feedEvents = [...visibleEvents].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);
  const conflictEvents = events.filter(e => e.eventType === 'conflict').slice(0, 15);

  // Risk gauges from economics data
  const vixEvent = events.find(e => e.source === 'finnhub' || (e.source === 'yahoo-finance' && e.metadata?.symbol === '^VIX'));
  const spaceWx = events.find(e => e.eventType === 'spaceweather');

  const mapStyleObj = visualMode === 'satellite' ? VOYAGER : DARK_MATTER;

  // Determine CSS class for visual mode filter — only apply on the map wrapper
  const mapFilterClass = (visualMode === 'flir' || visualMode === 'nvg' || visualMode === 'crt')
    ? `map-style-${visualMode}`
    : '';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes sweepLine { 0% { left: 0; } 100% { left: 100%; } }
        .layer-toggle { display: flex; align-items: center; gap: 8px; padding: 5px 8px; cursor: pointer; border-radius: 6px; transition: background 0.15s; }
        .layer-toggle:hover { background: rgba(255,255,255,0.08); }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .gauge-bar { height: 4px; border-radius: 2px; transition: width 0.5s; }
        .risk-card { padding: 10px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); }
      `}</style>
      
      {/* ═══════════ TOP BAR ═══════════ */}
      <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '48px', zIndex: 30,
          background: 'rgba(5, 5, 5, 0.85)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px'
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sseConnected ? '#22c55e' : '#ef4444', animation: 'pulse 2s infinite' }} />
          <h1 style={{ margin: 0, fontSize: '16px', letterSpacing: '4px', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>OmniWatch</h1>
          <span style={{ fontSize: '10px', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>Global Intelligence</span>
        </div>

        {/* Center: Stats badges */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(59,130,246,0.15)', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.3)' }}>
            <span style={{ fontSize: '10px', color: '#60a5fa', letterSpacing: '1px' }}>SIGNALS</span>
            <span style={{ fontSize: '14px', color: '#fff', fontWeight: 700 }}>{visibleEvents.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(239,68,68,0.15)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span style={{ fontSize: '10px', color: '#ef4444', letterSpacing: '1px' }}>CRITICAL</span>
            <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 700 }}>{criticalCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(249,115,22,0.15)', borderRadius: '6px', border: '1px solid rgba(249,115,22,0.3)' }}>
            <span style={{ fontSize: '10px', color: '#f97316', letterSpacing: '1px' }}>MAJOR</span>
            <span style={{ fontSize: '14px', color: '#f97316', fontWeight: 700 }}>{majorCount}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
            <span style={{ fontSize: '10px', color: '#666', letterSpacing: '1px' }}>SOURCES</span>
            <span style={{ fontSize: '14px', color: '#fff', fontWeight: 700 }}>{Object.keys(sourcesStatus).length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(34,197,94,0.1)', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.3)' }}>
            <Plane size={12} color="#22c55e" style={{ animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '10px', color: '#22c55e', letterSpacing: '1px' }}>LIVE</span>
            <span style={{ fontSize: '12px', color: '#fff', fontWeight: 700 }}>{liveTrackCount.aircraft}✈ {liveTrackCount.vessels}🚢</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Visual Modes */}
          {(['standard', 'satellite', 'flir', 'nvg', 'crt'] as const).map(mode => {
            const icons = { standard: MapIcon, satellite: Satellite, flir: Flame, nvg: Eye, crt: Tv };
            const labels = { standard: 'STD', satellite: 'SAT', flir: 'FLIR', nvg: 'NVG', crt: 'CRT' };
            const Icon = icons[mode];
            return (
              <button key={mode} onClick={() => setVisualMode(mode)} style={{
                background: visualMode === mode ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                border: 'none', color: '#fff', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px'
              }}>
                <Icon size={14} /> {labels[mode]}
              </button>
            );
          })}
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
          {/* LOCATE search */}
          <button onClick={() => setSearchOpen(!searchOpen)} style={{ background: searchOpen ? '#3b82f6' : 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
            <Search size={14} /> LOCATE
          </button>
          {/* J.A.R.V.I.S */}
          <button onClick={() => setChatOpen(!chatOpen)} style={{ background: chatOpen ? '#ef4444' : 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}>
            <MessageSquare size={14} /> J.A.R.V.I.S
          </button>
        </div>
      </div>

      {/* ═══════════ LOCATE BAR (from Shadowbroker) ═══════════ */}
      {searchOpen && (
        <div style={{ position: 'absolute', top: '56px', left: '50%', transform: 'translateX(-50%)', zIndex: 25, width: '500px' }}>
          <div style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid #333', borderRadius: '10px', backdropFilter: 'blur(16px)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: '10px' }}>
              <Search size={16} color="#666" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus placeholder="Search signals by title, source..."
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', outline: 'none' }} />
              {searchQuery && <X size={16} color="#666" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />}
            </div>
            {searchResults.length > 0 && (
              <div style={{ borderTop: '1px solid #222', maxHeight: '300px', overflowY: 'auto' }}>
                {searchResults.slice(0, 10).map((ev, i) => (
                  <div key={i} onClick={() => { setSelectedEvent(ev); setSearchOpen(false); setSearchQuery(''); }}
                    style={{ padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #1a1a1a' }}>
                    {getEventIcon(ev)}
                    <div>
                      <div style={{ fontSize: '13px', color: '#ddd' }}>{ev.title}</div>
                      <div style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace' }}>{ev.source} • {ev.coordinates.latitude.toFixed(3)}, {ev.coordinates.longitude.toFixed(3)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ LEFT PANEL: Layer Toggles (from Shadowbroker 37-layer pattern) ═══════════ */}
      <div style={{
          position: 'absolute', top: '60px', left: '12px', zIndex: 20,
          background: 'rgba(8, 8, 8, 0.85)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
          width: '250px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        {/* Layer Toggle Header */}
        <div onClick={() => setLayerPanelOpen(!layerPanelOpen)}
          style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={14} color="#3b82f6" />
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#999', textTransform: 'uppercase' }}>Data Layers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: '#555' }}>{enabledLayers.size}/{LAYER_DEFS.length}</span>
            {layerPanelOpen ? <ChevronDown size={14} color="#666" /> : <ChevronRight size={14} color="#666" />}
          </div>
        </div>

        {layerPanelOpen && (
          <div style={{ padding: '6px' }}>
            {/* All On / All Off */}
            <div style={{ display: 'flex', gap: '4px', padding: '4px 8px', marginBottom: '4px' }}>
              <button onClick={() => setEnabledLayers(new Set(LAYER_DEFS.map(l => l.key)))} style={{ flex: 1, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 600 }}>ALL ON</button>
              <button onClick={() => setEnabledLayers(new Set())} style={{ flex: 1, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 600 }}>ALL OFF</button>
            </div>

            {LAYER_DEFS.map(layer => {
              const Icon = layer.icon;
              const enabled = enabledLayers.has(layer.key);
              const count = events.filter(e => {
                if (layer.sources) return layer.sources.includes(e.source) && layer.types.includes(e.eventType);
                return layer.types.includes(e.eventType);
              }).length;
              return (
                <div key={layer.key} className="layer-toggle" onClick={() => toggleLayer(layer.key)}
                  style={{ opacity: enabled ? 1 : 0.4 }}>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: enabled ? layer.color : 'transparent', border: `1px solid ${enabled ? layer.color : '#555'}`
                  }}>
                    {enabled && <div style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '2px' }} />}
                  </div>
                  <Icon size={14} color={enabled ? layer.color : '#555'} />
                  <span style={{ flex: 1, fontSize: '12px', color: enabled ? '#ccc' : '#555' }}>{layer.label}</span>
                  <span style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Source Status Panel */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div onClick={() => setStatusOpen(!statusOpen)}
            style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {sseConnected ? <Wifi size={14} color="#22c55e" /> : <WifiOff size={14} color="#ef4444" />}
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#999', textTransform: 'uppercase' }}>Sources</span>
            </div>
            {statusOpen ? <ChevronDown size={14} color="#666" /> : <ChevronRight size={14} color="#666" />}
          </div>
          {statusOpen && (
            <div style={{ padding: '6px 14px 12px' }}>
              {Object.entries(sourcesStatus).map(([name, info]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0' }}>
                  <div className="status-dot" style={{ background: info.status === 'ok' ? '#22c55e' : '#ef4444' }} />
                  <span style={{ flex: 1, fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>{name}</span>
                  <span style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>{info.count}</span>
                </div>
              ))}
              <div style={{ marginTop: '8px', fontSize: '10px', color: '#444', fontFamily: 'monospace' }}>
                Sweep: {(sweepDuration / 1000).toFixed(1)}s • {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '—'}
              </div>
            </div>
          )}
        </div>

        {/* Risk Gauges (from Crucix) */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#999', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Risk Gauges</span>
          
          {/* VIX */}
          <div className="risk-card" style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>VIX FEAR INDEX</span>
              <span style={{ fontSize: '11px', color: vixEvent ? (parseFloat(vixEvent.metadata?.value || '0') > 20 ? '#ef4444' : '#22c55e') : '#555', fontWeight: 700 }}>
                {vixEvent?.metadata?.value || '—'}
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div className="gauge-bar" style={{ width: `${Math.min(100, (parseFloat(vixEvent?.metadata?.value || '0') / 50) * 100)}%`, background: parseFloat(vixEvent?.metadata?.value || '0') > 20 ? '#ef4444' : '#22c55e' }} />
            </div>
          </div>

          {/* Space Weather Kp */}
          <div className="risk-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>SPACE WEATHER Kp</span>
              <span style={{ fontSize: '11px', color: spaceWx ? (parseFloat(spaceWx.metadata?.kpIndex || '0') >= 5 ? '#ef4444' : '#22c55e') : '#555', fontWeight: 700 }}>
                {spaceWx?.metadata?.kpIndex || '—'}
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div className="gauge-bar" style={{ width: `${Math.min(100, (parseFloat(spaceWx?.metadata?.kpIndex || '0') / 9) * 100)}%`, background: parseFloat(spaceWx?.metadata?.kpIndex || '0') >= 5 ? '#ef4444' : parseFloat(spaceWx?.metadata?.kpIndex || '0') >= 4 ? '#f97316' : '#22c55e' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ AI CHAT (J.A.R.V.I.S) ═══════════ */}
      {chatOpen && (
        <div style={{
           position: 'absolute', top: '56px', right: '12px', zIndex: 25, width: '380px', height: '450px',
           background: 'rgba(8, 8, 8, 0.92)', backdropFilter: 'blur(16px)',
           border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', flexDirection: 'column',
           boxShadow: '0 12px 48px rgba(0,0,0,0.8)'
        }}>
           <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
             <Terminal size={16} color="#ef4444" /> 
             <span style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '1.5px', color: '#999' }}>J.A.R.V.I.S AI TERMINAL</span>
             <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
               <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
               <span style={{ fontSize: '9px', color: '#555' }}>ONLINE</span>
             </div>
           </div>
           
           <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chatLog.map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender==='USER' ? 'flex-end' : 'flex-start' }}>
                  <span style={{ fontSize: '9px', color: '#555', marginBottom: '2px', fontFamily: 'monospace', letterSpacing: '1px' }}>{msg.sender}</span>
                  <div style={{ 
                     padding: '8px 12px', borderRadius: '8px', fontSize: '12px', lineHeight: 1.5,
                     background: msg.sender==='USER' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
                     border: msg.sender==='USER' ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                     color: '#ddd', maxWidth: '90%', wordWrap: 'break-word', whiteSpace: 'pre-wrap'
                  }}>
                     {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
           </div>

           <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px' }}>
             <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendQuery()} placeholder="Query intelligence..."
               style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 12px', borderRadius: '8px', outline: 'none', fontSize: '12px' }} />
             <button onClick={sendQuery} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' }}>TX</button>
           </div>
        </div>
      )}

      {/* ═══════════ RIGHT PANEL: Live Signal Feed ═══════════ */}
      <div style={{
        position: 'absolute', top: '56px', right: chatOpen ? '400px' : '12px', zIndex: 15,
        background: 'rgba(8, 8, 8, 0.85)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
        width: '280px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)', transition: 'right 0.3s ease'
      }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#999', textTransform: 'uppercase' }}>Live Signal Feed</span>
          <button onClick={fetchEvents} title="Force refresh" style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
            <RefreshCw size={14} color="#666" className={isLoading ? 'spin' : ''} />
          </button>
        </div>
        <div style={{ padding: '8px' }}>
          {feedEvents.map((ev, i) => (
            <div key={`feed-${ev.id}-${i}`} onClick={() => setSelectedEvent(ev)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', marginBottom: '2px', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ marginTop: '2px' }}>{getEventIcon(ev)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '12px', color: '#ddd', fontWeight: 500, lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{ev.title}</span>
                <span style={{ fontSize: '9px', color: '#555', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{ev.source.toUpperCase()} • {ev.severity.toUpperCase()} • {new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ MAP ═══════════ */}
      <div className={mapFilterClass} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
        <Map
          initialViewState={{ longitude: 0, latitude: 20, zoom: 2.5 }}
          mapStyle={mapStyleObj}
          maplibregl={maplibregl as any}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="bottom-right" />
          
          {visibleEvents.map((event, i) => (
            (event.coordinates.longitude && event.coordinates.latitude) ? (
              <Marker 
                key={`marker-${event.id}-${i}`}
                longitude={event.coordinates.longitude}
                latitude={event.coordinates.latitude}
                anchor="center"
                onClick={e => { e.originalEvent.stopPropagation(); setSelectedEvent(event); }}
              >
                <div style={{ cursor: 'crosshair', transition: 'transform 0.15s', padding: '3px' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    {getEventIcon(event)}
                </div>
              </Marker>
            ) : null
          ))}

          {/* ═══ LIVE AIRCRAFT — heading-rotated, smooth transitions ═══ */}
          {enabledLayers.has('flights') && liveTracks.filter(t => t.type === 'aircraft').map((track) => (
            <Marker key={`live-${track.id}`} longitude={track.lon} latitude={track.lat} anchor="center"
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedEvent({ id: track.id, source: 'opensky-live', title: `✈️ ${track.callsign} | ${track.speed}kts | ${track.altitude?.toLocaleString()}ft`, severity: 'minor', eventType: 'flight', timestamp: new Date(track.timestamp).toISOString(), coordinates: { longitude: track.lon, latitude: track.lat }, metadata: { callsign: track.callsign, speed: `${track.speed} kts`, altitude: `${track.altitude?.toLocaleString()} ft`, heading: `${Math.round(track.heading)}°`, origin: track.origin || 'Unknown', tracking: 'LIVE 10s' } });
              }}>
              <div style={{ transform: `rotate(${track.heading}deg)`, transition: 'all 8s linear', cursor: 'pointer', filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.7))', fontSize: '16px', lineHeight: 1 }}
                title={`${track.callsign} | ${track.speed}kts | FL${Math.round((track.altitude || 0) / 100)}`}>
                ✈️
              </div>
            </Marker>
          ))}

          {/* ═══ LIVE VESSELS — heading-rotated, smooth transitions ═══ */}
          {enabledLayers.has('maritime') && liveTracks.filter(t => t.type === 'vessel').map((track) => (
            <Marker key={`live-${track.id}`} longitude={track.lon} latitude={track.lat} anchor="center"
              onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedEvent({ id: track.id, source: 'ais-live', title: `🚢 ${track.callsign} | ${track.speed}kts`, severity: 'minor', eventType: 'maritime', timestamp: new Date(track.timestamp).toISOString(), coordinates: { longitude: track.lon, latitude: track.lat }, metadata: { callsign: track.callsign, speed: `${track.speed} kts`, heading: `${Math.round(track.heading)}°`, tracking: 'LIVE 10s' } });
              }}>
              <div style={{ transform: `rotate(${track.heading}deg)`, transition: 'all 8s linear', cursor: 'pointer', filter: 'drop-shadow(0 0 3px rgba(34,197,94,0.6))', fontSize: '14px', lineHeight: 1 }}
                title={`${track.callsign} | ${track.speed}kts | HDG ${Math.round(track.heading)}°`}>
                🚢
              </div>
            </Marker>
          ))}

          {selectedEvent && (
            <Popup
              longitude={selectedEvent.coordinates.longitude}
              latitude={selectedEvent.coordinates.latitude}
              anchor="top"
              onClose={() => setSelectedEvent(null)}
              closeOnClick={false}
              maxWidth="320px" style={{ padding: 0 }}
            >
               <div style={{ background: '#111', color: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', minWidth: '260px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                   {getEventIcon(selectedEvent)}
                   <div>
                     <div style={{ fontWeight: 700, fontSize: '13px', lineHeight: 1.3 }}>{selectedEvent.title}</div>
                     <div style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace', marginTop: '2px' }}>{selectedEvent.source.toUpperCase()} • {selectedEvent.severity.toUpperCase()}</div>
                   </div>
                 </div>
                 <div style={{ fontSize: '11px', color: '#888', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1a1a', paddingBottom: '3px' }}>
                     <span>COORDINATES:</span>
                     <span style={{ color: '#ddd' }}>{selectedEvent.coordinates.latitude.toFixed(4)}, {selectedEvent.coordinates.longitude.toFixed(4)}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1a1a', paddingBottom: '3px' }}>
                     <span>TIME:</span>
                     <span style={{ color: '#ddd' }}>{new Date(selectedEvent.timestamp).toLocaleString()}</span>
                   </div>
                   {Object.entries(selectedEvent.metadata || {}).filter(([k]) => k !== 'alertDispatched').map(([key, val]) => (
                     <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1a1a', paddingBottom: '3px' }}>
                       <span style={{textTransform: 'uppercase'}}>{key}:</span> 
                       <span style={{color: '#ddd', maxWidth: '160px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'}}>{String(val)}</span>
                     </div>
                   ))}
                   {selectedEvent.metadata.correlation && (
                     <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(239, 68, 68, 0.15)', borderLeft: '2px solid #ef4444', color: '#ef4444', fontSize: '11px', borderRadius: '4px' }}>
                        <AlertTriangle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {selectedEvent.metadata.correlation}
                     </div>
                   )}
                 </div>
               </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* ═══════════ BOTTOM TICKER ═══════════ */}
      <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '36px',
          background: 'rgba(5,5,5,0.9)', borderTop: '1px solid rgba(255,255,255,0.06)', zIndex: 30,
          display: 'flex', alignItems: 'center', overflow: 'hidden', padding: '0 16px',
          backdropFilter: 'blur(8px)'
      }}>
         <div style={{ background: '#ef4444', color: '#fff', padding: '3px 10px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', zIndex: 31, marginRight: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '1px' }}>
           <FileText size={12} /> LIVE OSINT
         </div>
         <div style={{ flex: 1, overflow: 'hidden', position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
            <div style={{ whiteSpace: 'nowrap', display: 'flex', gap: '40px', animation: 'marquee 90s linear infinite' }}>
              {conflictEvents.map((c, i) => (
                 <span key={`ticker-${i}`} style={{ color: '#bbb', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <span style={{ color: c.severity === 'critical' ? '#ef4444' : '#f97316' }}>●</span> {c.title}
                   <span style={{ color: '#444', fontSize: '10px' }}>({c.source})</span>
                 </span>
              ))}
              {/* Also show critical fires, quakes etc */}
              {events.filter(e => e.severity === 'critical' && e.eventType !== 'conflict').slice(0, 5).map((c, i) => (
                 <span key={`ticker-crit-${i}`} style={{ color: '#bbb', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <span style={{ color: '#ef4444' }}>●</span> {c.title}
                   <span style={{ color: '#444', fontSize: '10px' }}>({c.source})</span>
                 </span>
              ))}
              {conflictEvents.length === 0 && <span style={{ color: '#444', fontSize: '12px' }}>Awaiting intelligence stream...</span>}
            </div>
         </div>
         {/* Right side: sweep info */}
         <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' }}>
           <span style={{ fontSize: '10px', color: '#444', fontFamily: 'monospace' }}>
             SWEEP: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '...'} | {(sweepDuration / 1000).toFixed(1)}s
           </span>
           <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
             {sseConnected ? <Wifi size={12} color="#22c55e" /> : <WifiOff size={12} color="#ef4444" />}
             <span style={{ fontSize: '9px', color: sseConnected ? '#22c55e' : '#ef4444' }}>{sseConnected ? 'LIVE' : 'POLL'}</span>
           </div>
         </div>
      </div>
    </div>
  );
}
