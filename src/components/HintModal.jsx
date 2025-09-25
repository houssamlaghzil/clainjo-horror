import React, { useEffect } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function HintModal() {
  const { hintContent, setHintContent } = useRealtime();

  useEffect(() => {
    if (!hintContent) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setHintContent(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hintContent, setHintContent]);

  if (!hintContent) return null;

  const close = () => setHintContent(null);

  const backdrop = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  };
  const modal = {
    background: '#0f0f10', color: '#fff', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    width: 'min(92vw, 960px)', maxHeight: '85vh', overflow: 'hidden',
  };
  const header = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.12)'
  };
  const body = { padding: 12, background: '#121214' };
  const btn = {
    background: '#8b0000', color: '#fff', border: 'none', borderRadius: 6,
    padding: '8px 12px', cursor: 'pointer'
  };

  const renderContent = () => {
    if (hintContent.contentType === 'text') {
      return (
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 16 }}>
          {hintContent.text || ''}
        </div>
      );
    }
    if (hintContent.contentType === 'image') {
      return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {/* Intentionally no link to avoid easy re-open; image can still be screenshotted */}
          <img src={hintContent.url} alt="Indice" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
        </div>
      );
    }
    if (hintContent.contentType === 'pdf') {
      return (
        <div style={{ height: '70vh' }}>
          {/* Embed PDF; some browsers might require same-origin. No direct link to discourage saving. */}
          <iframe src={hintContent.url} title="Indice PDF" style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
      );
    }
    return <div>Indice</div>;
  };

  return (
    <div style={backdrop}>
      <div style={modal}>
        <div style={header}>
          <strong>Indice</strong>
          <button style={btn} onClick={close}>Fermer</button>
        </div>
        <div style={body}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
