'use client';

import React from 'react';
import type { SourceStatusMap } from '../lib/types';

export interface Filters {
  severity: string;
  timeRange: string;
  source: string;
  hideNonLive: boolean;
}

interface FiltersBarProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  sources: SourceStatusMap;
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#bbb',
  padding: '3px 6px',
  borderRadius: '4px',
  fontSize: '10px',
  outline: 'none',
};

export function FiltersBar({ filters, onChange, sources }: FiltersBarProps) {
  const sourceNames = Object.keys(sources).sort();
  return (
    <div className="ow-filters" data-testid="filters-bar">
      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#666' }}>
        SEVERITY
        <select aria-label="Severity filter" value={filters.severity} onChange={e => onChange({ severity: e.target.value })} style={selectStyle}>
          <option value="">all</option>
          <option value="critical">critical</option>
          <option value="major">major</option>
          <option value="moderate">moderate</option>
          <option value="minor">minor</option>
        </select>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#666' }}>
        WINDOW
        <select aria-label="Time range filter" value={filters.timeRange} onChange={e => onChange({ timeRange: e.target.value })} style={selectStyle}>
          <option value="">any</option>
          <option value="hour">1 hour</option>
          <option value="day">1 day</option>
          <option value="week">1 week</option>
        </select>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#666' }}>
        SOURCE
        <select aria-label="Source filter" value={filters.source} onChange={e => onChange({ source: e.target.value })} style={{ ...selectStyle, maxWidth: '140px' }}>
          <option value="">all</option>
          {sourceNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <label
        title="Hides static and simulated data. Live and delayed events are shown."
        style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: filters.hideNonLive ? '#22c55e' : '#666', cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          aria-label="Hide non-live data"
          checked={filters.hideNonLive}
          onChange={e => onChange({ hideNonLive: e.target.checked })}
        />
        LIVE/DELAYED ONLY
      </label>
    </div>
  );
}
