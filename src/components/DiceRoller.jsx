import React, { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

// ==== Tunable globals for DiceRoller ====
const QUICK_SIDES = [4, 6, 8, 10, 12, 20, 100];
const ROLLING_FAILSAFE_MS = 1500; // stops spinner if no result arrives
const DICE_COUNT_MIN = 1;
const DICE_COUNT_MAX = 100;

export default function DiceRoller() {
  const { rollDice, diceLog, players } = useRealtime();
  const [sides, setSides] = useState(20);
  const [count, setCount] = useState(1);
  const [label, setLabel] = useState('');
  const [rolling, setRolling] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const quickSides = useMemo(() => QUICK_SIDES, []);
  const nameById = useMemo(() => {
    const map = new Map();
    (players || []).forEach((p) => map.set(p.socketId, p.name || p.socketId.slice(0, 4)));
    return map;
  }, [players]);

  const onRoll = (e) => {
    e.preventDefault();
    const s = Number(sides);
    const c = Number(count);
    rollDice({ sides: s, count: c, label });
    setRolling(true);
    // fail-safe stop if no event comes (network hiccup)
    setTimeout(() => setRolling(false), ROLLING_FAILSAFE_MS);
  };

  // stop rolling as soon as a new result appears
  useEffect(() => {
    if (!rolling) return;
    if (diceLog?.length) setRolling(false);
  }, [diceLog, rolling]);

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, background: 'rgba(0,0,0,0.35)' }}>
      <h3>Jets de dés</h3>
      <form onSubmit={onRoll} style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {quickSides.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSides(s)}
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                padding: '6px 10px',
                background: Number(sides) === s ? '#1b1b1b' : '#101010',
                color: Number(sides) === s ? '#fff' : '#bbb',
                minWidth: 52,
              }}
            >
              d{s}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            Type
            <select value={sides} onChange={(e) => setSides(e.target.value)}>
              {quickSides.map((s) => (
                <option key={s} value={s}>d{s}</option>
              ))}
            </select>
          </label>
          <label>
            Nombre
            <input type="number" min={DICE_COUNT_MIN} max={DICE_COUNT_MAX} value={count} onChange={(e) => setCount(e.target.value)} style={{ width: 80 }} />
          </label>
          <label style={{ flex: 1 }}>
            Libellé
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="attaque, perception…" />
          </label>
          <button type="submit" disabled={rolling} style={{ backgroundColor: '#d4af37', color: '#1a1410', padding: '8px 12px', borderRadius: 8, fontWeight: 700 }}>
            {rolling ? '…' : 'Lancer'}
          </button>
        </div>
      </form>

      {/* Rolling animation */}
      {rolling && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#3a2d20', border: '1px solid rgba(212,175,55,0.3)', position: 'relative', animation: 'shake 0.6s infinite' }}>
            <div style={{ position: 'absolute', top: 6, left: 6, width: 6, height: 6, background: '#ffd700', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, background: '#ffd700', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: 6, left: 11, width: 6, height: 6, background: '#ffd700', borderRadius: '50%' }} />
          </div>
          <div style={{ opacity: 0.9 }}>Lancement en cours…</div>
        </div>
      )}

      <style>{`@keyframes shake { 0%{ transform: translate(0,0) rotate(0deg); } 25%{ transform: translate(1px,-1px) rotate(2deg);} 50%{ transform: translate(-1px,1px) rotate(-3deg);} 75%{ transform: translate(1px,1px) rotate(2deg);} 100%{ transform: translate(0,0) rotate(0deg);} }`}</style>

      <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 12 }}>
        {(expanded ? diceLog.slice().reverse() : diceLog.slice(-5).reverse()).map((r) => (
          <div key={r.id} style={{ fontFamily: 'monospace', marginBottom: 6, background: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ opacity: 0.75, marginRight: 6 }}>
              {nameById.get(r.from) || r.from?.slice(0, 4)}
            </span>
            <span style={{ opacity: 0.85 }}>({r.count}d{r.sides})</span>
            {r.label ? <span> [{r.label}] </span> : ' '}
            <strong style={{ color: '#ffd700' }}>{r.rolls?.join(', ')}</strong>
            <span> = <strong>{r.total}</strong></span>
            {r.modifier && (
              <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.85 }}>
                | mod: {r.modifier.kind === 'malus' ? '+' : '-'}{r.modifier.value} {r.modifier.kind}
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, textAlign: 'right' }}>
        {diceLog.length > 5 && (
          <button type="button" onClick={() => setExpanded((v) => !v)} style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 10px', color: '#fff' }}>
            {expanded ? 'Voir moins' : `Voir plus (${diceLog.length - 5})`}
          </button>
        )}
      </div>
    </div>
  );
}
