# 📱 PWA - Clainjo Horror

## 🎯 Vue d'ensemble

Clainjo Horror est maintenant une **Progressive Web App (PWA)** complète, installable comme une application native sur Android, iOS et Desktop.

---

## 📚 Documentation

### Guides principaux

1. **[PWA_QUICKSTART.md](./PWA_QUICKSTART.md)** ⚡
   - Guide de démarrage rapide (5 minutes)
   - Commandes essentielles
   - Checklist de déploiement

2. **[PWA_SETUP.md](./PWA_SETUP.md)** 📖
   - Documentation complète
   - Architecture détaillée
   - Tests et monitoring
   - Dépannage

3. **[PWA_IMPLEMENTATION_SUMMARY.md](./PWA_IMPLEMENTATION_SUMMARY.md)** ✅
   - Résumé de l'implémentation
   - Fichiers créés/modifiés
   - Fonctionnalités PWA
   - Prochaines étapes

4. **[WEBAPK_FLOW.md](./WEBAPK_FLOW.md)** 🤖
   - Flux Chrome → WebAPK
   - Intent filters (liens profonds)
   - Mises à jour du WebAPK
   - Dépannage Android

---

## 🚀 Démarrage rapide

### 1. Générer les icônes

```bash
# Icônes placeholder (SVG)
npm run generate-placeholder-icons

# Ou vraies icônes (PNG) depuis une image
npm run generate-icons logo.png
```

### 2. Configurer le domaine

Éditer `public/.well-known/assetlinks.json` :

```json
{
  "site": "https://VOTRE-DOMAINE.com"
}
```

### 3. Build et test

```bash
npm run build
npm start
```

### 4. Vérifier avec Lighthouse

```
Chrome DevTools > Lighthouse > PWA
Objectif : Score ≥ 90/100
```

---

## 📁 Structure des fichiers

```
public/
├── manifest.json              # Manifest PWA
├── sw.js                      # Service Worker
├── offline.html               # Page hors ligne
├── .well-known/
│   └── assetlinks.json       # Intent filter Android
└── icons/                     # Icônes PWA
    ├── icon-72x72.svg
    ├── icon-96x96.svg
    ├── icon-128x128.svg
    ├── icon-144x144.svg
    ├── icon-152x152.svg
    ├── icon-192x192.svg
    ├── icon-384x384.svg
    └── icon-512x512.svg

src/
├── utils/
│   └── pwa.js                 # Utilitaires PWA
└── components/
    ├── InstallPrompt.jsx      # Prompt d'installation
    └── UpdateNotification.jsx # Notification de mise à jour

scripts/
├── generate-icons.js          # Génération d'icônes PNG
└── generate-placeholder-icons.js  # Génération d'icônes SVG
```

---

## ✨ Fonctionnalités

### Installation
- ✅ Installable sur Android (WebAPK)
- ✅ Installable sur iOS (standalone)
- ✅ Installable sur Desktop
- ✅ Prompt personnalisé

### Offline
- ✅ Fonctionne hors ligne
- ✅ Cache intelligent
- ✅ Page offline

### Mises à jour
- ✅ Détection automatique
- ✅ Notification utilisateur
- ✅ Activation immédiate

### Expérience native
- ✅ Plein écran
- ✅ Icône sur l'écran d'accueil
- ✅ Splash screen
- ✅ Shortcuts
- ✅ Liens profonds (Android)

---

## 🧪 Tests

### Local

```bash
# Build + preview
npm run pwa:test

# Vérifier dans Chrome DevTools
# Application > Manifest
# Application > Service Workers
# Lighthouse > PWA
```

### Android

1. Déployer sur un serveur HTTPS
2. Visiter sur Chrome Android
3. Menu ⋮ > "Installer l'application"
4. Vérifier dans `chrome://webapks`

### iOS

1. Visiter sur Safari iOS
2. Partager > "Sur l'écran d'accueil"
3. Ouvrir l'app (mode standalone)

---

## 📊 Checklist de déploiement

### Avant

- [ ] Icônes générées
- [ ] Domaine configuré dans assetlinks.json
- [ ] Build de production créé
- [ ] HTTPS activé
- [ ] Test Lighthouse passé

### Après

- [ ] Manifest accessible
- [ ] Service Worker accessible
- [ ] Assetlinks accessible
- [ ] Icônes accessibles
- [ ] Test d'installation réussi

---

## 🔧 Commandes

```bash
# Développement
npm run dev:all

# Build et test PWA
npm run pwa:test

# Générer icônes placeholder
npm run generate-placeholder-icons

# Générer vraies icônes
npm run generate-icons logo.png

# Production
npm run build
npm start
```

---

## 🐛 Dépannage

### L'app n'est pas installable

1. Vérifier le manifest : `curl https://domaine.com/manifest.json`
2. Vérifier le Service Worker : DevTools > Application
3. Vérifier HTTPS : `curl -I https://domaine.com`
4. Vérifier les icônes : `curl -I https://domaine.com/icons/icon-192x192.svg`
5. Tester avec Lighthouse

### Forcer la mise à jour du Service Worker

```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  reg.unregister().then(() => window.location.reload());
});
```

### Vider le cache

```javascript
caches.keys().then(keys => 
  Promise.all(keys.map(k => caches.delete(k)))
).then(() => window.location.reload());
```

---

## 📈 Métriques

### Performance
- **FCP** : < 1.8s
- **LCP** : < 2.5s
- **TTI** : < 3.8s
- **TBT** : < 200ms
- **CLS** : < 0.1

### PWA
- **Score Lighthouse** : ≥ 90/100
- **Taux d'installation** : À suivre
- **Taux de rétention** : À suivre

---

## 🎯 Prochaines étapes

### Immédiat
1. Remplacer les icônes placeholder
2. Ajouter des screenshots
3. Tester sur Android réel

### Court terme
1. Monitorer les performances
2. Optimiser le cache
3. Ajouter des analytics

### Long terme
1. Background Sync
2. Notifications Push
3. Periodic Background Sync
4. Badging API

---

## 📚 Ressources

- **Documentation PWA** : [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- **Service Worker** : [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- **Web App Manifest** : [MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- **Chrome WebAPK** : [Google](https://developers.google.com/web/fundamentals/integration/webapks)
- **Lighthouse** : [Google](https://developers.google.com/web/tools/lighthouse)

---

## 📞 Support

Pour toute question :

1. Consulter la documentation appropriée
2. Vérifier les logs (`[PWA]` et `[SW]`)
3. Tester avec Lighthouse
4. Vérifier `chrome://webapks` (Android)

---

## 🎉 Félicitations !

Votre application est maintenant une **PWA complète** :

✅ Installable comme une app native  
✅ Fonctionne hors ligne  
✅ Mises à jour automatiques  
✅ Expérience native en plein écran  
✅ Liens profonds sur Android  
✅ Performance optimale  

**Score Lighthouse PWA attendu : 90-100/100**

**Bon développement ! 🚀**
