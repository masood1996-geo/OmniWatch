'use client';

import React from 'react';
import { ChevronDown, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { FetchClassBadge } from './ProvenanceBadge';
import { timeAgo } from '../lib/format';
import type { SourceHealth } from '../lib/types';

const STATUS_COLORS: Record<SourceHealth['status'], string> = {
  ok: '#22c55e',
  error: '#ef4444',
  disabled: '#6b7280',
  skipped: '#eab308',
};

interface StatusPanelProps {
  open: boolean;
  onToggle: () => void;
  health: SourceHealth[];
  sseConnected: boolean;
  sweepDurationMs: number;
  lastUpdate: string;
}

export function StatusPanel({ open, onToggle, health, sseConnected, sweepDurationMs, lastUpdate }: StatusPanelProps) {
  const sorted = [...health].sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div
        onClick={onToggle}
        role="button"
        aria-expanded={open}
        style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {sseConnected ? <Wifi size={14} color="#22c55e" /> : <WifiOff size={14} color="#ef4444" />}
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#999', textTransform: 'uppercase' }}>Sources</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#555' }}>{health.filter(h => h.status === 'ok').length}/{health.length}</span>
          {open ? <ChevronDown size={14} color="#666" /> : <ChevronRight size={14} color="#666" />}
        </div>
      </div>
      {open && (
        <div style={{ padding: '6px 14px 12px', maxHeight: '260px', overflowY: 'auto' }}>
          {sorted.map(source => (
            <div key={source.id} style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: STATUS_COLORS[source.status] }} />
                <span style={{ flex: 1, fontSize: '11px', color: '#999' }}>{source.label}</span>
                <FetchClassBadge fetchClass={source.fetchClass} compact />
                <span style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>{source.count}</span>
              </div>
              {(source.status === 'error' || source.status === 'disabled' || source.status === 'skipped') && (
                <div style={{ marginLeft: '16px', marginTop: '3px', fontSize: '9px', color: source.status === 'error' ? '#f87171' : '#666', lineHeight: 1.4 }}>
                  {source.lastError || source.notes || (source.status === 'disabled' ? 'disabled' : 'skipped')}
                </div>
              )}
              {source.status === 'ok' && source.lastSuccessAt && (
                <div style={{ marginLeft: '16px', marginTop: '2px', fontSize: '9px', color: '#444' }}>
                  last ok {timeAgo(source.lastSuccessAt)} • {source.latencyMs} ms
                </div>
              )}
            </div>
          ))}
          <div style={{ marginTop: '8px', fontSize: '10px', color: '#444', fontFamily: 'monospace' }}>
            Sweep: {(sweepDurationMs / 1000).toFixed(1)}s • {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '—'}
          </div>
        </div>
      )}
    </div>
  );
}
