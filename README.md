<div align="center">
  <img alt="Clainjo Horror" src="https://img.shields.io/badge/Clainjo%20Horror-%F0%9F%92%80%20Live%20Roleplay-0b0b0c?style=for-the-badge&logo=ghost&logoColor=white" />
  <br/>
  <img alt="React" src="https://img.shields.io/badge/React-19-0ea5e9?style=flat-square&logo=react&logoColor=white" />
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-Realtime-0b0b0c?style=flat-square&logo=socket.io&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-3b82f6?style=flat-square&logo=vite&logoColor=white" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Express-0a7f3f?style=flat-square&logo=node.js&logoColor=white" />
  <!-- Optionnel: pipeline CI, licence, release
  <img alt="CI" src="https://img.shields.io/github/actions/workflow/status/<you>/clainjo-horror/ci.yml?label=CI&style=flat-square" />
  <img alt="Licence" src="https://img.shields.io/badge/Licence-MIT-334155?style=flat-square" />
  -->
</div>

# Clainjo Horror

> Une table qui respire, un couloir qui chuchote. Jets autoritatifs, screamers synchronisés, duel de sorcellerie arbitré à la milliseconde.

- **Frontend** : React + Vite (mobile-first pour Joueurs)
- **Realtime** : Socket.IO (client/serveur)
- **Backend** : Express + Socket.IO
- **IA** : OpenAI Responses API pour arbitrer le Wizard Battle
- **UX** : sobre, lisible, “brutal” quand il faut

---

## Sommaire

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Fonctionnalités détaillées](#fonctionnalités-détaillées)
- [Démarrage rapide](#démarrage-rapide)
- [Docker (prod-like)](#docker-prod-like)
- [Configuration](#configuration)
- [Typographie](#typographie)
- [Architecture](#architecture)
- [Captures](#captures)
- [Roadmap](#roadmap)
- [Licence](#licence)

---

## Aperçu

**Clainjo Horror** mêle chat instantané, jets de dés équitables (côté serveur), screamers audio/visuels/haptiques et un **Wizard Battle** où l’IA classe les sorts des joueurs selon cohérence, originalité, vitesse et interactions élémentaires.  
MJ desktop confortable, Joueurs mobile-first.

---

## Fonctionnalités

- **Chat spectral** : diffusion instantanée par room, sobriété, lisibilité.
- **Jets autoritatifs** : serveur = source de vérité, modificateurs appliqués côté serveur.
- **Indices (bonus/malus + contenu à usage unique)** : 
  - Bonus/Malus consommés sur le prochain jet.
  - Indices “contenu” (texte/image/PDF) consultables une seule fois via une modale.
- **Screamers** : overlay plein écran, son + image + vibration (courbe haptique).
- **Haptique ciblée** : démarrage/arrêt d’un motif “battement” sur appareils compatibles.
- **Wizard Battle** : saisie libre, arbitrage IA → JSON strict, révision MJ → publication.
- **Présence & fiches** : PV, inventaire, monnaie, caractéristiques, compétences.
- **Layouts** : Joueurs = 1 colonne nette ; MJ = grille 2 colonnes ≥ 1024px.

## Fonctionnalités détaillées

### Chat
- __Ce que c’est__
  Messages temps-réel par salle (`roomId`). Support du broadcast (tous) et des messages ciblés.
- __Comment ça marche__
  Événement `chat:message` via Socket.IO. Stockage léger côté client.

### Jets de dés (serveur autoritaire)
- __Ce que c’est__
  Les jets sont générés sur le serveur et diffusés à tous, avec historique limité.
- __Comment ça marche__
  Événement `dice:roll` → calcul serveur → `dice:result`. Si un modificateur est en file (bonus/malus), il est consommé sur ce jet.

### Indices (bonus/malus + contenu à usage unique)
- __Ce que c’est__
  Deux familles d’indices :
  1) Modificateurs de dés (bonus/malus) consommés au prochain jet.
  2) Indices “contenu” (texte/image/PDF) consultables une seule fois.
- __Comment ça marche__
  - Côté MJ (`GMControls`):
    - Mode "Modificateur" → choisir bonus/malus, valeur, durée de la bulle → Envoyer.
    - Mode "Contenu" → choisir format (texte/image/PDF), saisir le texte ou l’URL → Envoyer.
  - Côté Joueur:
    - Une bulle apparaît.
      - Bulle "?" = modificateur → clic = `hint:claim` (file d’attente de modificateurs côté serveur).
      - Bulle "i" = contenu → clic = `hint:open` (le serveur renvoie `hint:content` une seule fois et supprime l’indice).
    - La modale d’indice se ferme via le bouton "Fermer" ou Échap et ne peut pas être rouverte.
- __Limites__
  Impossible de rouvrir côté app (l’état serveur est effacé). Les captures d’écran restent techniquement possibles (limite inhérente au web).

### Screamers
- __Ce que c’est__
  Un overlay plein écran, option image + son, intensité réglable, vibration si dispo.
- __Comment ça marche__
  Événement `screamer:send` (MJ → joueurs). Certains événements déclenchent des screamers automatiques (ex: critique sur d20). 

### Haptique ciblée
- __Ce que c’est__
  Le MJ peut déclencher un motif haptique (battements) sur certains joueurs.
- __Comment ça marche__
  `haptics:start` et `haptics:stop` avec pattern sécurisé et BPM encadré (≈50–160).

### Contrôle du flash (torch)
- __Pré-requis__
  HTTPS ou `localhost` est requis pour l’accès caméra et le contrôle du flash sur mobile (Chrome/Android).
- __Limites Android/Chrome__
  Certains appareils Android exposent le flash au système mais pas au Web. Dans ce cas, `track.getCapabilities().torch` est absent et le MJ verra `unsupported`.
- __Fallback intégré__
  Si `torch` n’est pas exposé, l’appli simule un flash via un écran blanc court, une vibration et un bip discret. Le MJ verra `ACK:fallback` et peut lancer un `Test`.
- __Bonnes pratiques__
  Autorisez la caméra, laissez l’appli activer un `<video>` caché (pipeline actif), et forcez la caméra arrière si besoin. Utilisez le bouton "Tester mon flash" côté Joueur.

### Présence & fiches
- __Ce que c’est__
  Liste des joueurs et fiches (PV, inventaire, argent, stats, compétences). MJ peut éditer les fiches des joueurs.
- __Comment ça marche__
  Synchronisation via `presence:update`. Les verrous d’objets/compétences sont respectés côté serveur.

### Wizard Battle (arbitrage IA)
- __Ce que c’est__
  Manche par manche, les joueurs soumettent un sort, l’IA produit un classement et un résumé. Le MJ peut publier ou corriger.
- __Comment ça marche__
  `wizard:toggle`/`wizard:submit`/`wizard:publish`… Appel OpenAI côté serveur via modèle configurable, format JSON strict avec validations et stratégies de repli (manuel, retry).

### Assets de contenu (PDF/Images pour les indices)
- __Ce que c’est__
  Hébergement simple des fichiers d’indice.
- __Comment ça marche__
  Placez vos fichiers dans le dossier `public/` (ex: `public/hints/plan.pdf`) et utilisez l’URL `/hints/plan.pdf` dans le panneau MJ (mode "Contenu").

---

## Démarrage rapide

```bash
git clone https://github.com/<you>/clainjo-horror.git
cd clainjo-horror
npm install

# 1) Front (dev)
npm run dev

# 2) Serveur realtime
npm run server

# 3) Tout en parallèle
npm run dev:all
````

> \[!TIP]
> Tests manuels : ouvre 2 navigateurs (ou fenêtre privée) pour simuler MJ + Joueur, vérifie join/chat/dice/screamer.

---

## Docker (prod-like)

```bash
# Créez .env à la racine (voir Configuration)
docker compose up -d --build --remove-orphans
```

---

## Configuration

```env
OPENAI_API_KEY=sk-...          # Requis pour Wizard Battle
OPENAI_MODEL=gpt-4.1-nano      # Optionnel (défaut)
APP_VERSION=2025-09-21         # Optionnel, visible clients
# PORT/HOST_PORT via docker-compose.yml
```

> \[!NOTE]
> Réglages fins (intensités, tailles d’historique, délais IA…) : `DOCUMENTATION.md`.

> \[!TIP]
> Fichiers d’indices: placez images/PDF dans `public/` (ex: `public/hints/indice.jpg`) et référez-les dans le panneau MJ via `/hints/indice.jpg`.

## Typographie

- **Hamstrong** pour les titres (`h1`, `h2`, `h3`).
- Chargée depuis `src/assets/fonts/` et appliquée globalement via CSS.
- Permet un rendu “horreur” net tout en gardant la lecture claire sur mobile.

---

## Architecture

**Flux applicatif**

```mermaid
flowchart TD
  subgraph Client [React / Vite]
    RP[RealtimeProvider]
    Player[Player]
    GM[GM]
    Chat[Chat]
    Dice[Dice]
    Scream[Screamer]
    WPlayer[WizardPlayer]
    WGM[WizardGM]
  end

  subgraph Server [Express + Socket.IO]
    IO[SocketIO]
    Rooms[Rooms]
    Start[startWizardRound]
    Resolve[resolveWizardRound]
    Publish[publishWizardResults]
  end

  Player -- join/chat/dice --> IO
  GM -- toggle/publish --> IO
  IO --> Rooms
  IO -- state/init/update --> RP
  IO -- screamer --> Scream
  IO -- results --> WPlayer
  GM -- review --> WGM
  Start --> Resolve --> Publish --> IO
```

**Déroulé Wizard (séquentiel)**

```mermaid
sequenceDiagram
  participant GM as MJ
  participant P1 as Joueur_1
  participant P2 as Joueur_2
  participant S as Serveur
  participant O as OpenAI

  GM->>S: wizard:start {roomId, prompt, timer}
  S-->>P1: wizard:round:start
  S-->>P2: wizard:round:start

  P1->>S: wizard:submit {socketId, text}
  P2->>S: wizard:submit {socketId, text}
  S-->>GM: wizard:submissions:update

  S->>S: resolveWizardRound(roomId)
  S->>O: callOpenAIForWizard [system, user]
  O-->>S: JSON {groups, results by socketId}
  S-->>GM: wizard:aiResult {groups, submissions, results}

  GM->>S: wizard:publish {results} ou wizard:manual
  S->>S: publishWizardResults(roomId, results)
  S-->>P1: wizard:results prive
  S-->>P2: wizard:results prive
  S-->>GM: wizard:published
  S->>S: startWizardRound(room) manche_suivante
```

---

## Captures

<div align="center">
  <!-- Remplace par tes images réelles -->
  <img src="docs/img/mobile-player.png" alt="Mobile Joueur" width="32%" />
  <img src="docs/img/mj-console.png" alt="Console MJ" width="32%" />
  <img src="docs/img/wizard-battle.png" alt="Wizard Battle" width="32%" />
</div>

---

## Roadmap

* [ ] Effets de scène synchronisés (brouillard, battements, lumières connectées)
* [ ] Persistance base (historiques, profils)
* [ ] Thèmes alternatifs (noir/bleu froid, pellicule, found footage)
* [ ] Mode tournoi Wizard (tableaux, éliminations)

---

## Licence

Voir `LICENSE`. Si vous entendez des rires dans les logs, ne vous retournez pas.

```

---

### Ce que ça améliore concrètement

- **Hiérarchie visuelle** nette (titres, séparateurs, sommaire simple).
- **Badges harmonisés** (tons neutres/froids, cohérents).
- **Sections repliables** via admonitions GitHub (`> [!TIP]`, `> [!NOTE]`).
- **Deux Mermaid** stables (un par bloc, pas de `<br/>` ni parenthèses à risque).
- **Placeholders** propres pour screenshots (grid 3 colonnes).
- **Commandes** minimales et lisibles.

### Options bonus (si tu veux pousser)

- Ajoute un **banner** sombre en haut (`/docs/banner-dark.png`) et remplace le premier badge par l’image.
- Ajoute un badge **version** auto (`APP_VERSION`) avec GitHub Actions (release tag → shields).
- Table **“raccourcis MJ”** (commandes, hotkeys) dans `DOCUMENTATION.md`, linkée depuis le README.
- Ajoute un **GIF** court (5–8 s) “Wizard Battle” dans la section Captures.

---

### Pas à pas
1) Remplace ton README par le bloc proposé.  
2) Vérifie le rendu Mermaid sur GitHub (ou avec `npx @mermaid-js/mermaid-cli`).  
3) Ajoute 3 captures réelles dans `docs/img/` et corrige leurs chemins.  
4) Optionnel : ajoute badges CI/licence si tu as les workflows.
```
