import React, { useEffect, useMemo } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

const SCREAMERS = {
  default: { bg: '#000', color: '#fff', text: '!!!', image: null },
  ghost: { bg: '#111', color: '#7ff', text: 'GHOST', image: null },
  shriek: { bg: '#8b0000', color: '#fff', text: 'SHRIEK', image: null },
  heartbeat: { bg: '#000', color: '#f33', text: 'HEARTBEAT', image: null },
};

export default function ScreamerOverlay() {
  const { screamer, setScreamer } = useRealtime();

  const style = useMemo(() => {
    if (!screamer) return null;
    const conf = SCREAMERS[screamer.id] || SCREAMERS.default;
    return conf;
  }, [screamer]);

  useEffect(() => {
    if (!screamer) return;
    // Auto dismiss after a short duration based on intensity
    const ms = 1500 + Math.floor((screamer.intensity || 0.8) * 1500);
    const t = setTimeout(() => setScreamer(null), ms);
    return () => clearTimeout(t);
  }, [screamer, setScreamer]);

  if (!screamer || !style) return null;

  return (
    <div
      onClick={() => setScreamer(null)}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: style.bg,
        color: style.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, fontWeight: 900,
      }}
    >
      {style.image ? (
        <img src={style.image} alt={screamer.id} style={{ maxWidth: '100%', maxHeight: '100%' }} />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div>{style.text}</div>
          <div style={{ fontSize: 18, marginTop: 12 }}>(Appuyez pour fermer)</div>
        </div>
      )}
    </div>
  );
}
