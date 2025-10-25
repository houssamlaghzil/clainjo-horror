import React, { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function WizardGM() {
  const {
    players,
    wizardActive,
    wizardRound,
    wizardResolving,
    wizardAIResult,
    wizardAIError,
    wizardToggle,
    wizardForce,
    wizardRetry,
    wizardManual,
    wizardPublish,
    wizardGet,
  } = useRealtime();

  const [editing, setEditing] = useState({});

  const nameById = useMemo(() => {
    const m = new Map();
    (players || []).forEach((p) => m.set(p.socketId, p.name || p.socketId.slice(0, 4)));
    return m;
  }, [players]);

  // Load current info when the console mounts or when active/round changes
  useEffect(() => {
    if (wizardActive) wizardGet();
  }, [wizardActive, wizardRound, wizardGet]);

  // Hydrate editable results from latest AI result
  useEffect(() => {
    if (wizardAIResult?.results) {
      setEditing(wizardAIResult.results);
    }
  }, [wizardAIResult]);

  const submissions = wizardAIResult?.submissions || {};
  const groups = wizardAIResult?.groups || [];

  const onToggle = () => wizardToggle(!wizardActive);

  const onChangeField = (sid, field, value) => {
    setEditing((prev) => ({
      ...prev,
      [sid]: { ...prev[sid], [field]: value },
    }));
  };

  const onPublish = () => wizardPublish(editing);
  const onManual = () => wizardManual(editing);

  return (
    <div style={{ border: '2px solid #154a8a', borderRadius: 12, padding: 12, background: 'rgba(21,74,138,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Wizard Battle — Console MJ</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>Manche: <strong>{wizardRound}</strong></span>
          <button onClick={onToggle} style={{ background: wizardActive ? '#7a1b1b' : '#154a8a', color: '#fff', padding: '6px 10px', borderRadius: 8 }}>
            {wizardActive ? 'Désactiver' : 'Activer'}
          </button>
        </div>
      </div>

      {!wizardActive && (
        <div style={{ marginTop: 8, opacity: 0.85 }}>Le mode Wizard Battle est inactif.</div>
      )}

      {wizardActive && (
        <>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={wizardForce} disabled={wizardResolving} style={{ background: '#d4af37', color: '#1a1410', padding: '6px 10px', borderRadius: 8, fontWeight: 700 }}>Forcer résolution</button>
            {wizardAIError?.canRetry && (
              <button onClick={wizardRetry} disabled={wizardResolving} style={{ background: '#b36a00', color: '#fff', padding: '6px 10px', borderRadius: 8 }}>Relancer IA</button>
            )}
            {wizardAIError && (
              <span style={{ color: '#ffcd75' }}>Erreur IA: {wizardAIError.message}</span>
            )}
            {wizardResolving && (
              <span style={{ opacity: 0.9 }}>Résolution en cours…</span>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>Groupes secrets</h4>
            {groups.length ? (
              <ul>
                {groups.map((g, idx) => (
                  <li key={idx}>
                    {g.map((sid) => nameById.get(sid) || sid.slice(0, 4)).join(' · ')}
                  </li>
                ))}
              </ul>
            ) : (
              <div>(en attente de groupes…)</div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>Sorts envoyés</h4>
            {Object.keys(submissions).length ? (
              <ul>
                {Object.entries(submissions).map(([sid, s]) => (
                  <li key={sid}>
                    <strong>{nameById.get(sid) || sid.slice(0,4)}:</strong> <span style={{ opacity: 0.9 }}>{s.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div>(aucun pour l’instant)</div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>Résultats (IA / éditables)</h4>
            {Object.keys(editing).length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {Object.entries(editing).map(([sid, r]) => (
                  <div key={sid} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 10 }}>
                    <div style={{ marginBottom: 6 }}><strong>{nameById.get(sid) || sid.slice(0,4)}</strong></div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <label>
                        Infligé
                        <input value={r?.inflicted || ''} onChange={(e) => onChangeField(sid, 'inflicted', e.target.value)} />
                      </label>
                      <label>
                        Subi
                        <input value={r?.suffered || ''} onChange={(e) => onChangeField(sid, 'suffered', e.target.value)} />
                      </label>
                      <label>
                        Modif dé (négatif = bonus, positif = malus)
                        <input type="number" value={Number(r?.diceMod || 0)} onChange={(e) => onChangeField(sid, 'diceMod', Number(e.target.value))} />
                      </label>
                      <label>
                        PV (positif = soin, négatif = dégâts)
                        <input type="number" value={Number(r?.hpDelta || 0)} onChange={(e) => onChangeField(sid, 'hpDelta', Number(e.target.value))} />
                      </label>
                      <label>
                        Effet narratif
                        <input value={r?.narrative || ''} onChange={(e) => onChangeField(sid, 'narrative', e.target.value)} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>(en attente de résultats IA…)</div>
            )}
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button onClick={onPublish} style={{ background: '#0a6d36', color: '#fff', padding: '8px 12px', borderRadius: 8 }}>Publier</button>
              <button onClick={onManual} style={{ background: '#444', color: '#fff', padding: '8px 12px', borderRadius: 8 }}>Appliquer manuellement</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
