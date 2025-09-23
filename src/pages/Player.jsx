import React, { useRef, useState } from 'react';
import CharacterSheet from '../components/CharacterSheet.jsx';
import DiceRoller from '../components/DiceRoller.jsx';
import Chat from '../components/Chat.jsx';
import PresenceList from '../components/PresenceList.jsx';
import WizardPlayer from '../components/WizardPlayer.jsx';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import { useDeviceGuards } from '../hooks/useDeviceGuards.js';

export default function Player() {
  const { name, roomId, connected, serverVersion, wizardActive, statusSummary } = useRealtime();
  const { enableImmersive } = useDeviceGuards();

  // Collapsible states per section
  const [collapsedCS, setCollapsedCS] = useState(false);
  const [collapsedDice, setCollapsedDice] = useState(false);
  const [collapsedPresence, setCollapsedPresence] = useState(false);
  const [collapsedChat, setCollapsedChat] = useState(false);

  // Blackout mode: collapse all and show a full black background without blocking hints/screamers
  const [blackout, setBlackout] = useState(false);
  const prevStatesRef = useRef({ cs: false, dice: false, presence: false, chat: false });

  const toggleBlackout = () => {
    setBlackout((prev) => {
      const next = !prev;
      if (next) {
        // store current and collapse all
        prevStatesRef.current = { cs: collapsedCS, dice: collapsedDice, presence: collapsedPresence, chat: collapsedChat };
        setCollapsedCS(true);
        setCollapsedDice(true);
        setCollapsedPresence(true);
        setCollapsedChat(true);
      } else {
        // restore previous states
        const p = prevStatesRef.current || { cs: false, dice: false, presence: false, chat: false };
        setCollapsedCS(p.cs);
        setCollapsedDice(p.dice);
        setCollapsedPresence(p.presence);
        setCollapsedChat(p.chat);
      }
      return next;
    });
  };

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
        <div className="stack" style={{ position: 'relative' }}>
          {/* Floating Blackout toggle (above content, below hints/screamers) */}
          <div style={{ position: 'fixed', top: 8, right: 8, zIndex: 9991 }}>
            <button onClick={toggleBlackout} title="Mode écran noir (économie batterie)">
              {blackout ? 'Quitter écran noir' : 'Écran noir'}
            </button>
          </div>

          {/* Non-blocking full black overlay when blackout is enabled */}
          {blackout && (
            <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9000, pointerEvents: 'none' }} />
          )}

          <CollapsibleSection title="Fiche personnage" collapsed={collapsedCS} onToggle={() => setCollapsedCS((v) => !v)} noCard>
            <CharacterSheet />
          </CollapsibleSection>

          <CollapsibleSection title="Dés" collapsed={collapsedDice} onToggle={() => setCollapsedDice((v) => !v)}>
            <DiceRoller />
          </CollapsibleSection>

          <CollapsibleSection title="Participants" collapsed={collapsedPresence} onToggle={() => setCollapsedPresence((v) => !v)}>
            <PresenceList />
          </CollapsibleSection>

          <CollapsibleSection title="Chat" collapsed={collapsedChat} onToggle={() => setCollapsedChat((v) => !v)}>
            <div style={{ height: 240 }}>
              <Chat />
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
