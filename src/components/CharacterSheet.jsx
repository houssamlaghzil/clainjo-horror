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
      const locked = !!it?.locked;
      return { name, description, locked };
    });
  }, []);

  const [invList, setInvList] = useState(normalizeInventory(inventory));
  const [skillsList, setSkillsList] = useState(Array.isArray(skills) ? skills.map((s) => ({ name: (s?.name ?? '').toString(), description: (s?.description ?? '').toString(), locked: !!s?.locked })) : []);

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
  useEffect(() => { setSkillsList(Array.isArray(skills) ? skills.map((s) => ({ name: (s?.name ?? '').toString(), description: (s?.description ?? '').toString(), locked: !!s?.locked })) : []); }, [skills]);

  const addInv = () => setInvList((l) => [...l, { name: '', description: '' }]);
  const removeInv = (idx) => setInvList((l) => l.filter((_, i) => i !== idx));
  const editInv = (idx, field, value) => setInvList((l) => l.map((it, i) => {
    if (i !== idx) return it;
    if (it.locked) return it; // cannot edit locked template items
    return { ...it, [field]: value };
  }));

  const addSkill = () => setSkillsList((l) => [...l, { name: '', description: '' }]);
  const removeSkill = (idx) => setSkillsList((l) => l.filter((_, i) => i !== idx));
  const editSkill = (idx, field, value) => setSkillsList((l) => l.map((it, i) => {
    if (i !== idx) return it;
    if (it.locked) return it; // cannot edit locked template skills
    return { ...it, [field]: value };
  }));

  const save = (e) => {
    e.preventDefault();
    const inv = invList
      .map((it) => ({ name: (it.name || '').trim(), description: (it.description || '').trim(), locked: !!it.locked }))
      .filter((it) => it.name.length > 0);
    const skl = skillsList
      .map((it) => ({ name: (it.name || '').trim(), description: (it.description || '').trim(), locked: !!it.locked }))
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
    <section style={{ padding: '8px 0' }}>
      <h3 style={{ margin: '0 0 8px 0' }}>Fiche de personnage</h3>
      <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr' }}>
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

        <CollapsibleSection title="Inventaire" collapsed={invCollapsed} onToggle={() => setInvCollapsed((v) => !v)} noCard>
          <div style={{ display: 'grid', gap: 10 }}>
            {invList.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', background: 'var(--bg-2)', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
                  <input placeholder="Nom de l'objet" value={it.name} onChange={(e) => editInv(idx, 'name', e.target.value)} disabled={!!it.locked} />
                  {it.locked ? (
                    <span title="Élément d'origine (verrouillé)" style={{ opacity: 0.8 }}>🔒</span>
                  ) : (
                    <button type="button" onClick={() => removeInv(idx)} style={{ background: '#3c1111' }}>Supprimer</button>
                  )}
                </div>
                <textarea rows={3} placeholder="Description" value={it.description} onChange={(e) => editInv(idx, 'description', e.target.value)} disabled={!!it.locked} />
              </div>
            ))}
            <button type="button" onClick={addInv} style={{ background: '#101010' }}>+ Ajouter un objet</button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Compétences" collapsed={skillsCollapsed} onToggle={() => setSkillsCollapsed((v) => !v)} noCard>
          <div style={{ display: 'grid', gap: 10 }}>
            {skillsList.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', background: 'var(--bg-2)', borderRadius: 10, padding: 10 }}>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
                  <input placeholder="Nom de la compétence" value={it.name} onChange={(e) => editSkill(idx, 'name', e.target.value)} disabled={!!it.locked} />
                  {it.locked ? (
                    <span title="Compétence d'origine (verrouillée)" style={{ opacity: 0.8 }}>🔒</span>
                  ) : (
                    <button type="button" onClick={() => removeSkill(idx)} style={{ background: '#3c1111' }}>Supprimer</button>
                  )}
                </div>
                <textarea rows={3} placeholder="Description" value={it.description} onChange={(e) => editSkill(idx, 'description', e.target.value)} disabled={!!it.locked} />
              </div>
            ))}
            <button type="button" onClick={addSkill} style={{ background: '#101010' }}>+ Ajouter une compétence</button>
          </div>
        </CollapsibleSection>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="submit">Enregistrer</button>
        </div>
      </form>
    </section>
  );
}
