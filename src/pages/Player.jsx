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
    <div className="page">
      <header className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <strong>Joueur:</strong> {name || '—'}
          <span><strong style={{ marginLeft: 12 }}>Room:</strong> {roomId || '—'}</span>
          <span style={{ opacity: 0.8 }}><strong style={{ marginLeft: 12 }}>Version:</strong> {serverVersion || '—'}</span>
          {statusSummary && (
            <span style={{ opacity: 0.9 }}>
              <strong>Statut:</strong> mod dé {statusSummary.diceMod > 0 ? `+${statusSummary.diceMod}` : statusSummary.diceMod}{statusSummary.narrative ? `, ${statusSummary.narrative}` : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: connected ? 'green' : 'red' }}>{connected ? 'Connecté' : 'Déconnecté'}</span>
          <button onClick={enableImmersive}>Activer mode immersif</button>
        </div>
      </header>
      {wizardActive ? (
        <div className="stack">
          <WizardPlayer />
        </div>
      ) : (
        <div className="stack">
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
