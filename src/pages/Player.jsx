import React from 'react';
import CharacterSheet from '../components/CharacterSheet.jsx';
import DiceRoller from '../components/DiceRoller.jsx';
import Chat from '../components/Chat.jsx';
import PresenceList from '../components/PresenceList.jsx';
import WizardPlayer from '../components/WizardPlayer.jsx';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import { useDeviceGuards } from '../hooks/useDeviceGuards.js';

export default function Player() {
  const { name, roomId, connected, serverVersion, wizardActive, statusSummary } = useRealtime();
  const { enableImmersive } = useDeviceGuards();

  return (
    <div style={{ padding: 12, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>Joueur:</strong> {name || '—'}
          <span style={{ marginLeft: 12 }}><strong>Room:</strong> {roomId || '—'}</span>
          <span style={{ marginLeft: 12, opacity: 0.8 }}><strong>Version:</strong> {serverVersion || '—'}</span>
          {statusSummary && (
            <span style={{ marginLeft: 12, opacity: 0.9 }}>
              <strong>Statut:</strong> mod dé {statusSummary.diceMod > 0 ? `+${statusSummary.diceMod}` : statusSummary.diceMod}{statusSummary.narrative ? `, ${statusSummary.narrative}` : ''}
            </span>
          )}
        </div>
        <div>
          <span style={{ marginRight: 12, color: connected ? 'green' : 'red' }}>{connected ? 'Connecté' : 'Déconnecté'}</span>
          <button onClick={enableImmersive}>Activer mode immersif</button>
        </div>
      </header>
      {wizardActive ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <WizardPlayer />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <CharacterSheet />
          <DiceRoller />
          <PresenceList />
          <div style={{ height: 240 }}>
            <Chat />
          </div>
        </div>
      )}
    </div>
  );
}
