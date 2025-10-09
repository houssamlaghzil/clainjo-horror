# 📱 Configuration PWA - Clainjo Horror

## Vue d'ensemble

Clainjo Horror est maintenant une **Progressive Web App (PWA)** complète, installable comme une **WebAPK sur Chrome Android**. Cette documentation explique l'architecture, le déploiement et les tests.

---

## 🏗️ Architecture PWA

### Fichiers créés

```
public/
├── manifest.json              # Manifest PWA (métadonnées app)
├── sw.js                      # Service Worker (cache & offline)
├── offline.html               # Page hors ligne
├── .well-known/
│   └── assetlinks.json       # Intent filter Android (liens profonds)
└── icons/                     # Icônes PWA (à générer)
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png

src/
├── utils/
│   └── pwa.js                 # Utilitaires PWA (installation, mises à jour)
└── components/
    ├── InstallPrompt.jsx      # Prompt d'installation
    └── UpdateNotification.jsx # Notification de mise à jour
```

---

## 🚀 Déploiement

### 1. Générer les icônes

**Option A: Utiliser le script automatique**

```bash
# Installer sharp (si pas déjà fait)
npm install sharp --save-dev

# Générer les icônes à partir d'une image source (1024x1024px recommandé)
node scripts/generate-icons.js path/to/your-logo.png
```

**Option B: Créer manuellement**

Créez des icônes PNG aux tailles suivantes dans `public/icons/`:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

**Outils recommandés:**
- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- Photoshop / GIMP / Figma

### 2. Configurer le domaine

**Modifier `public/.well-known/assetlinks.json`:**

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "web",
      "site": "https://votre-domaine.com"
    }
  }
]
```

⚠️ **Important:** Remplacez `votre-domaine.com` par votre domaine réel.

### 3. Configurer le serveur Express

Le serveur doit servir les fichiers statiques correctement:

```javascript
// server/index.js (déjà configuré)
app.use(express.static(distPath));

// Route catch-all pour le SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});
```

### 4. Build et déploiement

```bash
# Build de production
npm run build

# Démarrer le serveur
npm start
```

**Vérifications avant déploiement:**
- ✅ HTTPS activé (obligatoire pour PWA)
- ✅ `manifest.json` accessible à `/manifest.json`
- ✅ `sw.js` accessible à `/sw.js`
- ✅ `.well-known/assetlinks.json` accessible
- ✅ Toutes les icônes présentes dans `/icons/`

---

## 🧪 Tests

### Test local (développement)

```bash
# Démarrer en mode développement
npm run dev:all

# Ouvrir dans Chrome
# http://localhost:5173
```

⚠️ **Note:** Le Service Worker ne fonctionne qu'en HTTPS ou sur `localhost`.

### Test avec Lighthouse

1. Ouvrir Chrome DevTools (F12)
2. Aller dans l'onglet **Lighthouse**
3. Sélectionner **Progressive Web App**
4. Cliquer sur **Analyze page load**

**Objectif:** Score PWA ≥ 90/100

**Critères vérifiés:**
- ✅ Manifest valide
- ✅ Service Worker enregistré
- ✅ Répond en HTTPS
- ✅ Icônes 192x192 et 512x512 présentes
- ✅ Temps de chargement < 2s
- ✅ Viewport configuré
- ✅ Theme color défini

### Test sur Android

**Prérequis:**
- Chrome Android 120+
- Android 11+
- HTTPS activé

**Étapes:**

1. **Visiter l'app sur Chrome Android**
   ```
   https://votre-domaine.com
   ```

2. **Installer l'application**
   - Ouvrir le menu ⋮ (trois points)
   - Sélectionner **"Installer l'application"** ou **"Ajouter à l'écran d'accueil"**
   - Confirmer l'installation

3. **Vérifier l'installation**
   - L'icône apparaît sur l'écran d'accueil Android
   - Ouvrir l'app → elle s'ouvre en **plein écran** (sans barre d'adresse Chrome)
   - Vérifier dans `chrome://webapks` que le WebAPK est créé

4. **Tester les liens profonds**
   - Ouvrir un lien `https://votre-domaine.com/player` depuis une autre app
   - Le lien doit ouvrir directement l'app installée (pas le navigateur)

---

## 🔧 Fonctionnalités PWA

### Installation

- **Prompt automatique:** Apparaît après quelques visites (critères Chrome)
- **Prompt manuel:** Bouton "Installer l'application" dans l'interface
- **iOS:** Ajouter à l'écran d'accueil (pas de WebAPK, mais mode standalone)

### Cache & Offline

**Stratégies de cache:**

1. **Cache First** (assets statiques: JS, CSS, images)
   - Cherche d'abord dans le cache
   - Fallback réseau si absent
   - Rapide, idéal pour les assets immuables

2. **Network First** (contenu dynamique: HTML, API)
   - Essaie d'abord le réseau
   - Fallback cache si hors ligne
   - Garantit le contenu le plus récent

3. **Cache API** (requêtes `/api/*`)
   - Network First avec cache limité (20 entrées max)
   - Permet un fonctionnement partiel hors ligne

**Gestion du cache:**

```javascript
// Vider tous les caches (console DevTools)
caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));

// Ou via l'utilitaire PWA
import { clearAllCaches } from './utils/pwa.js';
await clearAllCaches();
```

### Mises à jour

**Flux de mise à jour:**

1. Nouvelle version déployée
2. Service Worker détecte la mise à jour
3. Notification affichée à l'utilisateur
4. Utilisateur clique sur "Mettre à jour"
5. Nouveau Service Worker activé
6. Page rechargée automatiquement

**Forcer une mise à jour:**

```javascript
// Dans la console DevTools
navigator.serviceWorker.getRegistration().then(reg => reg.update());
```

### Notifications Push (optionnel)

Le Service Worker inclut le support des notifications push. Pour activer:

1. Configurer un serveur push (Firebase Cloud Messaging, OneSignal, etc.)
2. Demander la permission à l'utilisateur
3. Envoyer des notifications depuis le serveur

---

## 📊 Monitoring

### Chrome DevTools

**Application > Service Workers:**
- État du Service Worker (activé, en attente, etc.)
- Forcer la mise à jour
- Désinscrire le Service Worker

**Application > Cache Storage:**
- Voir le contenu des caches
- Supprimer des entrées spécifiques

**Application > Manifest:**
- Vérifier le manifest.json
- Voir les icônes chargées
- Tester l'installation

### chrome://webapks (Android uniquement)

Liste tous les WebAPKs installés avec:
- Nom du package
- Version
- Icône
- URL de départ
- Date d'installation

---

## 🐛 Dépannage

### L'app n'est pas installable

**Vérifications:**
- ✅ HTTPS activé (ou localhost)
- ✅ `manifest.json` valide et accessible
- ✅ Service Worker enregistré avec succès
- ✅ Icônes 192x192 et 512x512 présentes
- ✅ `start_url` et `scope` cohérents
- ✅ `display: "standalone"` dans le manifest
- ✅ Pas d'erreurs dans la console

**Tester avec Lighthouse** pour identifier le problème exact.

### Le Service Worker ne se met pas à jour

```javascript
// Forcer la mise à jour
navigator.serviceWorker.getRegistration().then(reg => {
  reg.unregister().then(() => {
    window.location.reload();
  });
});
```

### Les liens profonds ne fonctionnent pas

**Vérifications:**
- ✅ `assetlinks.json` accessible à `https://domaine.com/.well-known/assetlinks.json`
- ✅ Domaine HTTPS correct dans `assetlinks.json`
- ✅ `scope` et `start_url` cohérents dans `manifest.json`
- ✅ App installée via Chrome (pas ajoutée manuellement)

**Tester:**
```bash
# Vérifier que assetlinks.json est accessible
curl https://votre-domaine.com/.well-known/assetlinks.json
```

### Cache obsolète

```javascript
// Vider tous les caches et recharger
import { clearAllCaches } from './utils/pwa.js';
await clearAllCaches();
window.location.reload();
```

---

## 📈 Optimisations

### Performance

1. **Lazy loading des routes**
   ```javascript
   const Player = lazy(() => import('./pages/Player.jsx'));
   ```

2. **Code splitting**
   - Vite le fait automatiquement
   - Vérifier les chunks dans le build

3. **Compression**
   - Activer gzip/brotli sur le serveur
   - Vite génère déjà des assets optimisés

### Taille du cache

Ajuster dans `public/sw.js`:

```javascript
const MAX_DYNAMIC_CACHE_SIZE = 50;  // Nombre d'entrées
const MAX_API_CACHE_SIZE = 20;
```

### Stratégies de cache personnalisées

Modifier `public/sw.js` pour adapter les stratégies selon vos besoins:

```javascript
// Exemple: Cache Only pour certains assets
if (url.pathname.startsWith('/static/')) {
  event.respondWith(caches.match(request));
  return;
}
```

---

## 🔐 Sécurité

### HTTPS obligatoire

- PWA nécessite HTTPS en production
- Utiliser Let's Encrypt (gratuit) ou Cloudflare

### Content Security Policy (CSP)

Ajouter dans `index.html`:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
               font-src 'self' https://fonts.gstatic.com;
               connect-src 'self' wss: ws:;">
```

### Permissions

Le manifest demande uniquement les permissions nécessaires:
- Aucune permission invasive
- Notifications (optionnel, demandé explicitement)

---

## 📚 Ressources

### Documentation officielle

- [PWA Documentation (MDN)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Chrome WebAPK](https://developers.google.com/web/fundamentals/integration/webapks)

### Outils

- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PWA Builder](https://www.pwabuilder.com/)
- [Workbox](https://developers.google.com/web/tools/workbox) (alternative au SW custom)

### Checklist PWA

- ✅ Manifest.json complet et valide
- ✅ Service Worker enregistré
- ✅ HTTPS activé
- ✅ Icônes 192x192 et 512x512
- ✅ Theme color défini
- ✅ Viewport configuré
- ✅ Page offline
- ✅ Temps de chargement < 2s
- ✅ Responsive design
- ✅ Pas d'erreurs console
- ✅ Score Lighthouse PWA ≥ 90

---

## 🎯 Prochaines étapes

### Améliorations possibles

1. **Background Sync**
   - Synchroniser les données en arrière-plan
   - Gérer les actions hors ligne

2. **Periodic Background Sync**
   - Mettre à jour le contenu périodiquement
   - Nécessite permission utilisateur

3. **Web Share API**
   - Partager du contenu vers d'autres apps
   - Déjà configuré dans le manifest

4. **Badging API**
   - Afficher un badge sur l'icône de l'app
   - Notifications non lues, etc.

5. **File Handling**
   - Ouvrir des fichiers .json directement dans l'app
   - Déjà configuré dans le manifest

---

## 📞 Support

Pour toute question ou problème:

1. Vérifier cette documentation
2. Consulter les logs dans la console DevTools
3. Tester avec Lighthouse
4. Vérifier `chrome://webapks` sur Android

**Logs importants:**
- `[PWA]` : Utilitaires PWA
- `[SW]` : Service Worker

---

## 📝 Changelog

### Version 1.0.0 (Initial)

- ✅ Manifest PWA complet
- ✅ Service Worker avec stratégies de cache
- ✅ Support WebAPK Android
- ✅ Prompt d'installation
- ✅ Notifications de mise à jour
- ✅ Page offline
- ✅ Intent filter (liens profonds)
- ✅ Icônes et screenshots
- ✅ Shortcuts et file handlers

---

**🎉 Votre application est maintenant une PWA complète, installable et fonctionnant hors ligne !**
