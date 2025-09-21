import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function Chat() {
  const { chat, sendChat, name } = useRealtime();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const sorted = useMemo(() => chat.slice().sort((a, b) => a.ts - b.ts), [chat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sorted.length]);

  const onSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChat({ text: text.trim() });
    setText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #333', padding: 8, borderRadius: 8 }}>
        {sorted.map((m) => (
          <div key={m.id} style={{ marginBottom: 6 }}>
            <strong>{m.from || 'anon'}:</strong> <span>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={onSend} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" style={{ flex: 1 }} />
        <button type="submit">Envoyer</button>
      </form>
    </div>
  );
}
