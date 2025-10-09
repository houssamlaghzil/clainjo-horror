import React, { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function GMCharacters() {
  const { players, gmUpdatePlayer } = useRealtime();
  const [selectedId, setSelectedId] = useState('');

  const playerOptions = useMemo(() => players.map((p) => ({ value: p.socketId, label: p.name || p.socketId.slice(0, 4) })), [players]);
  const current = useMemo(() => players.find((p) => p.socketId === selectedId) || null, [players, selectedId]);

  // editable local state
  const [hp, setHp] = useState(0);
  const [money, setMoney] = useState(0);
  const [strength, setStrength] = useState(0);
  const [intelligence, setIntelligence] = useState(0);
  const [agility, setAgility] = useState(0);
  const [lucidity, setLucidity] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [skills, setSkills] = useState([]);

  // when selection or players change, refresh local state
  useEffect(() => {
    if (!players.length) { setSelectedId(''); return; }
    setSelectedId((prev) => {
      if (!prev) return players[0].socketId;
      const exists = players.some((p) => p.socketId === prev);
      return exists ? prev : players[0].socketId;
    });
  }, [players]);

  useEffect(() => {
    if (!current) return;
    setHp(current.hp ?? 0);
    setMoney(current.money ?? 0);
    setStrength(current.strength ?? 0);
    setIntelligence(current.intelligence ?? 0);
    setAgility(current.agility ?? 0);
    setLucidity(current.lucidity ?? 0);
    setInventory(Array.isArray(current.inventory) ? current.inventory.map((it) => ({ name: it?.name || '', description: it?.description || '', locked: !!it.locked })) : []);
    setSkills(Array.isArray(current.skills) ? current.skills.map((it) => ({ name: it?.name || '', description: it?.description || '', locked: !!it.locked })) : []);
  }, [current]);

  const addItem = () => setInventory((l) => [...l, { name: '', description: '', locked: false }]);
  const delItem = (i) => setInventory((l) => l.filter((_, idx) => idx !== i));
  const editItem = (i, f, v) => setInventory((l) => l.map((it, idx) => idx === i ? { ...it, [f]: v } : it));

  const addSkill = () => setSkills((l) => [...l, { name: '', description: '', locked: false }]);
  const delSkill = (i) => setSkills((l) => l.filter((_, idx) => idx !== i));
  const editSkill = (i, f, v) => setSkills((l) => l.map((it, idx) => idx === i ? { ...it, [f]: v } : it));

  const resetFromLive = () => {
    if (!current) return;
    setHp(current.hp ?? 0);
    setMoney(current.money ?? 0);
    setStrength(current.strength ?? 0);
    setIntelligence(current.intelligence ?? 0);
    setAgility(current.agility ?? 0);
    setLucidity(current.lucidity ?? 0);
    setInventory(Array.isArray(current.inventory) ? current.inventory.map((it) => ({ name: it?.name || '', description: it?.description || '', locked: !!it.locked })) : []);
    setSkills(Array.isArray(current.skills) ? current.skills.map((it) => ({ name: it?.name || '', description: it?.description || '', locked: !!it.locked })) : []);
  };

  const save = () => {
    if (!current) return;
    const inv = inventory.map((it) => ({ name: (it.name || '').trim(), description: (it.description || '').trim(), locked: !!it.locked }));
    const skl = skills.map((it) => ({ name: (it.name || '').trim(), description: (it.description || '').trim(), locked: !!it.locked }));
    gmUpdatePlayer({ target: current.socketId, hp: Number(hp || 0), money: Number(money || 0), strength: Number(strength || 0), intelligence: Number(intelligence || 0), agility: Number(agility || 0), lucidity: Number(lucidity || 0), inventory: inv, skills: skl });
  };

  return (
    <div className="page">
      <header className="page-header" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Tableau de bord — Personnages</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={resetFromLive}>Réinitialiser</button>
          <button type="button" onClick={save} style={{ background: '#0a6d36' }}>Enregistrer</button>
        </div>
      </header>

      <div className="stack">
        <label>
          Joueur
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {playerOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        {current && (
          <div className="card" style={{ padding: 12 }}>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <label>PV<input type="number" value={hp} onChange={(e) => setHp(Number(e.target.value))} /></label>
              <label>Argent<input type="number" value={money} onChange={(e) => setMoney(Number(e.target.value))} /></label>
              <label>Force<input type="number" value={strength} onChange={(e) => setStrength(Number(e.target.value))} /></label>
              <label>Intelligence<input type="number" value={intelligence} onChange={(e) => setIntelligence(Number(e.target.value))} /></label>
              <label>Agilité<input type="number" value={agility} onChange={(e) => setAgility(Number(e.target.value))} /></label>
              <label>Lucidité<input type="number" value={lucidity} onChange={(e) => setLucidity(Number(e.target.value))} min="0" /></label>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 12 }}>
          <h3>Inventaire</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {inventory.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', background: 'var(--bg-2)', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
                  <input value={it.name} onChange={(e) => editItem(idx, 'name', e.target.value)} placeholder="Nom de l'objet" />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {it.locked && <span title="Dérivé du template" style={{ opacity: 0.8 }}>🔒</span>}
                    <button type="button" onClick={() => delItem(idx)} style={{ background: '#3c1111' }}>Supprimer</button>
                  </div>
                </div>
                <textarea rows={3} value={it.description} onChange={(e) => editItem(idx, 'description', e.target.value)} placeholder="Description" />
              </div>
            ))}
            <button type="button" onClick={addItem}>+ Ajouter un objet</button>
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <h3>Compétences</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {skills.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', background: 'var(--bg-2)', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
                  <input value={it.name} onChange={(e) => editSkill(idx, 'name', e.target.value)} placeholder="Nom de la compétence" />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {it.locked && <span title="Dérivé du template" style={{ opacity: 0.8 }}>🔒</span>}
                    <button type="button" onClick={() => delSkill(idx)} style={{ background: '#3c1111' }}>Supprimer</button>
                  </div>
                </div>
                <textarea rows={3} value={it.description} onChange={(e) => editSkill(idx, 'description', e.target.value)} placeholder="Description" />
              </div>
            ))}
            <button type="button" onClick={addSkill}>+ Ajouter une compétence</button>
          </div>
        </div>
      </div>
    </div>
  );
}
