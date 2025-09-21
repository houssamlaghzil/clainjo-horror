import React, { useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function DiceRoller() {
  const { rollDice, diceLog, name } = useRealtime();
  const [sides, setSides] = useState(20);
  const [count, setCount] = useState(1);
  const [label, setLabel] = useState('');

  const onRoll = (e) => {
    e.preventDefault();
    rollDice({ sides: Number(sides), count: Number(count), label });
  };

  return (
    <div style={{ border: '1px solid #333', borderRadius: 8, padding: 12 }}>
      <h3>Jets de dés</h3>
      <form onSubmit={onRoll} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          Type
          <select value={sides} onChange={(e) => setSides(e.target.value)}>
            {[4, 6, 8, 10, 12, 20, 100].map((s) => (
              <option key={s} value={s}>d{s}</option>
            ))}
          </select>
        </label>
        <label>
          Nombre
          <input type="number" min="1" max="100" value={count} onChange={(e) => setCount(e.target.value)} style={{ width: 80 }} />
        </label>
        <label>
          Libellé
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="attaque, perception…" />
        </label>
        <button type="submit">Lancer</button>
      </form>
      <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
        {diceLog.slice().reverse().slice(0, 20).map((r) => (
          <div key={r.id} style={{ fontFamily: 'monospace', marginBottom: 6 }}>
            <span>({r.count}d{r.sides})</span>
            {r.label ? <span> [{r.label}] </span> : ' '}
            <strong>{r.rolls?.join(', ')}</strong>
            <span> = {r.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
