'use client';

import React from 'react';
import { FETCH_CLASS_META } from '../lib/format';
import type { EventProvenance, FetchClass } from '../lib/types';

export function FetchClassBadge({ fetchClass, compact = false }: { fetchClass: FetchClass; compact?: boolean }) {
  const meta = FETCH_CLASS_META[fetchClass];
  return (
    <span
      title={meta.description}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: compact ? '1px 5px' : '2px 7px',
        borderRadius: '4px',
        border: `1px solid ${meta.color}55`,
        background: `${meta.color}18`,
        color: meta.color,
        fontSize: compact ? '8px' : '9px',
        fontWeight: 700,
        letterSpacing: '0.8px',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function ProvenanceRow({ provenance }: { provenance?: EventProvenance }) {
  if (!provenance) {
    return (
      <div style={{ fontSize: '10px', color: '#f97316', marginTop: '6px' }}>
        No provenance attached (unexpected) — treat this event as unverified.
      </div>
    );
  }
  const rows: Array<[string, string]> = [
    ['PROVIDER', provenance.provider],
    ['LICENSE', provenance.license],
    ['ATTRIBUTION', provenance.attribution],
    ['FETCHED', new Date(provenance.fetchedAt).toLocaleString()],
    ['SOURCE TIME', provenance.sourceTimestamp ? new Date(provenance.sourceTimestamp).toLocaleString() : 'not provided'],
    ['CONFIDENCE', provenance.confidence.toFixed(2)],
  ];
  if (provenance.verifiedAsOf) rows.push(['VERIFIED AS OF', provenance.verifiedAsOf]);
  if (provenance.statusNote) rows.push(['NOTE', provenance.statusNote]);
  return (
    <div style={{ marginTop: '8px', borderTop: '1px solid #1f1f1f', paddingTop: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
        <FetchClassBadge fetchClass={provenance.fetchClass} />
        <span style={{ fontSize: '9px', color: '#666', fontFamily: 'monospace' }}>{provenance.sourceId}</span>
      </div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '10px', padding: '2px 0', borderBottom: '1px solid #151515' }}>
          <span style={{ color: '#666' }}>{label}</span>
          <span style={{ color: '#bbb', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
