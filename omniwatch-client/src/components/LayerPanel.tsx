'use client';

import React from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { LAYER_DEFS } from '../lib/layers';
import type { OmniEvent } from '../lib/types';

interface LayerPanelProps {
  open: boolean;
  onToggle: () => void;
  enabledLayers: Set<string>;
  onToggleLayer: (key: string) => void;
  onAllOn: () => void;
  onAllOff: () => void;
  events: OmniEvent[];
  mobileOpen: boolean;
}

export function LayerPanel({ open, onToggle, enabledLayers, onToggleLayer, onAllOn, onAllOff, events, mobileOpen }: LayerPanelProps) {
  return (
    <div className={`ow-left-panel${mobileOpen ? ' open' : ''}`} data-testid="layer-panel">
      <div
        onClick={onToggle}
        role="button"
        aria-expanded={open}
        style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={14} color="#3b82f6" />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#999', textTransform: 'uppercase' }}>Data Layers</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#555' }}>{enabledLayers.size}/{LAYER_DEFS.length}</span>
          {open ? <ChevronDown size={14} color="#666" /> : <ChevronRight size={14} color="#666" />}
        </div>
      </div>

      {open && (
        <div style={{ padding: '6px' }}>
          <div style={{ display: 'flex', gap: '4px', padding: '4px 8px', marginBottom: '4px' }}>
            <button onClick={onAllOn} style={{ flex: 1, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 600 }}>ALL ON</button>
            <button onClick={onAllOff} style={{ flex: 1, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 600 }}>ALL OFF</button>
          </div>

          {LAYER_DEFS.map(layer => {
            const Icon = layer.icon;
            const enabled = enabledLayers.has(layer.key);
            const count = events.filter(e => {
              if (layer.sources) return layer.sources.includes(e.source) && layer.types.includes(e.eventType);
              return layer.types.includes(e.eventType);
            }).length;
            return (
              <div key={layer.key} className="layer-toggle" onClick={() => onToggleLayer(layer.key)} style={{ opacity: enabled ? 1 : 0.4 }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: enabled ? layer.color : 'transparent', border: `1px solid ${enabled ? layer.color : '#555'}` }}>
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
    </div>
  );
}
