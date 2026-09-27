'use client';

import React from 'react';
import { FileText, Wifi, WifiOff } from 'lucide-react';
import type { OmniEvent } from '../lib/types';

interface TickerProps {
  events: OmniEvent[];
  criticalCount: number;
  lastUpdate: string;
  sweepDurationMs: number;
  sseConnected: boolean;
  sseMode: boolean;
  sourceUrl: string;
}

export function Ticker({ events, criticalCount, lastUpdate, sweepDurationMs, sseConnected, sseMode, sourceUrl }: TickerProps) {
  const items = [
    ...events.filter(e => e.severity === 'critical' || e.severity === 'major').slice(0, 20),
  ];
  return (
    <div className="ow-ticker">
      <div style={{ background: '#ef4444', color: '#fff', padding: '3px 10px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', zIndex: 31, marginRight: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '1px' }}>
        <FileText size={12} /> {criticalCount} CRITICAL
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
        <div className="ow-ticker-track">
          {items.map(item => (
            <span key={`ticker-${item.id}`} style={{ color: '#bbb', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: item.severity === 'critical' ? '#ef4444' : '#f97316' }}>●</span> {item.title}
              <span style={{ color: '#444', fontSize: '10px' }}>({item.provenance?.provider || item.source})</span>
            </span>
          ))}
          {items.length === 0 && <span style={{ color: '#444', fontSize: '12px' }}>No major signals in the current sweep.</span>}
        </div>
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px' }}>
        <span style={{ fontSize: '10px', color: '#444', fontFamily: 'monospace' }}>
          SWEEP: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '...'} | {(sweepDurationMs / 1000).toFixed(1)}s
        </span>
        <a href={sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '9px', color: '#3b82f6', textDecoration: 'none' }} title="AGPL-3.0: source code for this network service">
          SOURCE
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {sseConnected || sseMode ? <Wifi size={12} color="#22c55e" /> : <WifiOff size={12} color="#ef4444" />}
          <span style={{ fontSize: '9px', color: sseConnected || sseMode ? '#22c55e' : '#ef4444' }}>{sseConnected ? 'SSE' : 'POLL'}</span>
        </div>
      </div>
    </div>
  );
}
