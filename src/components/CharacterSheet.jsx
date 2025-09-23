import React, { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import CollapsibleSection from './CollapsibleSection.jsx';

export default function CharacterSheet() {
  const { hp, money, inventory, strength, intelligence, agility, skills, updatePlayer } = useRealtime();

  // Basic stats
  const [hpEdit, setHpEdit] = useState(hp ?? 0);
  const [moneyEdit, setMoneyEdit] = useState(money ?? 0);
  const [strEdit, setStrEdit] = useState(strength ?? 0);
  const [intEdit, setIntEdit] = useState(intelligence ?? 0);
  const [agiEdit, setAgiEdit] = useState(agility ?? 0);

  // Structured lists: inventory and skills
  const normalizeInventory = useMemo(() => (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((it) => {
      if (typeof it === 'string') return { name: it, description: '' };
      const name = (it?.name ?? '').toString();
      const description = (it?.description ?? '').toString();
      return { name, description };
    });
  }, []);

  const [invList, setInvList] = useState(normalizeInventory(inventory));
  const [skillsList, setSkillsList] = useState(Array.isArray(skills) ? skills.map((s) => ({ name: (s?.name ?? '').toString(), description: (s?.description ?? '').toString() })) : []);

  // collapsible subsections
  const [invCollapsed, setInvCollapsed] = useState(false);
  const [skillsCollapsed, setSkillsCollapsed] = useState(false);

  // Keep local edits in sync when realtime state changes (e.g., rejoin/state:init)
  useEffect(() => { setHpEdit(hp ?? 0); }, [hp]);
  useEffect(() => { setMoneyEdit(money ?? 0); }, [money]);
  useEffect(() => { setStrEdit(strength ?? 0); }, [strength]);
  useEffect(() => { setIntEdit(intelligence ?? 0); }, [intelligence]);
  useEffect(() => { setAgiEdit(agility ?? 0); }, [agility]);
  useEffect(() => { setInvList(normalizeInventory(inventory)); }, [inventory, normalizeInventory]);
  useEffect(() => { setSkillsList(Array.isArray(skills) ? skills.map((s) => ({ name: (s?.name ?? '').toString(), description: (s?.description ?? '').toString() })) : []); }, [skills]);

  const addInv = () => setInvList((l) => [...l, { name: '', description: '' }]);
  const removeInv = (idx) => setInvList((l) => l.filter((_, i) => i !== idx));
  const editInv = (idx, field, value) => setInvList((l) => l.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const addSkill = () => setSkillsList((l) => [...l, { name: '', description: '' }]);
  const removeSkill = (idx) => setSkillsList((l) => l.filter((_, i) => i !== idx));
  const editSkill = (idx, field, value) => setSkillsList((l) => l.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const save = (e) => {
    e.preventDefault();
    const inv = invList
      .map((it) => ({ name: (it.name || '').trim(), description: (it.description || '').trim() }))
      .filter((it) => it.name.length > 0);
    const skl = skillsList
      .map((it) => ({ name: (it.name || '').trim(), description: (it.description || '').trim() }))
      .filter((it) => it.name.length > 0);
    updatePlayer({
      hp: Number(hpEdit),
      money: Number(moneyEdit),
      strength: Number(strEdit),
      intelligence: Number(intEdit),
      agility: Number(agiEdit),
      inventory: inv,
      skills: skl,
    });
  };

  return (
    <div className="card" style={{ padding: 12 }}>
      <h3>Fiche de personnage</h3>
      <form onSubmit={save} style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
          <label>
            Points de vie
            <input type="number" value={hpEdit} onChange={(e) => setHpEdit(Number(e.target.value))} />
          </label>
          <label>
            Argent
            <input type="number" value={moneyEdit} onChange={(e) => setMoneyEdit(Number(e.target.value))} />
          </label>
          <label>
            Force
            <input type="number" value={strEdit} onChange={(e) => setStrEdit(Number(e.target.value))} />
          </label>
          <label>
            Intelligence
            <input type="number" value={intEdit} onChange={(e) => setIntEdit(Number(e.target.value))} />
          </label>
          <label>
            Agilité
            <input type="number" value={agiEdit} onChange={(e) => setAgiEdit(Number(e.target.value))} />
          </label>
        </div>

        <CollapsibleSection title="Inventaire" collapsed={invCollapsed} onToggle={() => setInvCollapsed((v) => !v)}>
          <div style={{ display: 'grid', gap: 8 }}>
            {invList.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 8 }}>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto' }}>
                  <input placeholder="Nom de l'objet" value={it.name} onChange={(e) => editInv(idx, 'name', e.target.value)} />
                  <button type="button" onClick={() => removeInv(idx)} style={{ background: '#3c1111' }}>Supprimer</button>
                </div>
                <textarea rows={2} placeholder="Description" value={it.description} onChange={(e) => editInv(idx, 'description', e.target.value)} />
              </div>
            ))}
            <button type="button" onClick={addInv} style={{ background: '#101010' }}>+ Ajouter un objet</button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Compétences" collapsed={skillsCollapsed} onToggle={() => setSkillsCollapsed((v) => !v)}>
          <div style={{ display: 'grid', gap: 8 }}>
            {skillsList.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 8 }}>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto' }}>
                  <input placeholder="Nom de la compétence" value={it.name} onChange={(e) => editSkill(idx, 'name', e.target.value)} />
                  <button type="button" onClick={() => removeSkill(idx)} style={{ background: '#3c1111' }}>Supprimer</button>
                </div>
                <textarea rows={2} placeholder="Description" value={it.description} onChange={(e) => editSkill(idx, 'description', e.target.value)} />
              </div>
            ))}
            <button type="button" onClick={addSkill} style={{ background: '#101010' }}>+ Ajouter une compétence</button>
          </div>
        </CollapsibleSection>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="submit">Enregistrer</button>
        </div>
      </form>
    </div>
  );
}
