# Clainjo Horror — Guide fonctionnel et paramétrage

Ce document décrit en détail les fonctionnalités de l’application, leur fonctionnement temps réel (Socket.IO), et toutes les variables utiles que vous pouvez ajuster pour modifier le comportement (env, constantes UI/serveur).

Sommaire
- Aperçu de l’architecture
- Démarrage (local, Docker)
- Variables d’environnement (.env)
- Fonctionnalités côté Joueur
- Fonctionnalités côté MJ
- Événements Socket.IO (contrat réseau)
- Paramètres/constantes modifiables (serveur + UI)
- Endpoints HTTP utiles
- Conseils performance et mobile

---

## Aperçu de l’architecture
- Frontend: React (Vite) — pages `/`, `/player`, `/gm`
- Realtime: Socket.IO (client/serveur)
- Backend: Node.js + Express + Socket.IO
- IA (Wizard Battle): Appels à OpenAI (Responses API) pour arbitrage en < 5 s
- Conteneurisation: Docker + docker-compose

Flux principaux (voir aussi `ARCHITECTURE.mmd` au format Mermaid)
- Présence/join: un client rejoint une room, le serveur met à jour la liste et envoie `state:init`.
- Chat: message client -> serveur -> diffusion room.
- Dés: client demande un jet -> serveur calcule (autorité) -> diffusion room + gestion bonus/malus.
- Screamer: MJ ordonne un screamer -> serveur notifie les joueurs ciblés -> overlay plein écran + audio + vibration côté client.
- Indices (bonus/malus): MJ envoie un indice à un joueur -> notification + bulle à réclamer -> application sur le prochain jet.
- Wizard Battle: MJ active le mode -> joueurs soumettent un « sort » -> serveur regroupe + appelle l’IA -> résultat editable par le MJ -> publication -> application d’effets (PV, mod. de dés, narratif).

---

## Démarrage
Local (dev)
- Lancer le front: `npm run dev`
- Lancer le serveur: `npm run server`
- Ou les deux: `npm run dev:all`

Production (Docker)
- Créer `.env` à la racine (voir plus bas)
- Démarrer/reconstruire: `docker compose up -d --build --remove-orphans`
- Reconstruire sans changer l’image (env modifié uniquement): `docker compose up -d --force-recreate`

---

## Variables d’environnement (.env)
- `OPENAI_API_KEY` (obligatoire pour Wizard Battle)
- `OPENAI_MODEL` (optionnel; défaut: `gpt-4.1-nano`)
- `PORT` (optionnel; défaut 4000 à l’intérieur du conteneur)
- `HOST_PORT` (optionnel; mapping hôte, défaut 4000)
- `APP_VERSION` (optionnel; affiché aux clients)

Exemple `.env`
```
OPENAI_API_KEY=sk-xxxx
OPENAI_MODEL=gpt-4.1-nano
APP_VERSION=2025-09-21
```

Note: `docker-compose.yml` charge automatiquement `.env` via `env_file`.

---

## Fonctionnalités côté Joueur (pages `/player`)
- Fiche de personnage (`src/components/CharacterSheet.jsx`):
  - Modification PV, argent, inventaire -> synchronisé via `player:update`.
- Jets de dés (`src/components/DiceRoller.jsx`):
  - Boutons rapides (d4..d100), nombre de dés, libellé.
  - Application auto de bonus/malus (indices) au prochain jet.
- Chat (`src/components/Chat.jsx`):
  - Fil chronologique, envoi de messages texte.
- Screamer Overlay (`src/components/ScreamerOverlay.jsx`):
  - Plein écran image/son, vibration paramétrée selon l’intensité (non linéaire pour accentuer 0 vs 1).
- Wizard Battle Player (`src/components/WizardPlayer.jsx`):
  - Zone de saisie du sort, verrouillage après envoi, modale de résultats personnels quand publiés.

Côté mobile: UI pensée en mobile-first (stack 1 colonne, textes qui wrap, médias qui ne débordent pas).

---

## Fonctionnalités côté MJ (page `/gm`)
- Console Wizard Battle (`src/components/WizardGM.jsx`):
  - Activer/désactiver, forcer résolution, relancer IA, éditer les résultats par joueur, publier.
- Contrôles MJ (`src/components/GMControls.jsx`):
  - Screamers: sélection de cibles, type de screamer, intensité (0..1).
  - Indices: cible, type (bonus/malus), valeur, durée.
- Dice Roller / Presence / Chat accessibles comme pour les joueurs.

Disposition desktop: grille 2 colonnes (sur >= 1024px) pour un poste MJ confortable.

---

## Événements Socket.IO (contrat réseau)
Côté serveur: `server/index.js`
- Connexion/présence
  - `join` (client -> serveur): `{ roomId, role, name, hp?, money?, inventory? }`
  - `presence:update` (serveur -> room)
  - `state:init` (serveur -> socket) état initial dont `wizard` (payload compact)
  - `state:get` (GM -> serveur) renvoie `state:init`
- Chat
  - `chat:message` (client -> serveur -> diffusion)
- Dés
  - `dice:roll` (client -> serveur)
  - `dice:result` (serveur -> room)
- Screamer
  - `screamer:send` (GM -> serveur)
  - `screamer:trigger` (serveur -> joueurs ciblés)
- Indices
  - `hint:send` (GM -> serveur)
  - `hint:notify` (serveur -> joueur)
  - `hint:claim` (joueur -> serveur)
- Wizard Battle
  - `wizard:toggle` (GM)
  - `wizard:submit` (joueur)
  - `wizard:force` (GM)
  - `wizard:retry` (GM) — une fois après un échec IA
  - `wizard:manual` (GM) — applique des résultats fournis manuellement
  - `wizard:publish` (GM) — publie les résultats (applique effets + historique)
  - `wizard:get` (GM) — infos de la manche en cours
  - `wizard:state`, `wizard:round:resolving`, `wizard:aiResult`, `wizard:aiError`, `wizard:published`, `wizard:results` (serveur -> clients)

---

## Paramètres / constantes modifiables
Côté serveur (`server/index.js`)
- `const DICE_MAX_HISTORY = 200` — taille max de l’historique de jets
- `const DICE_MAX_COUNT = 100` — nombre max de dés par jet
- `const SCREAMER_DEFAULT_ID = 'default'`
- `const SCREAMER_DEFAULT_INTENSITY = 0.8` — intensité par défaut si non fournie
- `const AUTO_SCREAMER_INTENSITY_FAIL = 0.7` — screamer auto sur 1 au d20
- `const AUTO_SCREAMER_INTENSITY_SUCCESS = 0.9` — screamer auto sur 20 au d20
- `const HINT_DURATION_MS_DEFAULT = 5000` — durée par défaut d’une bulle indice
- `const HINT_MALUS_SCREAMER_ID = SCREAMER_DEFAULT_ID` — screamer déclenché lors d’un malus
- `const HINT_MALUS_SCREAMER_INTENSITY = SCREAMER_DEFAULT_INTENSITY`
- `const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-nano'` — modèle IA
- `const WIZARD_AI_TIMEOUT_MS = 4000` — budget temps IA (pour < 5 s total)
- `const WIZARD_MAX_TEAM_SIZE = 3` — taille max d’un groupe (paires, trio possible)

Fonctions clés (serveur)
- `wizardStatePayload(room)` — compacte l’état Wizard pour le client
- `startWizardRound(room)` — incrémente la manche, réinitialise et forme les groupes
- `resolveWizardRound(roomId)` — construit le prompt, appelle l’IA, gère erreurs
- `publishWizardResults(roomId, results, meta)` — applique PV/mod. de dés/narratif + historique + diffusions
- `callOpenAIForWizard({ apiKey, model, payload })` — wrapper minimal OpenAI Responses API

Côté client — Screamer (`src/components/ScreamerOverlay.jsx`)
- `const DEFAULT_INTENSITY = 0.8`
- Volume audio: `AUDIO_VOL_BASE = 0.6`, `AUDIO_VOL_RANGE = 0.4`
- Vibration (mobile):
  - `VIB_ON_MIN_MS = 20`, `VIB_ON_RANGE_MS = 50`
  - `VIB_OFF_MAX_MS = 40`, `VIB_OFF_RANGE_MS = 25`
  - `VIB_BURSTS_MIN = 20`, `VIB_BURSTS_RANGE = 30`
  - Courbe: `s = intensity^2.2` (modulable)
- Synthèse WebAudio: fréquences, gains, bruit, filtre (voir constantes `OSC*`, `NOISE_*`)

Côté client — Contrôles MJ (`src/components/GMControls.jsx`)
- `DEFAULT_SCREAMER_INTENSITY = 0.8`

Côté client — Dés (`src/components/DiceRoller.jsx`)
- `QUICK_SIDES = [4,6,8,10,12,20,100]`
- `ROLLING_FAILSAFE_MS = 1500`
- `DICE_COUNT_MIN = 1`, `DICE_COUNT_MAX = 100`

Thème / Layout
- Couleurs et style globaux: `src/index.css` (variables CSS `--bg-*`, `--fg-*`)
- Layout mobile-first: `src/App.css` (`.page`, `.page-header`, `.stack`, `.gm-grid`)

---

## Endpoints HTTP utiles
- `GET /api/version` — expose `APP_VERSION`
- `GET /api/wizard/status` — OK (200) si pas d’erreur récente IA, sinon 503 avec message
- Front statique (prod): service des assets Vite depuis `dist/`

---

## Conseils performance & mobile
- Mobile-first par défaut (1 colonne), GM en 2 colonnes sur >= 1024px
- Éviter les largeurs fixes; privilégier flex-wrap/grid et `max-width: 100%`
- Les médias (`img`, `video`, etc.) sont contraints à `max-width: 100%`
- La vibration est ignorée si non supportée/bloquée (iOS)

---

## Dépannage
- Wizard Battle ne démarre pas (IA) → vérifier `OPENAI_API_KEY` et `/api/wizard/status`
- Problèmes de défilement horizontal mobile → vérifier qu’aucun composant ne force une largeur > 100%
- Lint côté serveur → `eslint.config.js` inclut les globals Node; pour le front, suivre les warnings/erreurs affichés
