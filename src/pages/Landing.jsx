import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import personages from '../assets/personages.json';

export default function Landing() {
  const navigate = useNavigate();
  const { join } = useRealtime();

  const [roomId, setRoomId] = useState('room-1');
  const [role, setRole] = useState('player');
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');

  const templates = useMemo(() => Array.isArray(personages) ? personages : [], []);
  const selected = useMemo(() => templates.find((p) => p.id === templateId) || null, [templates, templateId]);

  const toInventory = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map((o) => {
      const base = (o?.description || '').toString();
      const extras = [];
      if (o?.effect) extras.push(`Effet: ${o.effect}`);
      if (o?.damage) extras.push(`Dégâts: ${o.damage}`);
      if (o?.blocking != null) extras.push(`Blocage: ${o.blocking}`);
      if (o?.price != null) extras.push(`Prix: ${o.price}`);
      if (o?.usageLimit != null) extras.push(`Usage: ${o.usageLimit}`);
      const desc = [base, extras.join(' — ')].filter(Boolean).join('\n');
      return { name: (o?.name || '').toString(), description: desc };
    });
  };

  const toSkills = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map((s) => {
      const base = (s?.description || '').toString();
      const extra = s?.effect ? `\nEffet: ${s.effect}` : '';
      return { name: (s?.name || '').toString(), description: `${base}${extra}`.trim() };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomId || !role || !name) return;
    if (role === 'player' && selected) {
      const hp = Number(selected.health || 0);
      const money = Number(selected.gold || 0);
      const strength = Number(selected.strength || 0);
      const intelligence = Number(selected.intelligence || 0);
      const agility = Number(selected.agility || 0);
      const inventory = toInventory(selected.objects);
      const skills = toSkills(selected.skills);
      join({ roomId, role, name, hp, money, strength, intelligence, agility, inventory, skills });
    } else {
      join({ roomId, role, name });
    }
    navigate(role === 'gm' ? '/gm' : '/player');
  };

  return (
    <div style={{ padding: 16, maxWidth: 520, margin: '0 auto' }}>
      <h1>Clainjo Horror</h1>
      <p>Connectez-vous à une partie, choisissez votre rôle et entrez votre nom.</p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Room ID
          <input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="room-1" />
        </label>
        <div>
          <label style={{ marginRight: 12 }}>
            <input type="radio" name="role" value="player" checked={role === 'player'} onChange={() => setRole('player')} />
            Joueur
          </label>
          <label>
            <input type="radio" name="role" value="gm" checked={role === 'gm'} onChange={() => setRole('gm')} />
            Maître du jeu
          </label>
        </div>
        {role === 'player' && (
          <label>
            Personnage préfait
            <select
              value={templateId}
              onChange={(e) => {
                const v = e.target.value; setTemplateId(v);
                const p = templates.find((t) => t.id === v);
                if (p && !name) setName((p.name || '').trim());
              }}
            >
              <option value="">(aucun, personnaliser ensuite)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          Nom
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
        </label>
        {role === 'player' && selected && (
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{selected.name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 14, opacity: 0.9 }}>
              <span>PV: {selected.health ?? 0}</span>
              <span>Or: {selected.gold ?? 0}</span>
              <span>FOR: {selected.strength ?? 0}</span>
              <span>INT: {selected.intelligence ?? 0}</span>
              <span>AGI: {selected.agility ?? 0}</span>
              <span>Objets: {Array.isArray(selected.objects) ? selected.objects.length : 0}</span>
              <span>Compétences: {Array.isArray(selected.skills) ? selected.skills.length : 0}</span>
            </div>
          </div>
        )}
        <button type="submit">Entrer</button>
      </form>
    </div>
  );
}
