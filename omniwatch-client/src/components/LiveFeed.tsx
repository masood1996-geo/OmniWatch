'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { FetchClassBadge } from './ProvenanceBadge';
import { severityColor } from '../lib/format';
import type { OmniEvent } from '../lib/types';

interface LiveFeedProps {
  events: OmniEvent[];
  loading: boolean;
  onSelect: (event: OmniEvent) => void;
  onRefresh: () => void;
  error?: string | null;
}

export function LiveFeed({ events, loading, onSelect, onRefresh, error }: LiveFeedProps) {
  return (
    <div style={{ padding: '8px' }} data-testid="live-feed">
      {error && (
        <div style={{ margin: '0 0 8px', padding: '8px', fontSize: '11px', color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px' }}>
          {error}
        </div>
      )}
      {events.length === 0 && !error && (
        <div style={{ padding: '12px 8px', fontSize: '11px', color: '#666' }}>
          No events match the current filters.
          <button onClick={onRefresh} style={{ marginLeft: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#888', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer' }}>
            Refresh
          </button>
        </div>
      )}
      {events.map((ev, i) => (
        <div
          key={`feed-${ev.id}-${i}`}
          onClick={() => onSelect(ev)}
          style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px', borderRadius: '6px', cursor: 'pointer', marginBottom: '2px', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ marginTop: '5px', width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: severityColor(ev.severity) }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '12px', color: '#ddd', fontWeight: 500, lineHeight: '1.3', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {ev.title}
            </span>
            <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <FetchClassBadge fetchClass={ev.provenance?.fetchClass ?? 'disabled'} compact />
              <span style={{ fontSize: '9px', color: '#555', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                {ev.source.toUpperCase()} • {ev.severity.toUpperCase()}
              </span>
            </span>
          </div>
          {i === 0 && loading && <RefreshCw size={12} color="#555" className="spin" />}
        </div>
      ))}
    </div>
  );
}
