# 🚀 PWA Quick Start - Clainjo Horror

## Installation rapide (5 minutes)

### 1. Générer les icônes placeholder

```bash
npm run generate-placeholder-icons
```

Cela crée des icônes SVG temporaires dans `public/icons/`.

### 2. Configurer votre domaine

Éditez `public/.well-known/assetlinks.json`:

```json
{
  "site": "https://VOTRE-DOMAINE.com"
}
```

### 3. Build et test

```bash
# Build de production
npm run build

# Démarrer le serveur
npm start
```

### 4. Tester localement

Ouvrez Chrome et allez sur `http://localhost:4000`

**Vérifications:**
- Ouvrir DevTools (F12)
- Onglet **Application** > **Manifest** : doit afficher le manifest
- Onglet **Application** > **Service Workers** : doit être enregistré
- Onglet **Lighthouse** > **PWA** : lancer l'audit

---

## Test sur Android

### Prérequis
- Serveur accessible en HTTPS
- Chrome Android 120+

### Étapes

1. **Déployer sur un serveur HTTPS**
   ```bash
   # Exemple avec votre serveur
   npm run build
   # Copier dist/ sur votre serveur
   ```

2. **Visiter sur Chrome Android**
   ```
   https://votre-domaine.com
   ```

3. **Installer l'app**
   - Menu ⋮ > "Installer l'application"
   - L'icône apparaît sur l'écran d'accueil

4. **Ouvrir l'app**
   - Cliquer sur l'icône
   - L'app s'ouvre en **plein écran** (sans barre Chrome)

---

## Checklist de déploiement

### Avant de déployer

- [ ] Icônes générées (ou placeholders)
- [ ] Domaine configuré dans `assetlinks.json`
- [ ] Build de production créé (`npm run build`)
- [ ] HTTPS activé sur le serveur
- [ ] Test Lighthouse passé (score PWA ≥ 90)

### Après déploiement

- [ ] Manifest accessible : `https://domaine.com/manifest.json`
- [ ] Service Worker accessible : `https://domaine.com/sw.js`
- [ ] Assetlinks accessible : `https://domaine.com/.well-known/assetlinks.json`
- [ ] Icônes accessibles : `https://domaine.com/icons/icon-192x192.png`
- [ ] Test d'installation sur Android réussi

---

## Commandes utiles

```bash
# Générer des icônes placeholder (SVG)
npm run generate-placeholder-icons

# Générer des vraies icônes (PNG) depuis une image
npm run generate-icons path/to/logo.png

# Build + preview local
npm run pwa:test

# Développement
npm run dev:all

# Production
npm run build
npm start
```

---

## Dépannage rapide

### L'app n'est pas installable

```bash
# Vérifier le manifest
curl https://votre-domaine.com/manifest.json

# Vérifier le service worker
curl https://votre-domaine.com/sw.js

# Vérifier les icônes
curl -I https://votre-domaine.com/icons/icon-192x192.png
```

### Forcer la mise à jour du Service Worker

Dans la console Chrome:

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

## Prochaines étapes

1. **Remplacer les icônes placeholder**
   - Créer une icône 1024x1024px
   - Lancer `npm run generate-icons logo.png`

2. **Ajouter des screenshots**
   - Créer `public/screenshots/screenshot-1.png` (540x720)
   - Créer `public/screenshots/screenshot-2.png` (1280x720)

3. **Optimiser les performances**
   - Lazy loading des routes
   - Compression gzip/brotli
   - CDN pour les assets

4. **Tester sur différents appareils**
   - Android (Chrome)
   - iOS (Safari - mode standalone)
   - Desktop (Chrome, Edge)

---

## Ressources

- **Documentation complète:** `PWA_SETUP.md`
- **Lighthouse:** Chrome DevTools > Lighthouse > PWA
- **WebAPKs Android:** `chrome://webapks`
- **Service Workers:** Chrome DevTools > Application > Service Workers

---

**🎉 Votre PWA est prête ! Bon développement !**
