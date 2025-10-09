import React, { useEffect, useState } from 'react';
import { applyUpdate } from '../utils/pwa.js';

export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = (event) => {
      console.log('Mise à jour disponible:', event.detail);
      setShowUpdate(true);
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    const success = await applyUpdate();
    
    if (!success) {
      // Si la mise à jour échoue, recharger quand même
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      background: 'linear-gradient(135deg, #0a6d36 0%, #0a8d46 100%)',
      padding: '16px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      zIndex: 10001,
      maxWidth: '400px',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          marginBottom: '4px',
          color: '#fff'
        }}>
          🔄 Mise à jour disponible
        </div>
        <div style={{ 
          fontSize: '14px', 
          opacity: 0.9,
          color: '#fff'
        }}>
          Une nouvelle version de Clainjo Horror est disponible
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          style={{
            flex: 1,
            padding: '8px 16px',
            background: '#fff',
            color: '#0a6d36',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            opacity: isUpdating ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          {isUpdating ? 'Mise à jour...' : 'Mettre à jour'}
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Plus tard
        </button>
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
