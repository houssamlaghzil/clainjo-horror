import React, { useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function CharacterSheet() {
  const { hp, money, inventory, updatePlayer } = useRealtime();
  const [hpEdit, setHpEdit] = useState(hp ?? 0);
  const [moneyEdit, setMoneyEdit] = useState(money ?? 0);
  const [invEdit, setInvEdit] = useState(Array.isArray(inventory) ? inventory.join(', ') : '');

  const save = (e) => {
    e.preventDefault();
    const inv = invEdit.split(',').map((s) => s.trim()).filter(Boolean);
    updatePlayer({ hp: Number(hpEdit), money: Number(moneyEdit), inventory: inv });
  };

  return (
    <div style={{ border: '1px solid #333', borderRadius: 8, padding: 12 }}>
      <h3>Fiche de personnage</h3>
      <form onSubmit={save} style={{ display: 'grid', gap: 8 }}>
        <label>
          Points de vie
          <input type="number" value={hpEdit} onChange={(e) => setHpEdit(e.target.value)} />
        </label>
        <label>
          Argent
          <input type="number" value={moneyEdit} onChange={(e) => setMoneyEdit(e.target.value)} />
        </label>
        <label>
          Inventaire (séparé par des virgules)
          <input value={invEdit} onChange={(e) => setInvEdit(e.target.value)} placeholder="torche, corde, clé" />
        </label>
        <button type="submit">Enregistrer</button>
      </form>
    </div>
  );
}
