import React, { useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function TorchPlayer() {
  const { torchSupported, torchActive, startTorchSession, stopTorchSession } = useRealtime();
  const [error, setError] = useState('');

  const onStart = async () => {
    setError('');
    try {
      const ok = await startTorchSession();
      if (!ok) setError("Impossible d'initialiser la caméra (HTTPS requis sur mobile).");
    } catch (e) {
      setError('Erreur: ' + (e?.message || 'inconnue'));
    }
  };

  const onStop = () => {
    setError('');
    try { stopTorchSession(); } catch (e) { setError('Erreur: ' + (e?.message || 'inconnue')); }
  };

  return (
    <div style={{ border: '2px solid #1f2937', borderRadius: 12, padding: 12, background: 'rgba(17,24,39,0.5)' }}>
      <h3>Flash / Torche (mobile)</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={onStart} style={{ background: '#065f46', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Autoriser caméra</button>
        <button onClick={onStop} style={{ background: '#7f1d1d', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Couper</button>
        <span style={{ alignSelf: 'center', fontSize: 12, opacity: 0.9 }}>
          Support: <strong style={{ color: torchSupported ? '#22c55e' : '#ef4444' }}>{torchSupported ? 'Oui' : 'Non'}</strong>
          {torchSupported ? ` — Etat: ${torchActive ? 'ON' : 'OFF'}` : ''}
        </span>
      </div>
      {error && (
        <div style={{ marginTop: 8, color: '#fca5a5', fontSize: 12 }}>{error}</div>
      )}
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
        Conseil: sur Android/Chrome, le flash requiert HTTPS (ou localhost). L'image de la caméra n'est pas affichée, seul le flash est piloté.
      </div>
    </div>
  );
}
