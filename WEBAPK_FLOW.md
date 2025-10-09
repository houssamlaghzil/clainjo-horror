# 🤖 Flux Chrome → WebAPK - Clainjo Horror

## Vue d'ensemble du processus

Ce document explique comment Chrome Android transforme votre PWA en **WebAPK** (Android Package Kit), permettant une installation native complète.

---

## 📱 Qu'est-ce qu'un WebAPK ?

Un **WebAPK** est un package Android (`.apk`) généré automatiquement par Chrome qui :

- ✅ S'installe comme une vraie app Android
- ✅ Apparaît dans le lanceur d'applications
- ✅ Apparaît dans les paramètres Android (Apps installées)
- ✅ Peut recevoir des notifications push
- ✅ Peut gérer des intent filters (liens profonds)
- ✅ S'ouvre en plein écran (sans UI Chrome)
- ✅ A sa propre icône et son propre nom

**Différence avec "Ajouter à l'écran d'accueil" :**
- Raccourci simple = Ouvre Chrome avec l'URL
- WebAPK = Vraie app Android indépendante

---

## 🔄 Flux complet d'installation

### 1. Critères d'éligibilité (Chrome vérifie)

Chrome vérifie automatiquement si votre PWA est éligible :

```
✅ Manifest.json valide et accessible
✅ Service Worker enregistré et actif
✅ HTTPS activé (ou localhost en dev)
✅ Icônes 192x192 et 512x512 présentes
✅ start_url et scope définis
✅ display: "standalone" ou "fullscreen"
✅ name ou short_name défini
✅ L'utilisateur a visité le site au moins 2 fois
✅ Au moins 5 minutes entre les visites
```

**Note :** Les critères exacts peuvent varier selon la version de Chrome.

### 2. Prompt d'installation

Quand les critères sont remplis, Chrome propose l'installation :

**Option A : Prompt automatique**
- Chrome affiche une bannière en bas de l'écran
- "Installer [Nom de l'app]"
- L'utilisateur peut accepter ou refuser

**Option B : Menu Chrome**
- Menu ⋮ > "Installer l'application"
- Disponible même si le prompt automatique a été refusé

**Option C : Prompt personnalisé (notre implémentation)**
- Composant `InstallPrompt.jsx`
- Bouton "Installer l'application" dans l'interface
- Plus de contrôle sur l'UX

### 3. Génération du WebAPK

Quand l'utilisateur accepte :

```
1. Chrome envoie les données du manifest à Google
   ↓
2. Serveurs Google génèrent un WebAPK signé
   ↓
3. Chrome télécharge le WebAPK (~1-2 MB)
   ↓
4. Android installe le WebAPK
   ↓
5. L'icône apparaît sur l'écran d'accueil
```

**Durée :** 5-30 secondes selon la connexion

**Signature :** Le WebAPK est signé par Google, pas par vous

### 4. Première ouverture

```
1. L'utilisateur clique sur l'icône
   ↓
2. Android lance le WebAPK
   ↓
3. Le WebAPK ouvre Chrome en mode "headless"
   ↓
4. Chrome charge votre PWA (start_url)
   ↓
5. Service Worker intercepte les requêtes
   ↓
6. L'app s'affiche en plein écran
```

**Splash screen :** Affiché pendant le chargement (basé sur manifest)

---

## 🔍 Vérification du WebAPK

### Sur l'appareil Android

1. **Paramètres Android**
   ```
   Paramètres > Applications > Voir toutes les applications
   → Chercher "Clainjo Horror"
   ```
   
   Vous devriez voir :
   - Nom : Clainjo Horror
   - Package : `org.chromium.webapk.HASH`
   - Icône : Votre icône PWA

2. **Chrome WebAPKs**
   ```
   Ouvrir Chrome
   → Aller sur chrome://webapks
   ```
   
   Vous verrez :
   - Liste de tous les WebAPKs installés
   - Nom du package
   - Version
   - URL de départ
   - Date d'installation
   - Icône

3. **Lanceur d'applications**
   - L'icône apparaît avec les autres apps
   - Appui long → Shortcuts (si définis dans manifest)

### Logs Chrome

```
Ouvrir Chrome DevTools (USB debugging)
→ Filtrer par "webapk"
```

Logs typiques :
```
[WebAPK] Install initiated
[WebAPK] Manifest fetched
[WebAPK] Icons downloaded
[WebAPK] Package generated
[WebAPK] Installation complete
```

---

## 🔗 Intent Filters (Liens profonds)

### Configuration

**1. Assetlinks.json**

Fichier : `public/.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "web",
    "site": "https://votre-domaine.com"
  }
}]
```

**Accessible à :**
```
https://votre-domaine.com/.well-known/assetlinks.json
```

**2. Manifest.json**

```json
{
  "scope": "/",
  "start_url": "/"
}
```

### Fonctionnement

```
1. Utilisateur clique sur un lien (ex: SMS, email, autre app)
   https://votre-domaine.com/player
   ↓
2. Android vérifie si une app peut gérer ce lien
   ↓
3. Android télécharge assetlinks.json
   ↓
4. Android vérifie que le domaine autorise l'app
   ↓
5. Si OK : Ouvre directement le WebAPK
   Si KO : Ouvre Chrome (navigateur)
```

### Test des liens profonds

**Méthode 1 : ADB**

```bash
# Installer ADB (Android Debug Bridge)
# Connecter l'appareil en USB

# Tester un lien
adb shell am start -a android.intent.action.VIEW \
  -d "https://votre-domaine.com/player"
```

**Méthode 2 : Depuis une autre app**

1. Envoyer un SMS avec le lien
2. Cliquer sur le lien
3. Vérifier que le WebAPK s'ouvre (pas Chrome)

**Méthode 3 : Chrome**

```
chrome://flags/#enable-webapk-unique-id
→ Activer
→ Relancer Chrome
→ Tester les liens
```

---

## 🔄 Mises à jour du WebAPK

### Quand Chrome met à jour le WebAPK

Chrome vérifie les mises à jour :
- **Tous les 3 jours** (si l'app est utilisée)
- **À chaque ouverture** (si > 3 jours depuis la dernière vérification)

### Déclencheurs de mise à jour

Chrome régénère le WebAPK si :
- ✅ Changement du `name` ou `short_name`
- ✅ Changement des icônes (192x192 ou 512x512)
- ✅ Changement du `start_url`
- ✅ Changement du `scope`
- ✅ Changement du `theme_color`
- ✅ Changement du `background_color`
- ✅ Changement de `display`
- ✅ Changement de `orientation`

**Note :** Les changements de contenu (HTML, JS, CSS) ne déclenchent PAS de mise à jour du WebAPK. Seul le Service Worker gère ces mises à jour.

### Processus de mise à jour

```
1. Chrome détecte un changement dans manifest.json
   ↓
2. Chrome demande un nouveau WebAPK à Google
   ↓
3. Google génère le nouveau WebAPK
   ↓
4. Chrome télécharge et installe la mise à jour
   ↓
5. À la prochaine ouverture, la nouvelle version est active
```

**Durée :** Peut prendre plusieurs heures

### Forcer une mise à jour (debug)

```
1. Désinstaller l'app
2. Vider le cache Chrome
3. Réinstaller l'app
```

Ou via ADB :
```bash
adb shell pm uninstall org.chromium.webapk.HASH
```

---

## 🐛 Dépannage WebAPK

### Le WebAPK ne se génère pas

**Vérifications :**

1. **Manifest valide**
   ```bash
   curl https://votre-domaine.com/manifest.json
   ```
   - Doit retourner un JSON valide
   - Vérifier `name`, `icons`, `start_url`, `display`

2. **Service Worker actif**
   ```
   Chrome DevTools > Application > Service Workers
   → Doit être "activated and running"
   ```

3. **HTTPS actif**
   ```bash
   curl -I https://votre-domaine.com
   → Doit retourner 200 OK
   ```

4. **Icônes accessibles**
   ```bash
   curl -I https://votre-domaine.com/icons/icon-192x192.svg
   curl -I https://votre-domaine.com/icons/icon-512x512.svg
   → Doivent retourner 200 OK
   ```

5. **Critères d'engagement**
   - Visiter le site au moins 2 fois
   - Attendre 5 minutes entre les visites
   - Ou forcer via `chrome://flags/#bypass-app-banner-engagement-checks`

### Les liens profonds ne fonctionnent pas

**Vérifications :**

1. **Assetlinks.json accessible**
   ```bash
   curl https://votre-domaine.com/.well-known/assetlinks.json
   ```
   - Doit retourner 200 OK
   - Doit contenir le bon domaine

2. **Domaine HTTPS**
   - Les intent filters ne fonctionnent qu'en HTTPS

3. **Scope cohérent**
   ```json
   {
     "scope": "/",
     "start_url": "/"
   }
   ```

4. **Vérifier avec Digital Asset Links**
   ```
   https://digitalassetlinks.googleapis.com/v1/statements:list?
   source.web.site=https://votre-domaine.com&
   relation=delegate_permission/common.handle_all_urls
   ```

### Le WebAPK ne se met pas à jour

**Solutions :**

1. **Attendre 3 jours**
   - Chrome vérifie les mises à jour tous les 3 jours

2. **Forcer la vérification**
   ```
   1. Ouvrir l'app
   2. Fermer l'app
   3. Attendre 1 minute
   4. Rouvrir l'app
   ```

3. **Réinstaller**
   ```
   1. Désinstaller l'app
   2. Vider le cache Chrome
   3. Réinstaller l'app
   ```

---

## 📊 Monitoring WebAPK

### Métriques importantes

1. **Taux d'installation**
   ```javascript
   window.addEventListener('appinstalled', () => {
     // Envoyer analytics
     gtag('event', 'pwa_installed');
   });
   ```

2. **Source d'installation**
   ```javascript
   window.addEventListener('beforeinstallprompt', (e) => {
     // Prompt automatique ou manuel
     gtag('event', 'pwa_prompt_shown');
   });
   ```

3. **Utilisation du WebAPK**
   ```javascript
   if (window.matchMedia('(display-mode: standalone)').matches) {
     // L'app est ouverte via le WebAPK
     gtag('event', 'pwa_opened_standalone');
   }
   ```

### Logs utiles

**Chrome DevTools (USB debugging)**

```javascript
// Vérifier si l'app est installée
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('App installée et ouverte via WebAPK');
}

// Vérifier les capacités
console.log('Service Worker:', 'serviceWorker' in navigator);
console.log('Notifications:', 'Notification' in window);
console.log('Push:', 'PushManager' in window);
```

**Chrome flags utiles**

```
chrome://flags/#enable-webapk-unique-id
chrome://flags/#bypass-app-banner-engagement-checks
chrome://flags/#enable-desktop-pwas
```

---

## 🎯 Checklist finale

### Avant déploiement

- [ ] Manifest.json valide et accessible
- [ ] Service Worker enregistré
- [ ] HTTPS activé
- [ ] Icônes 192x192 et 512x512 présentes
- [ ] Assetlinks.json configuré et accessible
- [ ] start_url et scope cohérents
- [ ] display: "standalone"
- [ ] name et short_name définis
- [ ] theme_color et background_color définis

### Après déploiement

- [ ] Test d'installation sur Android réel
- [ ] Vérification dans chrome://webapks
- [ ] Test des liens profonds
- [ ] Test des shortcuts (appui long)
- [ ] Test du splash screen
- [ ] Test hors ligne
- [ ] Score Lighthouse PWA ≥ 90

### Monitoring

- [ ] Analytics d'installation configurés
- [ ] Logs d'erreurs configurés
- [ ] Métriques de performance suivies
- [ ] Taux de rétention suivi

---

## 🎉 Résultat final

Quand tout est configuré correctement :

```
1. L'utilisateur visite https://votre-domaine.com
2. Chrome propose l'installation
3. L'utilisateur accepte
4. Chrome génère un WebAPK
5. L'app s'installe comme une vraie app Android
6. L'icône apparaît sur l'écran d'accueil
7. L'app s'ouvre en plein écran
8. Les liens du domaine ouvrent directement l'app
9. L'app fonctionne hors ligne
10. Les mises à jour sont automatiques
```

**Expérience utilisateur = App native Android ! 🚀**

---

## 📚 Ressources

- [WebAPK Documentation](https://developers.google.com/web/fundamentals/integration/webapks)
- [Digital Asset Links](https://developers.google.com/digital-asset-links)
- [Chrome WebAPK Update Process](https://web.dev/webapk-update/)
- [Intent Filters](https://developer.android.com/training/app-links)

---

**Votre PWA est maintenant une vraie app Android ! 🎉**
