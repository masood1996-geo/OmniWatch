"use client";

import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
      <h1 style={{ fontSize: '24px', letterSpacing: '2px', color: '#ef4444' }}>SYSTEM FAILURE</h1>
      <p style={{ color: '#888', marginTop: '10px' }}>{error.message || 'The OmniWatch visualizer encountered a critical runtime failure.'}</p>
      <button onClick={() => reset()} style={{ marginTop: '20px', padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
        REBOOT SYSTEM
      </button>
    </div>
  );
}
