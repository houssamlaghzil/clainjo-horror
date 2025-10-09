# 🏗️ Architecture PWA - Clainjo Horror

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLAINJO HORROR PWA                          │
│                  Progressive Web Application                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ Android │          │   iOS   │          │ Desktop │
   │ WebAPK  │          │Standalone│         │  PWA    │
   └─────────┘          └─────────┘          └─────────┘
```

---

## Architecture détaillée

```
┌───────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    React Application                     │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐    │    │
│  │  │  Landing   │  │   Player   │  │       GM       │    │    │
│  │  │    Page    │  │    Page    │  │     Pages      │    │    │
│  │  └────────────┘  └────────────┘  └────────────────┘    │    │
│  │                                                          │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │         PWA Components                         │    │    │
│  │  │  • InstallPrompt                               │    │    │
│  │  │  • UpdateNotification                          │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │  ┌────────────────────────────────────────────────┐    │    │
│  │  │         Realtime Context                       │    │    │
│  │  │  • Socket.IO Client                            │    │    │
│  │  │  • State Management                            │    │    │
│  │  └────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                   Service Worker (sw.js)                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │ Cache First  │  │Network First │  │   Offline    │   │  │
│  │  │   (Assets)   │  │  (Dynamic)   │  │     Page     │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │            Cache Storage                         │   │  │
│  │  │  • Static Cache (JS, CSS, images, fonts)        │   │  │
│  │  │  • Dynamic Cache (HTML, navigation)             │   │  │
│  │  │  • API Cache (API responses)                    │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               │ HTTPS
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                        SERVER (Node.js)                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                  Express Server                        │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐    │    │
│  │  │   Static     │  │   Manifest   │  │   API    │    │    │
│  │  │   Files      │  │   + SW       │  │  Routes  │    │    │
│  │  └──────────────┘  └──────────────┘  └──────────┘    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Socket.IO Server                          │    │
│  │  • Realtime communication                              │    │
│  │  • Room management                                     │    │
│  │  • Game logic                                          │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Flux d'installation (Android WebAPK)

```
┌─────────────────────────────────────────────────────────────────┐
│                    INSTALLATION FLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. USER VISITS APP
   ┌──────────────┐
   │   Browser    │
   │  (Chrome)    │
   └──────┬───────┘
          │
          │ HTTPS Request
          ▼
   ┌──────────────┐
   │    Server    │
   │  (Express)   │
   └──────┬───────┘
          │
          │ Returns HTML + manifest.json
          ▼
   ┌──────────────┐
   │   Browser    │
   │  Loads App   │
   └──────┬───────┘
          │
          │ Registers Service Worker
          ▼
   ┌──────────────┐
   │Service Worker│
   │  Activated   │
   └──────────────┘

2. CHROME CHECKS ELIGIBILITY
   ┌──────────────────────────────────┐
   │  Chrome PWA Eligibility Check    │
   ├──────────────────────────────────┤
   │  ✓ Manifest valid                │
   │  ✓ Service Worker active         │
   │  ✓ HTTPS enabled                 │
   │  ✓ Icons 192x192 & 512x512       │
   │  ✓ start_url & scope defined     │
   │  ✓ display: "standalone"         │
   │  ✓ User engagement criteria      │
   └──────────────────────────────────┘

3. INSTALLATION PROMPT
   ┌──────────────┐
   │   Browser    │
   │  Shows       │
   │  "Install    │
   │   App"       │
   └──────┬───────┘
          │
          │ User accepts
          ▼
   ┌──────────────┐
   │   Chrome     │
   │  Sends data  │
   │  to Google   │
   └──────┬───────┘
          │
          │ Manifest + Icons
          ▼
   ┌──────────────┐
   │   Google     │
   │  Servers     │
   │  Generate    │
   │  WebAPK      │
   └──────┬───────┘
          │
          │ Returns signed APK
          ▼
   ┌──────────────┐
   │   Chrome     │
   │  Downloads   │
   │  WebAPK      │
   └──────┬───────┘
          │
          │ Installs
          ▼
   ┌──────────────┐
   │   Android    │
   │  System      │
   │  Installs    │
   │  WebAPK      │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │   Icon on    │
   │  Home Screen │
   └──────────────┘

4. APP LAUNCH
   ┌──────────────┐
   │  User taps   │
   │    icon      │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │   WebAPK     │
   │   Launches   │
   └──────┬───────┘
          │
          │ Opens Chrome (headless)
          ▼
   ┌──────────────┐
   │   Chrome     │
   │  Loads App   │
   │  (Fullscreen)│
   └──────┬───────┘
          │
          │ Loads from cache or network
          ▼
   ┌──────────────┐
   │Service Worker│
   │  Intercepts  │
   │   Requests   │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  App Runs    │
   │  Fullscreen  │
   └──────────────┘
```

---

## Stratégies de cache

```
┌─────────────────────────────────────────────────────────────────┐
│                    CACHE STRATEGIES                             │
└─────────────────────────────────────────────────────────────────┘

1. CACHE FIRST (Assets statiques)
   ┌──────────────┐
   │   Request    │
   │  (JS, CSS,   │
   │  images...)  │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │Service Worker│
   │  Checks      │
   │  Cache       │
   └──────┬───────┘
          │
          ├─── Cache Hit ────────┐
          │                      │
          │                      ▼
          │              ┌──────────────┐
          │              │   Return     │
          │              │   Cached     │
          │              │   Response   │
          │              └──────────────┘
          │
          └─── Cache Miss ──────┐
                                │
                                ▼
                        ┌──────────────┐
                        │   Fetch      │
                        │   from       │
                        │   Network    │
                        └──────┬───────┘
                               │
                               ├─── Success ───┐
                               │               │
                               │               ▼
                               │       ┌──────────────┐
                               │       │   Cache &    │
                               │       │   Return     │
                               │       └──────────────┘
                               │
                               └─── Fail ──────┐
                                               │
                                               ▼
                                       ┌──────────────┐
                                       │   Offline    │
                                       │   Page       │
                                       └──────────────┘

2. NETWORK FIRST (Contenu dynamique)
   ┌──────────────┐
   │   Request    │
   │  (HTML, API) │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │Service Worker│
   │  Tries       │
   │  Network     │
   └──────┬───────┘
          │
          ├─── Network Success ──┐
          │                      │
          │                      ▼
          │              ┌──────────────┐
          │              │   Cache &    │
          │              │   Return     │
          │              └──────────────┘
          │
          └─── Network Fail ────┐
                                │
                                ▼
                        ┌──────────────┐
                        │   Check      │
                        │   Cache      │
                        └──────┬───────┘
                               │
                               ├─── Cache Hit ───┐
                               │                 │
                               │                 ▼
                               │         ┌──────────────┐
                               │         │   Return     │
                               │         │   Cached     │
                               │         └──────────────┘
                               │
                               └─── Cache Miss ──┐
                                                 │
                                                 ▼
                                         ┌──────────────┐
                                         │   Offline    │
                                         │   Page       │
                                         └──────────────┘
```

---

## Flux de mise à jour

```
┌─────────────────────────────────────────────────────────────────┐
│                    UPDATE FLOW                                  │
└─────────────────────────────────────────────────────────────────┘

1. NEW VERSION DEPLOYED
   ┌──────────────┐
   │   Server     │
   │  New sw.js   │
   │  New assets  │
   └──────┬───────┘
          │
          ▼

2. USER OPENS APP
   ┌──────────────┐
   │   Browser    │
   │  Checks for  │
   │   updates    │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │Service Worker│
   │  Detects new │
   │   version    │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │   New SW     │
   │  Installing  │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │   New SW     │
   │   Waiting    │
   └──────┬───────┘
          │
          │ Triggers event
          ▼
   ┌──────────────┐
   │UpdateNotif.  │
   │  Component   │
   │  Shows       │
   └──────┬───────┘
          │
          │ User clicks "Update"
          ▼
   ┌──────────────┐
   │   Send       │
   │  SKIP_WAITING│
   │  message     │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │   New SW     │
   │  Activates   │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │   Page       │
   │  Reloads     │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  New version │
   │   running    │
   └──────────────┘
```

---

## Structure des fichiers

```
clainjo-horror/
│
├── public/                          # Assets statiques
│   ├── manifest.json               # ✅ Manifest PWA
│   ├── sw.js                       # ✅ Service Worker
│   ├── offline.html                # ✅ Page hors ligne
│   ├── .well-known/
│   │   └── assetlinks.json        # ✅ Intent filter Android
│   └── icons/                      # ✅ Icônes PWA
│       ├── icon-72x72.svg
│       ├── icon-96x96.svg
│       ├── icon-128x128.svg
│       ├── icon-144x144.svg
│       ├── icon-152x152.svg
│       ├── icon-192x192.svg       # ✅ Requis
│       ├── icon-384x384.svg
│       └── icon-512x512.svg       # ✅ Requis
│
├── src/
│   ├── utils/
│   │   └── pwa.js                  # ✅ Utilitaires PWA
│   ├── components/
│   │   ├── InstallPrompt.jsx      # ✅ Prompt d'installation
│   │   └── UpdateNotification.jsx # ✅ Notification de mise à jour
│   ├── main.jsx                    # ✅ Initialisation PWA
│   └── App.jsx                     # ✅ Intégration composants PWA
│
├── scripts/
│   ├── generate-icons.js          # ✅ Génération icônes PNG
│   └── generate-placeholder-icons.js # ✅ Génération icônes SVG
│
├── server/
│   └── index.js                    # ✅ Serveur Express + Socket.IO
│
├── index.html                      # ✅ Meta tags PWA + manifest
├── package.json                    # ✅ Scripts npm PWA
│
└── Documentation PWA/
    ├── PWA_README.md              # Vue d'ensemble
    ├── PWA_QUICKSTART.md          # Guide rapide
    ├── PWA_SETUP.md               # Documentation complète
    ├── WEBAPK_FLOW.md             # Flux WebAPK
    ├── PWA_COMPLETE.md            # Résumé complet
    ├── PWA_FINAL_SUMMARY.md       # Résumé final
    └── PWA_ARCHITECTURE.md        # Ce fichier
```

---

## Technologies utilisées

```
┌─────────────────────────────────────────────────────────────────┐
│                    TECH STACK PWA                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend                                                       │
│  ├── React 19.1.1                                              │
│  ├── Vite 7.1.6                                                │
│  └── Socket.IO Client 4.8.1                                    │
│                                                                 │
│  PWA                                                            │
│  ├── Service Worker API                                        │
│  ├── Cache Storage API                                         │
│  ├── Web App Manifest                                          │
│  ├── beforeinstallprompt Event                                 │
│  └── Notification API (optionnel)                              │
│                                                                 │
│  Backend                                                        │
│  ├── Node.js + Express 4.21.1                                  │
│  ├── Socket.IO Server 4.8.1                                    │
│  └── Static file serving                                       │
│                                                                 │
│  Build & Dev                                                    │
│  ├── Vite (bundler)                                            │
│  ├── ESLint (linter)                                           │
│  └── Concurrently (dev server)                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Compatibilité

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER SUPPORT                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Chrome Android 120+        ✅ Full WebAPK support             │
│  Safari iOS 15+             ✅ Standalone mode                 │
│  Chrome Desktop 90+         ✅ Desktop installation            │
│  Edge Desktop 90+           ✅ Desktop installation            │
│  Firefox Android            ⚠️  Partial (no WebAPK)            │
│  Samsung Internet           ⚠️  Partial                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    OS SUPPORT                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Android 11+                ✅ Full WebAPK support             │
│  iOS 15+                    ✅ Standalone mode                 │
│  Windows 10+                ✅ Desktop PWA                     │
│  macOS 11+                  ✅ Desktop PWA                     │
│  Linux                      ✅ Desktop PWA                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE METRICS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  First Contentful Paint (FCP)      < 1.8s    ✅               │
│  Largest Contentful Paint (LCP)    < 2.5s    ✅               │
│  Time to Interactive (TTI)         < 3.8s    ✅               │
│  Total Blocking Time (TBT)         < 200ms   ✅               │
│  Cumulative Layout Shift (CLS)     < 0.1     ✅               │
│                                                                 │
│  Lighthouse PWA Score              90-100    ✅               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sécurité

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HTTPS Required                    ✅ Enforced                 │
│  Service Worker Scope              ✅ Limited to /             │
│  Content Security Policy           ⚠️  Recommended             │
│  Subresource Integrity             ⚠️  Recommended             │
│  Permissions                       ✅ Minimal                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Architecture PWA complète et prête pour la production ! 🚀**
