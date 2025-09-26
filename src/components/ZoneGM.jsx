import React, { useEffect, useMemo, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import { getZoneMaps, normalizeZoneName } from '../utils/zoneMaps.js';

export default function ZoneGM() {
  const { selectedZone, gmSetZone } = useRealtime();
  const maps = useMemo(() => getZoneMaps(), []);
  const keys = useMemo(() => Object.keys(maps).sort(), [maps]);
  const [local, setLocal] = useState(normalizeZoneName(selectedZone || 'village'));

  useEffect(() => {
    setLocal(normalizeZoneName(selectedZone || 'village'));
  }, [selectedZone]);

  const currentUrl = maps[local];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h3>Zone / Carte</h3>
      {keys.length === 0 ? (
        <div style={{ fontSize: 14, opacity: 0.8 }}>Aucune carte trouvée dans <code>src/assets/maps/</code>.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label>Zone:</label>
            <select value={local} onChange={(e) => setLocal(e.target.value)} style={{ padding: 6 }}>
              {keys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <button onClick={() => gmSetZone(local)}>Appliquer</button>
            <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>Actuelle: <strong>{normalizeZoneName(selectedZone || 'village')}</strong></span>
          </div>
          {currentUrl && (
            <div style={{ marginTop: 8, border: '1px solid #1f2937', borderRadius: 8, overflow: 'hidden', maxHeight: 180 }}>
              <img src={currentUrl} alt={local} style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
