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
    <div style={{ position: 'relative', width: '100%', minHeight: '60vh', background: '#000' }}>
      <img src={src} alt={zone} style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'contain', maxHeight: 'calc(100vh - 160px)' }} />
    </div>
  );
}
