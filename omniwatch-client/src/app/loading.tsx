import { Activity } from 'lucide-react';

export default function Loading() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', color: '#3b82f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ animation: 'pulse 1.5s infinite alternate' }}>
        <Activity size={64} color="#3b82f6" style={{ marginBottom: '20px' }} />
      </div>
      <h1 style={{ fontSize: '20px', letterSpacing: '4px', color: '#fff' }}>INITIALIZING GRID...</h1>
      <style>{`
        @keyframes pulse { from { opacity: 0.5; transform: scale(0.9); } to { opacity: 1; transform: scale(1.1); } }
      `}</style>
    </div>
  );
}
