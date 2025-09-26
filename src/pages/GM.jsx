import React from 'react';
import { Link } from 'react-router-dom';
import PresenceList from '../components/PresenceList.jsx';
import DiceRoller from '../components/DiceRoller.jsx';
import Chat from '../components/Chat.jsx';
import GMControls from '../components/GMControls.jsx';
import WizardGM from '../components/WizardGM.jsx';
import HapticsGM from '../components/HapticsGM.jsx';
import TorchGM from '../components/TorchGM.jsx';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import { useDeviceGuards } from '../hooks/useDeviceGuards.js';

export default function GM() {
  const { name, roomId, connected, serverVersion } = useRealtime();
  const { enableImmersive } = useDeviceGuards();

  return (
    <div className="page">
      <header className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <strong>Maître du jeu:</strong> {name || '—'}
          <span><strong style={{ marginLeft: 12 }}>Room:</strong> {roomId || '—'}</span>
          <span style={{ opacity: 0.8 }}><strong style={{ marginLeft: 12 }}>Version:</strong> {serverVersion || '—'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: connected ? 'green' : 'red' }}>{connected ? 'Connecté' : 'Déconnecté'}</span>
          <button onClick={enableImmersive}>Activer mode immersif</button>
          <Link to="/gm/characters"><button>Persos</button></Link>
        </div>
      </header>
      <div className="gm-grid">
        <WizardGM />
        <GMControls />
        <HapticsGM />
        <TorchGM />
        <PresenceList />
        <DiceRoller />
        <div style={{ height: 240 }}>
          <Chat />
        </div>
      </div>
    </div>
  );
}
