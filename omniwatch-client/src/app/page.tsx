'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { fetchEvents, fetchHealth, fetchLiveTracks, apiSourceLink, streamUrl } from '../lib/api';
import { LAYER_DEFS } from '../lib/layers';
import type { VisualMode } from '../lib/layers';
import type { HealthResponse, LiveClassStatus, LiveTrack, OmniEvent, SourceStatusMap } from '../lib/types';
import { TopBar, LocateBar } from '../components/TopBar';
import { FiltersBar, type Filters } from '../components/FiltersBar';
import { LayerPanel } from '../components/LayerPanel';
import { StatusPanel } from '../components/StatusPanel';
import { LiveFeed } from '../components/LiveFeed';
import { JarvisChat } from '../components/JarvisChat';
import { Ticker } from '../components/Ticker';
import { MapView } from '../components/MapView';

const LAYER_STORAGE_KEY = 'omniwatch.layers.v2';

function loadLayers(): Set<string> {
  if (typeof window === 'undefined') return new Set(LAYER_DEFS.map(l => l.key));
  try {
    const raw = window.localStorage.getItem(LAYER_STORAGE_KEY);
    if (!raw) return new Set(LAYER_DEFS.map(l => l.key));
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((k: unknown) => typeof k === 'string'));
  } catch { /* fall through to defaults */ }
  return new Set(LAYER_DEFS.map(l => l.key));
}

export default function OmniWatchDashboard() {
  const [events, setEvents] = useState<OmniEvent[]>([]);
  const [sources, setSources] = useState<SourceStatusMap>({});
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const [sweepDurationMs, setSweepDurationMs] = useState(0);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(15 * 60 * 1000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({ severity: '', timeRange: '', source: '', hideNonLive: true });
  const [enabledLayers, setEnabledLayers] = useState<Set<string>>(() => loadLayers());
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const [mobileLayersOpen, setMobileLayersOpen] = useState(false);

  const [visualMode, setVisualMode] = useState<VisualMode>('standard');
  const [selected, setSelected] = useState<OmniEvent | null>(null);
  const [focusToken, setFocusToken] = useState(0);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [chatOpen, setChatOpen] = useState(false);

  const [liveTracks, setLiveTracks] = useState<LiveTrack[]>([]);
  const [liveStatus, setLiveStatus] = useState<{ aircraft: LiveClassStatus; vessels: LiveClassStatus } | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchEvents();
      setEvents(data.events || []);
      setSources(data.sources || {});
      setLastUpdate(data.timestamp);
      setSweepDurationMs(data.sweepDurationMs || 0);
      if (data.refreshIntervalMs) setRefreshIntervalMs(data.refreshIntervalMs);
      setError(null);
    } catch (err) {
      setError(`Could not reach the OmniWatch API: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      setHealth(await fetchHealth());
    } catch { /* health banner handled via events error */ }
  }, []);

  const loadLive = useCallback(async () => {
    try {
      const data = await fetchLiveTracks();
      setLiveTracks(data.tracks || []);
      if (data.status) setLiveStatus(data.status);
    } catch { /* live tracking is optional */ }
  }, []);

  useEffect(() => {
    void loadEvents();
    void loadHealth();
    void loadLive();
    const eventPoll = setInterval(() => void loadEvents(), 60000);
    const healthPoll = setInterval(() => void loadHealth(), 120000);
    const livePoll = setInterval(() => void loadLive(), 15000);
    return () => {
      clearInterval(eventPoll);
      clearInterval(healthPoll);
      clearInterval(livePoll);
    };
  }, [loadEvents, loadHealth, loadLive]);

  useEffect(() => {
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    function connect() {
      source = new EventSource(streamUrl());
      source.onopen = () => setSseConnected(true);
      source.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') setSseConnected(true);
          if (data.type === 'sweep_complete') {
            setSseConnected(true);
            void loadEvents();
            void loadHealth();
          }
        } catch { /* ignore malformed frames */ }
      };
      source.onerror = () => {
        if (source?.readyState === EventSource.CLOSED) {
          setSseConnected(false);
          retry = setTimeout(connect, 5000);
        }
      };
    }
    connect();
    return () => {
      source?.close();
      if (retry) clearTimeout(retry);
    };
  }, [loadEvents, loadHealth]);

  const persistLayers = useCallback((next: Set<string>) => {
    setEnabledLayers(next);
    try { window.localStorage.setItem(LAYER_STORAGE_KEY, JSON.stringify([...next])); } catch { /* storage unavailable */ }
  }, []);

  const toggleLayer = (key: string) => {
    const next = new Set(enabledLayers);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persistLayers(next);
  };

  const visibleEvents = useMemo(() => {
    return events.filter(ev => {
      const specific = LAYER_DEFS.find(l => l.sources && l.sources.includes(ev.source) && l.types.includes(ev.eventType));
      if (specific) { if (!enabledLayers.has(specific.key)) return false; }
      else {
        const byType = LAYER_DEFS.find(l => !l.sources && l.types.includes(ev.eventType));
        if (byType && !enabledLayers.has(byType.key)) return false;
      }
      const cls = ev.provenance?.fetchClass;
      if (filters.hideNonLive && cls && cls !== 'live' && cls !== 'delayed') return false;
      if (filters.severity && ev.severity !== filters.severity) return false;
      if (filters.source && ev.source !== filters.source) return false;
      if (filters.timeRange) {
        const windows: Record<string, number> = { hour: 3600000, day: 86400000, week: 604800000 };
        const ms = windows[filters.timeRange];
        if (ms && Date.now() - new Date(ev.sourceTimestamp || ev.timestamp).getTime() > ms) return false;
      }
      return true;
    });
  }, [events, enabledLayers, filters]);

  const feedEvents = useMemo(() => {
    return [...visibleEvents]
      .sort((a, b) => new Date(b.sourceTimestamp || b.timestamp).getTime() - new Date(a.sourceTimestamp || a.timestamp).getTime())
      .slice(0, 40);
  }, [visibleEvents]);

  const criticalCount = visibleEvents.filter(e => e.severity === 'critical').length;
  const majorCount = visibleEvents.filter(e => e.severity === 'major').length;
  const searchResults = searchQuery.trim()
    ? visibleEvents.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.source.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const stale = Boolean(lastUpdate) && Date.now() - new Date(lastUpdate).getTime() > refreshIntervalMs * 2.5;
  const disabledCount = health?.disabledSources ?? 0;
  const errorCount = health?.errorSources ?? 0;
  const sourceHealth = health?.sourceHealth ?? [];

  const selectFromFeed = (event: OmniEvent) => {
    setSelected(event);
    setFocusToken(t => t + 1);
    setSearchOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      <TopBar
        sseConnected={sseConnected}
        signalCount={visibleEvents.length}
        criticalCount={criticalCount}
        majorCount={majorCount}
        liveTracks={liveTracks}
        visualMode={visualMode}
        onVisualMode={setVisualMode}
        onToggleSearch={() => setSearchOpen(o => !o)}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        onSearchQuery={setSearchQuery}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen(o => !o)}
        onToggleMobileLayers={() => setMobileLayersOpen(o => !o)}
      />

      <FiltersBar filters={filters} onChange={patch => setFilters(prev => ({ ...prev, ...patch }))} sources={sources} />

      {searchOpen && (
        <LocateBar
          query={searchQuery}
          onChange={setSearchQuery}
          results={searchResults}
          onSelect={id => {
            const found = visibleEvents.find(e => e.id === id);
            if (found) selectFromFeed(found);
          }}
          onClose={() => { setSearchOpen(false); setSearchQuery(''); }}
        />
      )}

      <div className="ow-left-panel-wrap">
        <LayerPanel
          open={layerPanelOpen}
          onToggle={() => setLayerPanelOpen(o => !o)}
          enabledLayers={enabledLayers}
          onToggleLayer={toggleLayer}
          onAllOn={() => persistLayers(new Set(LAYER_DEFS.map(l => l.key)))}
          onAllOff={() => persistLayers(new Set())}
          events={events}
          mobileOpen={mobileLayersOpen}
        />
        <div className="ow-left-panel ow-left-panel-status">
          <StatusPanel
            open={statusOpen}
            onToggle={() => setStatusOpen(o => !o)}
            health={sourceHealth}
            sseConnected={sseConnected}
            sweepDurationMs={sweepDurationMs}
            lastUpdate={lastUpdate}
          />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Provenance</span>
            <div style={{ fontSize: '10px', color: '#666', lineHeight: 1.5 }}>
              {disabledCount} sources have no live data; {errorCount} failed on the last sweep.
              Live positions appear only when a provider reports them. Open any event for provider, license, fetch class and confidence.
            </div>
            {liveStatus?.vessels.fetchClass === 'disabled' && (
              <div style={{ fontSize: '10px', color: '#555', marginTop: '6px' }}>AIS disabled: no key configured. No vessel positions are shown.</div>
            )}
          </div>
        </div>
      </div>

      {chatOpen && (
        <div className="ow-chat-wrap">
          <JarvisChat onClose={() => setChatOpen(false)} />
        </div>
      )}

      <div className="ow-right-panel">
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#999', textTransform: 'uppercase' }}>Signal Feed</span>
          <span style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>{feedEvents.length}/{visibleEvents.length}</span>
        </div>
        <LiveFeed events={feedEvents} loading={loading} onSelect={selectFromFeed} onRefresh={() => void loadEvents()} error={error} />
      </div>

      {(stale || error) && (
        <div className="ow-stale-banner">
          <AlertTriangle size={13} />
          {error
            ? error
            : `Last sweep was ${new Date(lastUpdate).toLocaleString()} — data may be stale. Check the source panel for failures.`}
        </div>
      )}

      <MapView
        events={visibleEvents}
        liveTracks={liveTracks}
        showAircraft={enabledLayers.has('flight')}
        showVessels={enabledLayers.has('maritime')}
        selected={selected}
        onSelect={setSelected}
        visualMode={visualMode}
        focusToken={focusToken}
      />

      <Ticker
        events={visibleEvents}
        criticalCount={criticalCount}
        lastUpdate={lastUpdate}
        sweepDurationMs={sweepDurationMs}
        sseConnected={sseConnected}
        sseMode={!sseConnected && events.length > 0}
        sourceUrl={apiSourceLink()}
      />
    </div>
  );
}
