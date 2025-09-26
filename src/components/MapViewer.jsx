import React, { useMemo } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import { getZoneMaps, normalizeZoneName } from '../utils/zoneMaps.js';

export default function MapViewer() {
  const { selectedZone } = useRealtime();
  const maps = useMemo(() => getZoneMaps(), []);
  const zone = normalizeZoneName(selectedZone || 'village');
  const src = maps[zone];

  if (!src) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', width: '100%', minHeight: '60vh', color: '#94a3b8' }}>
        <div>
          <div style={{ fontSize: 14 }}>Aucune carte trouvée pour:</div>
          <div style={{ fontWeight: 600 }}>{zone}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={src}
        alt={zone}
        style={{
          display: 'block',
          width: '100vw',
          height: '100vh',
          objectFit: 'contain',
          objectPosition: 'center center',
        }}
      />
    </div>
  );
}
