import { Terminal } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <Terminal size={64} color="#facc15" style={{ marginBottom: '20px' }} />
      <h1 style={{ fontSize: '24px', letterSpacing: '2px', color: '#facc15' }}>404 - SECTOR NOT FOUND</h1>
      <p style={{ color: '#888', marginTop: '10px' }}>The requested intelligence sector does not exist on this network.</p>
    </div>
  );
}
