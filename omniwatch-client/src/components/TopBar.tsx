'use client';

import React from 'react';
import { Layers, MessageSquare, Plane, Search, X } from 'lucide-react';
import { VISUAL_MODES, VISUAL_MODE_META, type VisualMode } from '../lib/layers';
import type { LiveTrack } from '../lib/types';

interface TopBarProps {
  sseConnected: boolean;
  signalCount: number;
  criticalCount: number;
  majorCount: number;
  liveTracks: LiveTrack[];
  visualMode: VisualMode;
  onVisualMode: (mode: VisualMode) => void;
  onToggleSearch: () => void;
  searchOpen: boolean;
  searchQuery: string;
  onSearchQuery: (value: string) => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  onToggleMobileLayers: () => void;
}

export function TopBar(props: TopBarProps) {
  const aircraft = props.liveTracks.filter(t => t.type === 'aircraft').length;
  const vessels = props.liveTracks.filter(t => t.type === 'vessel').length;

  return (
    <div className="ow-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={props.onToggleMobileLayers}
          aria-label="Toggle layers"
          className="ow-mobile-only"
          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }}
        >
          <Layers size={14} />
        </button>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: props.sseConnected ? '#22c55e' : '#ef4444', animation: 'pulse 2s infinite' }} title={props.sseConnected ? 'SSE connected' : 'SSE reconnecting'} />
        <h1 style={{ margin: 0, fontSize: '16px', letterSpacing: '4px', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>OmniWatch</h1>
        <span className="ow-hide-small" style={{ fontSize: '10px', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>Provenance-tracked OSINT</span>
      </div>

      <div className="ow-stats" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <StatBadge label="SIGNALS" value={props.signalCount} color="#60a5fa" />
        <StatBadge label="CRITICAL" value={props.criticalCount} color="#ef4444" />
        <StatBadge label="MAJOR" value={props.majorCount} color="#f97316" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(34,197,94,0.1)', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.3)' }} title="Live aircraft/vessel positions with provider status">
          <Plane size={12} color="#22c55e" />
          <span style={{ fontSize: '10px', color: '#22c55e', letterSpacing: '1px' }}>TRACKS</span>
          <span style={{ fontSize: '12px', color: '#fff', fontWeight: 700 }}>{aircraft}(air) {vessels}(sea)</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {VISUAL_MODES.map(mode => {
          const meta = VISUAL_MODE_META[mode];
          const Icon = meta.icon;
          return (
            <button
              key={mode}
              onClick={() => props.onVisualMode(mode)}
              className="ow-visual-mode"
              style={{
                background: props.visualMode === mode ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                border: 'none', color: '#fff', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600,
              }}
            >
              <Icon size={14} /> {meta.label}
            </button>
          );
        })}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
        <button onClick={props.onToggleSearch} style={{ background: props.searchOpen ? '#3b82f6' : 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
          <Search size={14} /> LOCATE
        </button>
        <button onClick={props.onToggleChat} style={{ background: props.chatOpen ? '#ef4444' : 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}>
          <MessageSquare size={14} /> J.A.R.V.I.S
        </button>
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: `${color}18`, borderRadius: '6px', border: `1px solid ${color}44` }}>
      <span style={{ fontSize: '10px', color, letterSpacing: '1px' }}>{label}</span>
      <span style={{ fontSize: '14px', color: '#fff', fontWeight: 700 }}>{value}</span>
    </div>
  );
}

export function LocateBar({ query, onChange, results, onSelect, onClose }: {
  query: string;
  onChange: (value: string) => void;
  results: Array<{ id: string; title: string; source: string }>;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="ow-locate-bar">
      <div style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid #333', borderRadius: '10px', backdropFilter: 'blur(16px)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: '10px' }}>
          <Search size={16} color="#666" />
          <input
            value={query}
            onChange={e => onChange(e.target.value)}
            autoFocus
            aria-label="Search signals"
            placeholder="Search signals by title, source..."
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', outline: 'none' }}
          />
          <X size={16} color="#666" style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        {results.length > 0 && (
          <div style={{ borderTop: '1px solid #222', maxHeight: '300px', overflowY: 'auto' }}>
            {results.slice(0, 10).map(ev => (
              <div key={ev.id} onClick={() => onSelect(ev.id)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ fontSize: '13px', color: '#ddd' }}>{ev.title}</div>
                <div style={{ fontSize: '10px', color: '#666', fontFamily: 'monospace' }}>{ev.source}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
