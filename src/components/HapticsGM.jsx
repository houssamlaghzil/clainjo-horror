import React, { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

// Dedicated control panel for the MJ to manage continuous heartbeats on players' phones
export default function HapticsGM() {
  const { players, sendHapticsStart, sendHapticsStop } = useRealtime();
  const [targets, setTargets] = useState('all'); // 'all' | [socketId]
  const [bpm, setBpm] = useState(60);

  const playerOptions = useMemo(
    () => players.map((p) => ({ value: p.socketId, label: p.name || p.socketId.slice(0, 4) })),
    [players]
  );

  // Sanitize targets when player list changes
  useEffect(() => {
    setTargets((prev) => {
      if (prev === 'all') return 'all';
      const set = new Set(players.map((p) => p.socketId));
      const filtered = (Array.isArray(prev) ? prev : []).filter((id) => set.has(id));
      return filtered.length === playerOptions.length ? 'all' : filtered;
    });
  }, [players, playerOptions.length]);

  const toggleTarget = (sid) => {
    setTargets((prev) => {
      if (prev === 'all') return [sid];
      const arr = Array.isArray(prev) ? [...prev] : [];
      const idx = arr.indexOf(sid);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(sid);
      return arr.length === players.length ? 'all' : arr;
    });
  };

  const clampBpm = (v) => Math.max(50, Math.min(160, Math.round(Number(v) || 60)));

  const start = () => sendHapticsStart({ targets, pattern: 'heartbeat', bpm: clampBpm(bpm) });
  const stop = () => sendHapticsStop({ targets });

  const presets = [50, 70, 90, 120, 140, 160];

  return (
    <div style={{ border: '2px solid #094d2b', borderRadius: 12, padding: 12, background: 'rgba(9,77,43,0.08)' }}>
      <h3>Contrôles MJ — Battements de cœur</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        <label>
          Cibles ({targets === 'all' ? playerOptions.length : (Array.isArray(targets) ? targets.length : 0)}/{playerOptions.length})
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={() => setTargets('all')} style={{ border: '1px solid #0a6d36', borderRadius: 20, padding: '6px 10px', background: targets === 'all' ? '#1b1b1b' : '#101010', color: '#fff' }}>Tous</button>
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
          BPM: {clampBpm(bpm)}
          <input
            type="range"
            min={50}
            max={160}
            step={1}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {presets.map((p) => (
            <button key={p} type="button" onClick={() => setBpm(p)} style={{ borderRadius: 18, padding: '4px 8px', background: '#101010', color: '#ddd', border: '1px solid rgba(255,255,255,0.12)' }}>
              {p} BPM
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={start} style={{ backgroundColor: '#0a6d36', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Démarrer</button>
          <button type="button" onClick={stop} style={{ backgroundColor: '#444', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Arrêter</button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Astuce: sur iOS/Safari, l’API Vibration n’est pas supportée. Pour Android/Chrome, un tap récent peut être requis pour autoriser le vibreur.
        </div>
      </div>
    </div>
  );
}
