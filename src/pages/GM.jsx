import React from 'react';
import PresenceList from '../components/PresenceList.jsx';
import DiceRoller from '../components/DiceRoller.jsx';
import Chat from '../components/Chat.jsx';
import GMControls from '../components/GMControls.jsx';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import { useDeviceGuards } from '../hooks/useDeviceGuards.js';

export default function GM() {
  const { name, roomId, connected } = useRealtime();
  const { enableImmersive } = useDeviceGuards();

  return (
    <div style={{ padding: 12, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>Maître du jeu:</strong> {name || '—'}
          <span style={{ marginLeft: 12 }}><strong>Room:</strong> {roomId || '—'}</span>
        </div>
        <div>
          <span style={{ marginRight: 12, color: connected ? 'green' : 'red' }}>{connected ? 'Connecté' : 'Déconnecté'}</span>
          <button onClick={enableImmersive}>Activer mode immersif</button>
        </div>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <GMControls />
        <PresenceList />
        <DiceRoller />
        <div style={{ height: 240 }}>
          <Chat />
        </div>
      </div>
    </div>
  );
}
