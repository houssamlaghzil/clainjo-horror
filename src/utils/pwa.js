// Utilitaires PWA pour Clainjo Horror
// Gestion de l'installation, du service worker et des mises à jour

let deferredPrompt = null;
let swRegistration = null;

/**
 * Enregistrer le Service Worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Worker non supporté par ce navigateur');
    return null;
  }

  try {
    console.log('[PWA] Enregistrement du Service Worker...');
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    swRegistration = registration;
    
    console.log('[PWA] Service Worker enregistré avec succès:', registration.scope);

    // Vérifier les mises à jour
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('[PWA] Nouvelle version du Service Worker détectée');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[PWA] Nouvelle version disponible');
          // Notifier l'utilisateur qu'une mise à jour est disponible
          notifyUpdate();
        }
      });
    });

    // Vérifier les mises à jour toutes les heures
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('[PWA] Erreur lors de l\'enregistrement du Service Worker:', error);
    return null;
  }
}

/**
 * Désinscrire le Service Worker (pour debug)
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('[PWA] Service Worker désinscrit:', success);
      return success;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Erreur lors de la désinscription:', error);
    return false;
  }
}

/**
 * Vider tous les caches
 */
export async function clearAllCaches() {
  if (!('caches' in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('[PWA] Tous les caches ont été vidés');
    return true;
  } catch (error) {
    console.error('[PWA] Erreur lors du vidage des caches:', error);
    return false;
  }
}

/**
 * Capturer l'événement beforeinstallprompt
 */
export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA] beforeinstallprompt déclenché');
    // Empêcher l'affichage automatique
    e.preventDefault();
    // Stocker l'événement pour l'utiliser plus tard
    deferredPrompt = e;
    // Notifier l'application que l'installation est possible
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Application installée avec succès');
    deferredPrompt = null;
    // Notifier l'application
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

/**
 * Afficher le prompt d'installation
 */
export async function showInstallPrompt() {
  if (!deferredPrompt) {
    console.warn('[PWA] Aucun prompt d\'installation disponible');
    return { outcome: 'unavailable' };
  }

  try {
    console.log('[PWA] Affichage du prompt d\'installation');
    // Afficher le prompt
    deferredPrompt.prompt();
    
    // Attendre la réponse de l'utilisateur
    const choiceResult = await deferredPrompt.userChoice;
    console.log('[PWA] Choix de l\'utilisateur:', choiceResult.outcome);
    
    // Réinitialiser le prompt
    deferredPrompt = null;
    
    return choiceResult;
  } catch (error) {
    console.error('[PWA] Erreur lors de l\'affichage du prompt:', error);
    return { outcome: 'error', error };
  }
}

/**
 * Vérifier si l'application est installée
 */
export function isAppInstalled() {
  // Vérifier si l'app est en mode standalone
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Vérifier si l'app est lancée depuis l'écran d'accueil (iOS)
  const isIOSStandalone = window.navigator.standalone === true;
  
  return isStandalone || isIOSStandalone;
}

/**
 * Vérifier si l'installation est possible
 */
export function canInstall() {
  return deferredPrompt !== null;
}

/**
 * Notifier l'utilisateur d'une mise à jour disponible
 */
function notifyUpdate() {
  const event = new CustomEvent('pwa-update-available', {
    detail: {
      message: 'Une nouvelle version est disponible',
      action: 'reload'
    }
  });
  window.dispatchEvent(event);
}

/**
 * Appliquer la mise à jour (recharger la page)
 */
export async function applyUpdate() {
  if (!swRegistration || !swRegistration.waiting) {
    console.warn('[PWA] Aucune mise à jour en attente');
    return false;
  }

  try {
    // Envoyer un message au service worker pour qu'il s'active
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Recharger la page une fois le nouveau SW activé
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Nouveau Service Worker activé, rechargement...');
      window.location.reload();
    });
    
    return true;
  } catch (error) {
    console.error('[PWA] Erreur lors de l\'application de la mise à jour:', error);
    return false;
  }
}

/**
 * Obtenir des informations sur le Service Worker
 */
export async function getServiceWorkerInfo() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return null;
    }

    return {
      scope: registration.scope,
      updateViaCache: registration.updateViaCache,
      active: registration.active?.state,
      installing: registration.installing?.state,
      waiting: registration.waiting?.state
    };
  } catch (error) {
    console.error('[PWA] Erreur lors de la récupération des infos SW:', error);
    return null;
  }
}

/**
 * Vérifier la connexion réseau
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Écouter les changements de connexion
 */
export function setupNetworkListeners(onOnline, onOffline) {
  window.addEventListener('online', () => {
    console.log('[PWA] Connexion rétablie');
    if (onOnline) onOnline();
  });

  window.addEventListener('offline', () => {
    console.log('[PWA] Connexion perdue');
    if (onOffline) onOffline();
  });
}

/**
 * Obtenir les capacités PWA du navigateur
 */
export function getPWACapabilities() {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notifications: 'Notification' in window,
    backgroundSync: 'sync' in (swRegistration || {}),
    periodicSync: 'periodicSync' in (swRegistration || {}),
    share: 'share' in navigator,
    badging: 'setAppBadge' in navigator,
    fileHandling: 'launchQueue' in window,
    standalone: isAppInstalled()
  };
}

/**
 * Initialiser la PWA (à appeler au démarrage de l'app)
 */
export async function initPWA() {
  console.log('[PWA] Initialisation...');
  
  // Enregistrer le Service Worker
  await registerServiceWorker();
  
  // Configurer le prompt d'installation
  setupInstallPrompt();
  
  // Vérifier les capacités
  const capabilities = getPWACapabilities();
  console.log('[PWA] Capacités:', capabilities);
  
  // Vérifier si l'app est installée
  const installed = isAppInstalled();
  console.log('[PWA] Application installée:', installed);
  
  return {
    installed,
    capabilities
  };
}

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  clearAllCaches,
  setupInstallPrompt,
  showInstallPrompt,
  isAppInstalled,
  canInstall,
  applyUpdate,
  getServiceWorkerInfo,
  isOnline,
  setupNetworkListeners,
  getPWACapabilities,
  initPWA
};
