import React, { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function GMControls() {
  const { players, sendScreamer } = useRealtime();
  const [targets, setTargets] = useState('all'); // 'all' | [socketId]
  const [screamerId, setScreamerId] = useState('default');
  const [intensity, setIntensity] = useState(0.8);

  const playerOptions = useMemo(() => players.map((p) => ({ value: p.socketId, label: p.name || p.socketId.slice(0, 4) })), [players]);

  // Sanitize targets when player list changes
  useEffect(() => {
    setTargets((prev) => {
      if (prev === 'all') return 'all';
      const set = new Set(players.map((p) => p.socketId));
      const filtered = (Array.isArray(prev) ? prev : []).filter((id) => set.has(id));
      return filtered.length === playerOptions.length ? 'all' : filtered;
    });
  }, [players, playerOptions.length]);

  const onSend = (e) => {
    e.preventDefault();
    sendScreamer({ targets, screamerId, intensity: Number(intensity) });
  };

  const toggleTarget = (sid) => {
    setTargets((prev) => {
      if (prev === 'all') return [sid];
      const arr = Array.isArray(prev) ? [...prev] : [];
      const idx = arr.indexOf(sid);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(sid);
      return arr.length === players.length ? 'all' : arr;
    });
  };

  return (
    <div style={{ border: '2px solid #8b0000', borderRadius: 12, padding: 12, background: 'rgba(139,0,0,0.08)' }}>
      <h3>Contrôles MJ — Screamers</h3>
      <form onSubmit={onSend} style={{ display: 'grid', gap: 8 }}>
        <label>
          Séléction des cibles ({targets === 'all' ? playerOptions.length : (Array.isArray(targets) ? targets.length : 0)}/{playerOptions.length})
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={() => setTargets('all')} style={{ border: '1px solid #b3001b', borderRadius: 20, padding: '6px 10px', background: targets === 'all' ? '#1b1b1b' : '#101010', color: '#fff' }}>Tous</button>
            {playerOptions.map((opt) => {
              const selected = targets === 'all' || (Array.isArray(targets) && targets.includes(opt.value));
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleTarget(opt.value)}
                  title={opt.value}
                  style={{
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 20,
                    padding: '6px 10px',
                    background: selected ? '#1b1b1b' : '#101010',
                    color: selected ? '#fff' : '#ccc',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </label>
        <label>
          Type de screamer
          <select value={screamerId} onChange={(e) => setScreamerId(e.target.value)}>
            <option value="default">Default</option>
            <option value="ghost">Ghost</option>
            <option value="shriek">Shriek</option>
            <option value="heartbeat">Heartbeat</option>
          </select>
        </label>
        <label>
          Intensité: {intensity}
          <input type="range" min="0" max="1" step="0.05" value={intensity} onChange={(e) => setIntensity(e.target.value)} />
        </label>
        <button type="submit" style={{ backgroundColor: '#8b0000', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Envoyer</button>
      </form>
    </div>
  );
}
