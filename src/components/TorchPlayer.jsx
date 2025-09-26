import React, { useEffect, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function TorchPlayer() {
  const {
    torchSupported,
    torchActive,
    startTorchSession,
    stopTorchSession,
    testTorchLocal,
    // camera selection
    cameraDevices,
    selectedCameraId,
    refreshVideoDevices,
    setCameraDevice,
    // lens / zoom
    zoomCap,
    setZoom,
    applyLensPreset,
  } = useRealtime();
  const [error, setError] = useState('');
  const [test, setTest] = useState('');
  const [camSel, setCamSel] = useState('');
  const [zoomVal, setZoomVal] = useState(null);

  useEffect(() => {
    // initialize local selection from context when available
    if (selectedCameraId && !camSel) setCamSel(selectedCameraId);
  }, [selectedCameraId, camSel]);

  const onStart = async () => {
    setError('');
    try {
      const ok = await startTorchSession(camSel ? { deviceId: camSel } : undefined);
      if (!ok) setError("Impossible d'initialiser la caméra (HTTPS requis sur mobile).");
    } catch (e) {
      setError('Erreur: ' + (e?.message || 'inconnue'));
    }
  };

  const onStop = () => {
    setError('');
    try { stopTorchSession(); } catch (e) { setError('Erreur: ' + (e?.message || 'inconnue')); }
  };

  const onTest = async () => {
    setTest('');
    try {
      const res = await testTorchLocal();
      if (res?.ok) {
        setTest(res.mode === 'native' ? 'Test: natif OK' : 'Test: fallback actif');
      } else {
        setTest('Test: échec (' + (res?.reason || 'inconnu') + ')');
      }
    } catch (e) {
      setTest('Test: erreur');
    }
  };

  return (
    <div style={{ border: '2px solid #1f2937', borderRadius: 12, padding: 12, background: 'rgba(17,24,39,0.5)' }}>
      <h3>Flash / Torche (mobile)</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={onStart} style={{ background: '#065f46', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Autoriser caméra</button>
        <button onClick={onStop} style={{ background: '#7f1d1d', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Couper</button>
        <button onClick={onTest} style={{ background: '#1d4ed8', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Tester mon flash</button>
        <span style={{ alignSelf: 'center', fontSize: 12, opacity: 0.9 }}>
          Support: <strong style={{ color: torchSupported ? '#22c55e' : '#ef4444' }}>{torchSupported ? 'Oui' : 'Non'}</strong>
          {torchSupported ? ` — Etat: ${torchActive ? 'ON' : 'OFF'}` : ''}
        </span>
      </div>

      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>Caméra:</label>
          <select value={camSel} onChange={(e) => setCamSel(e.target.value)} style={{ padding: 6, borderRadius: 6, background: '#0b1220', color: '#fff', border: '1px solid #334155' }}>
            <option value="">(par défaut)</option>
            {cameraDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || 'Caméra'} {d.facing !== 'unknown' ? `(${d.facing})` : ''}</option>
            ))}
          </select>
          <button onClick={onRefreshDevices} style={{ background: '#334155', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>Rafraîchir</button>
          <button onClick={onApplyCamera} style={{ background: '#0ea5e9', color: '#0b1220', padding: '6px 10px', borderRadius: 6 }}>Utiliser</button>
        </div>

        {zoomCap && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, opacity: 0.85 }}>Objectif / Zoom:</label>
            <input type="range" min={zoomCap.min} max={zoomCap.max} step={zoomCap.step} value={zoomVal ?? zoomCap.min} onChange={onZoomChange} style={{ flex: '1 1 160px' }} />
            <button onClick={() => applyLensPreset('ultrawide')} style={{ background: '#111827', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>Ultra-wide</button>
            <button onClick={() => applyLensPreset('wide')} style={{ background: '#111827', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>Wide</button>
            <button onClick={() => applyLensPreset('tele')} style={{ background: '#111827', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>Télé</button>
          </div>
        )}
      </div>
      {test && (
        <div style={{ marginTop: 8, color: '#93c5fd', fontSize: 12 }}>{test}</div>
      )}
      {error && (
        <div style={{ marginTop: 8, color: '#fca5a5', fontSize: 12 }}>{error}</div>
      )}
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
        Conseil: sur Android/Chrome, le flash requiert HTTPS (ou localhost). L'image de la caméra n'est pas affichée, seul le flash est piloté.
      </div>
    </div>
  );
}
