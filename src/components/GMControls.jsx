import React, { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

// ==== Tunable globals for GMControls (screamers) ====
export const DEFAULT_SCREAMER_INTENSITY = 0.8;
export const SCREAMER_TYPES = [
  { value: 'default', label: 'Default' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'shriek', label: 'Shriek' },
];

export default function GMControls() {
  const { players, sendScreamer, sendHint } = useRealtime();
  const [targets, setTargets] = useState('all'); // 'all' | [socketId]
  const [screamerId, setScreamerId] = useState('default');
  const [intensity, setIntensity] = useState(DEFAULT_SCREAMER_INTENSITY);

  // hint state
  const [hintTarget, setHintTarget] = useState('');
  const [hintMode, setHintMode] = useState('modifier'); // 'modifier' | 'info'
  const [hintKind, setHintKind] = useState('bonus'); // for modifier: 'bonus' | 'malus'
  const [hintValue, setHintValue] = useState(2);
  const [hintDuration, setHintDuration] = useState(5000);
  // content hint fields
  const [contentType, setContentType] = useState('text'); // 'text' | 'image' | 'pdf'
  const [contentText, setContentText] = useState('');
  const [contentUrl, setContentUrl] = useState('');

  // no haptics state here — dedicated panel HapticsGM.jsx handles it

  const playerOptions = useMemo(() => players.map((p) => ({ value: p.socketId, label: p.name || p.socketId.slice(0, 4) })), [players]);

  // Sanitize targets when player list changes
  useEffect(() => {
    setTargets((prev) => {
      if (prev === 'all') return 'all';
      const set = new Set(players.map((p) => p.socketId));
      const filtered = (Array.isArray(prev) ? prev : []).filter((id) => set.has(id));
      return filtered.length === playerOptions.length ? 'all' : filtered;
    });
  }, [players, playerOptions.length]);

  const onSend = (e) => {
    e.preventDefault();
    sendScreamer({ targets, screamerId, intensity: Number(intensity) });
  };

  const onSendHint = (e) => {
    e.preventDefault();
    const target = hintTarget || (players[0]?.socketId || '');
    if (!target) return;
    if (hintMode === 'modifier') {
      sendHint({ target, kind: hintKind, value: Number(hintValue), durationMs: Number(hintDuration) });
    } else {
      const content = contentType === 'text'
        ? { type: 'text', text: contentText }
        : { type: contentType, url: contentUrl };
      sendHint({ target, kind: 'info', durationMs: Number(hintDuration), content });
      // reset content fields lightly
      setContentText('');
      setContentUrl('');
    }
  };

  const toggleTarget = (sid) => {
    setTargets((prev) => {
      if (prev === 'all') return [sid];
      const arr = Array.isArray(prev) ? [...prev] : [];
      const idx = arr.indexOf(sid);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(sid);
      return arr.length === players.length ? 'all' : arr;
    });
  };

  return (
    <div style={{ border: '2px solid #8b0000', borderRadius: 12, padding: 12, background: 'rgba(139,0,0,0.08)' }}>
      <h3>Contrôles MJ — Screamers</h3>
      <form onSubmit={onSend} style={{ display: 'grid', gap: 8 }}>
        <label>
          Séléction des cibles ({targets === 'all' ? playerOptions.length : (Array.isArray(targets) ? targets.length : 0)}/{playerOptions.length})
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={() => setTargets('all')} style={{ border: '1px solid #b3001b', borderRadius: 20, padding: '6px 10px', background: targets === 'all' ? '#1b1b1b' : '#101010', color: '#fff' }}>Tous</button>
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
          Type de screamer
          <select value={screamerId} onChange={(e) => setScreamerId(e.target.value)}>
            {SCREAMER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label>
          Intensité: {intensity}
          <input type="range" min="0" max="1" step="0.05" value={intensity} onChange={(e) => setIntensity(e.target.value)} />
        </label>
        <button type="submit" style={{ backgroundColor: '#8b0000', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Envoyer</button>
      </form>

      <h3>Contrôles MJ — Indices</h3>
      <form onSubmit={onSendHint} style={{ display: 'grid', gap: 8 }}>
        <label>
          Cible
          <select value={hintTarget} onChange={(e) => setHintTarget(e.target.value)}>
            <option value="">(choisir)</option>
            {players.map((p) => (
              <option key={p.socketId} value={p.socketId}>{p.name || p.socketId.slice(0,4)}</option>
            ))}
          </select>
        </label>
        <label>
          Mode d'indice
          <select value={hintMode} onChange={(e) => setHintMode(e.target.value)}>
            <option value="modifier">Modificateur (bonus/malus)</option>
            <option value="info">Contenu (une seule vue)</option>
          </select>
        </label>
        {hintMode === 'modifier' ? (
          <>
            <label>
              Type
              <select value={hintKind} onChange={(e) => setHintKind(e.target.value)}>
                <option value="bonus">Bonus (total - valeur)</option>
                <option value="malus">Malus (total + valeur)</option>
              </select>
            </label>
            <label>
              Valeur
              <input type="number" value={hintValue} onChange={(e) => setHintValue(e.target.value)} min="0" step="1" />
            </label>
          </>
        ) : (
          <>
            <label>
              Format
              <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                <option value="text">Texte</option>
                <option value="image">Image (URL)</option>
                <option value="pdf">PDF (URL)</option>
              </select>
            </label>
            {contentType === 'text' ? (
              <label>
                Texte de l'indice
                <textarea value={contentText} onChange={(e) => setContentText(e.target.value)} rows={4} placeholder="Saisir le texte de l'indice..." />
              </label>
            ) : (
              <label>
                URL du contenu
                <input type="url" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} placeholder="Ex: /hints/plan.pdf ou https://..." />
              </label>
            )}
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Astuce: placez vos fichiers dans le dossier public/ et indiquez un chemin comme /hints/plan.pdf
            </div>
          </>
        )}
        <label>
          Durée (ms)
          <input type="number" value={hintDuration} onChange={(e) => setHintDuration(e.target.value)} min="1000" step="500" />
        </label>
        <button type="submit" style={{ backgroundColor: '#0a6d36', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Envoyer l'indice</button>
      </form>
    </div>
  );
}
