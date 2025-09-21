import React from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function PresenceList() {
  const { players, gms } = useRealtime();
  return (
    <div style={{ border: '1px solid #333', borderRadius: 8, padding: 12 }}>
      <h3>Participants</h3>
      <div>
        <strong>MJs:</strong> {gms.length}
      </div>
      <ul style={{ marginTop: 8 }}>
        {players.map((p) => (
          <li key={p.socketId}>
            <strong>{p.name}</strong> — PV: {p.hp ?? 0} — Argent: {p.money ?? 0} — Obj: {Array.isArray(p.inventory) ? p.inventory.length : 0}
          </li>
        ))}
      </ul>
    </div>
  );
}
