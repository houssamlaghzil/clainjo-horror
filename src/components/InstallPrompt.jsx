import React, { useEffect, useState } from 'react';
import { showInstallPrompt, canInstall, isAppInstalled } from '../utils/pwa.js';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    setIsInstalled(isAppInstalled());

    // Écouter l'événement pwa-installable
    const handleInstallable = () => {
      if (!isAppInstalled()) {
        setShowPrompt(true);
      }
    };

    // Écouter l'événement pwa-installed
    const handleInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setIsInstalling(false);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);

    // Vérifier immédiatement si l'installation est possible
    if (canInstall() && !isAppInstalled()) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    const result = await showInstallPrompt();
    
    if (result.outcome === 'accepted') {
      console.log('Installation acceptée');
      // L'événement 'appinstalled' sera déclenché automatiquement
    } else if (result.outcome === 'dismissed') {
      console.log('Installation refusée');
      setShowPrompt(false);
      setIsInstalling(false);
    } else {
      console.log('Installation non disponible');
      setShowPrompt(false);
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Réafficher le prompt dans 7 jours
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // Ne rien afficher si l'app est installée ou si le prompt ne doit pas être affiché
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(135deg, #8b0000 0%, #a00000 100%)',
      padding: '16px',
      boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.5)',
      zIndex: 10000,
      animation: 'slideUp 0.3s ease-out'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            marginBottom: '4px',
            color: '#fff'
          }}>
            📱 Installer Clainjo Horror
          </div>
          <div style={{ 
            fontSize: '14px', 
            opacity: 0.9,
            color: '#fff'
          }}>
            Installez l'application pour une expérience optimale en plein écran
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            style={{
              padding: '10px 20px',
              background: '#fff',
              color: '#8b0000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isInstalling ? 'not-allowed' : 'pointer',
              opacity: isInstalling ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {isInstalling ? 'Installation...' : 'Installer'}
          </button>
          <button
            onClick={handleDismiss}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Plus tard
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
