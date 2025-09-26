import React, { useMemo, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function TorchGM() {
  const { players, gmSetTorch, gmTestTorch, gmTorchLog, torchSupportedMap, torchMeta } = useRealtime();
  const [targets, setTargets] = useState('all');
  const [expanded, setExpanded] = useState({}); // socketId -> boolean

  const rows = useMemo(() => players.map((p) => ({
    id: p.socketId,
    name: p.name || p.socketId.slice(0,4),
    supported: !!torchSupportedMap[p.socketId],
  })), [players, torchSupportedMap]);

  const toggleTarget = (sid) => {
    setTargets((prev) => {
      if (prev === 'all') return [sid];
      const arr = Array.isArray(prev) ? [...prev] : [];
      const idx = arr.indexOf(sid);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(sid);
      return arr.length === players.length ? 'all' : arr;
    });
  };

  const onAll = (on) => gmSetTorch({ targets: 'all', on });
  const onSel = (on) => gmSetTorch({ targets, on });
  const onTest = () => gmTestTorch({ targets });
  const onTestAll = () => gmTestTorch({ targets: 'all' });

  const toggleDetails = (sid) => setExpanded((m) => ({ ...m, [sid]: !m[sid] }));

  return (
    <div style={{ border: '2px solid #334155', borderRadius: 12, padding: 12, background: 'rgba(15,23,42,0.4)' }}>
      <h3>Contrôles MJ — Flash/torch</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={() => onAll(true)} style={{ background: '#064e3b', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>Tous ON</button>
        <button onClick={() => onAll(false)} style={{ background: '#7f1d1d', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>Tous OFF</button>
        <button onClick={onTestAll} style={{ background: '#1d4ed8', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>Test (Tous)</button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((r) => {
          const selected = targets === 'all' || (Array.isArray(targets) && targets.includes(r.id));
          const meta = torchMeta?.[r.id];
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(2,6,23,0.6)', padding: 8, borderRadius: 8 }}>
              <button
                type="button"
                title={r.id}
                onClick={() => toggleTarget(r.id)}
                style={{
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20,
                  padding: '6px 10px', background: selected ? '#1b1b1b' : '#101010', color: selected ? '#fff' : '#ccc',
                }}
              >{r.name}</button>
              <span style={{ fontSize: 12, opacity: 0.85 }}>
                Support: <strong style={{ color: r.supported ? '#16a34a' : '#ef4444' }}>{r.supported ? 'Oui' : 'Non'}</strong>
              </span>
              {meta?.settings?.facingMode && (
                <span style={{ fontSize: 12, opacity: 0.8 }}>• Cam: {meta.settings.facingMode}</span>
              )}
              {typeof meta?.secure === 'boolean' && (
                <span style={{ fontSize: 12, opacity: 0.8 }}>• HTTPS: {meta.secure ? 'Oui' : 'Non'}</span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button onClick={() => onSel(true)} style={{ background: '#065f46', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>ON</button>
                <button onClick={() => onSel(false)} style={{ background: '#7f1d1d', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>OFF</button>
                <button onClick={onTest} style={{ background: '#1d4ed8', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>Test</button>
                <button onClick={() => toggleDetails(r.id)} style={{ background: '#334155', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>Détails</button>
              </div>
              {expanded[r.id] && (
                <div style={{ width: '100%', marginTop: 8, fontSize: 12, background: 'rgba(2,6,23,0.4)', padding: 8, borderRadius: 8 }}>
                  <div style={{ opacity: 0.85 }}>Dernière maj: {meta?.ts ? new Date(meta.ts).toLocaleTimeString() : '—'}</div>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                    {JSON.stringify({
                      supported: meta?.supported,
                      note: meta?.note,
                      settings: meta?.settings,
                      capabilities: meta?.capabilities && Object.keys(meta.capabilities).slice(0, 10),
                      constraints: meta?.constraints,
                      ua: meta?.ua ? String(meta.ua).slice(0, 120) + (String(meta.ua).length > 120 ? '…' : '') : undefined,
                      secure: meta?.secure,
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12 }}>
        <h4>Logs</h4>
        <div style={{ maxHeight: 160, overflow: 'auto', background: 'rgba(2,6,23,0.4)', padding: 8, borderRadius: 8 }}>
          {gmTorchLog.length === 0 ? (
            <div style={{ opacity: 0.7 }}>—</div>
          ) : (
            gmTorchLog.map((l, idx) => (
              <div key={idx} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                [{l.at}] {l.action} → {l.target}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
