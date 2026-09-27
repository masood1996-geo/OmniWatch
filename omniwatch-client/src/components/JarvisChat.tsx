'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';
import { sendChat } from '../lib/api';

interface ChatMessage {
  sender: 'USER' | 'AI';
  text: string;
}

export function JarvisChat({ onClose }: { onClose?: () => void }) {
  const [log, setLog] = useState<ChatMessage[]>([{ sender: 'AI', text: 'J.A.R.V.I.S online. Ask about the current signals; answers cite provider and fetch class when the LLM is reachable.' }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  async function send() {
    const query = input.trim();
    if (!query || sending) return;
    setInput('');
    setLog(prev => [...prev, { sender: 'USER', text: query }]);
    setSending(true);
    try {
      const data = await sendChat(query);
      setLog(prev => [...prev, { sender: 'AI', text: `${data.reply}${data.mode === 'offline' ? '\n\n[offline rule-based mode]' : ''}` }]);
    } catch (err) {
      setLog(prev => [...prev, { sender: 'AI', text: `[ERROR] ${(err as Error).message}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="ow-chat" data-testid="jarvis-chat">
      <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', alignItems: 'center', borderRadius: '12px 12px 0 0' }}>
        <Terminal size={16} color="#ef4444" />
        <span style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '1.5px', color: '#999' }}>J.A.R.V.I.S AI TERMINAL</span>
        {onClose && <button onClick={onClose} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '11px' }}>CLOSE</button>}
      </div>
      <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {log.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'USER' ? 'flex-end' : 'flex-start' }}>
            <span style={{ fontSize: '9px', color: '#555', marginBottom: '2px', fontFamily: 'monospace', letterSpacing: '1px' }}>{msg.sender}</span>
            <div style={{
              padding: '8px 12px', borderRadius: '8px', fontSize: '12px', lineHeight: 1.5,
              background: msg.sender === 'USER' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
              border: msg.sender === 'USER' ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
              color: '#ddd', maxWidth: '90%', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void send(); }}
          aria-label="Query intelligence"
          placeholder="Query intelligence..."
          style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 12px', borderRadius: '8px', outline: 'none', fontSize: '12px' }}
        />
        <button onClick={() => void send()} disabled={sending} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px', opacity: sending ? 0.6 : 1 }}>
          {sending ? '...' : 'TX'}
        </button>
      </div>
    </div>
  );
}
