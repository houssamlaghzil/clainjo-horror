import React from 'react';
import CharacterSheet from '../components/CharacterSheet.jsx';
import DiceRoller from '../components/DiceRoller.jsx';
import Chat from '../components/Chat.jsx';
import PresenceList from '../components/PresenceList.jsx';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import { useDeviceGuards } from '../hooks/useDeviceGuards.js';

export default function Player() {
  const { name, roomId, connected } = useRealtime();
  const { enableImmersive } = useDeviceGuards();

  return (
    <div style={{ padding: 12, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>Joueur:</strong> {name || '—'}
          <span style={{ marginLeft: 12 }}><strong>Room:</strong> {roomId || '—'}</span>
        </div>
        <div>
          <span style={{ marginRight: 12, color: connected ? 'green' : 'red' }}>{connected ? 'Connecté' : 'Déconnecté'}</span>
          <button onClick={enableImmersive}>Activer mode immersif</button>
        </div>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <CharacterSheet />
        <DiceRoller />
        <PresenceList />
        <div style={{ height: 240 }}>
          <Chat />
        </div>
      </div>
    </div>
  );
}
