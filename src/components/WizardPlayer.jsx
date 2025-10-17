import React, { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

// Simple immersive (non-screamer) modal
function ResultModal({ result, onClose }) {
  if (!result) return null;
  const { inflicted, suffered, diceMod, hpDelta, narrative } = result;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9997, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 'min(720px, 92vw)', background: '#0f0f0f', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }}>
        <h2 style={{ marginTop: 0 }}>Résultats de la manche</h2>
        <div style={{ lineHeight: 1.5 }}>
          <div><strong>Vous avez infligé:</strong> {inflicted || '—'}</div>
          <div><strong>Vous avez subi:</strong> {suffered || '—'}</div>
          <div style={{ marginTop: 6 }}>
            <strong>Effets numériques:</strong>
            <ul>
              <li>Modificateur de dé: {diceMod > 0 ? `+${diceMod} (malus)` : `${diceMod} (bonus)`}</li>
              <li>Variation PV: {hpDelta >= 0 ? `+${hpDelta}` : `${hpDelta}`}</li>
            </ul>
          </div>
          {narrative && (
            <div style={{ marginTop: 6 }}>
              <strong>Effet narratif:</strong> {narrative}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', marginTop: 12 }}>
          <button onClick={onClose} style={{ background: '#101010', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 10px', borderRadius: 8 }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

export default function WizardPlayer() {
  const { wizardActive, wizardLocked, wizardResolving, wizardSubmit, wizardMyResult, setScreamer } = useRealtime();
  const [text, setText] = useState('');
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (wizardMyResult) setShowResult(true);
  }, [wizardMyResult]);

  if (!wizardActive) return null;

  const onSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    wizardSubmit(text.trim());
    setText('');
  };

  return (
    <div style={{ border: '2px dashed rgba(255,255,255,0.18)', borderRadius: 12, padding: 12, background: 'rgba(0,0,0,0.25)' }}>
      <h3>Wizard Battle — Envoyez votre sort</h3>
      {wizardLocked ? (
        <div style={{ padding: 12, background: 'rgba(0,0,0,0.35)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)' }}>
          <strong>Sort envoyé.</strong> En attente des autres joueurs...
          {wizardResolving && <span style={{ marginLeft: 10, opacity: 0.8 }}>(résolution en cours)</span>}
        </div>
      ) : (
        <form onSubmit={onSend} style={{ display: 'grid', gap: 8 }}>
          <div style={{ marginBottom: 4, padding: '8px 10px', background: 'rgba(21,74,138,0.15)', borderRadius: 6, fontSize: '0.9em', lineHeight: 1.4 }}>
            <strong>Types de sorts détectés automatiquement:</strong>
            <ul style={{ margin: '4px 0 0 0', paddingLeft: 20 }}>
              <li><strong>Attaque</strong>: inflige des dégâts et malus aux adversaires</li>
              <li><strong>Bonus</strong>: améliore vos jets de dé ou ceux de vos alliés</li>
              <li><strong>Bénédiction</strong>: soigne ou protège vous ou vos alliés</li>
            </ul>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex: 'Je lance une boule de feu dévastatrice' (attaque) ou 'Je bénis mon allié avec une aura protectrice' (bénédiction)..." rows={5} style={{ width: '100%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ opacity: 0.8, fontSize: '0.9em' }}>💡 Soyez cohérent, original et rapide</div>
            <button type="submit" style={{ background: '#154a8a', color: '#fff', padding: '8px 12px', borderRadius: 8 }}>Envoyer</button>
          </div>
        </form>
      )}

      <ResultModal result={showResult ? wizardMyResult : null} onClose={() => setShowResult(false)} />
    </div>
  );
}
