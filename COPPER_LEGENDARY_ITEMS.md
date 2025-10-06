# Générateur d'Items Légendaires - Capacité Spéciale de Copper

## 📋 Vue d'ensemble

Cette fonctionnalité permet au joueur **Copper** de générer des objets légendaires uniques basés sur un système de D20, avec génération d'images via l'API Together AI.

## ⚙️ Configuration requise

### Variables d'environnement

Ajoutez la clé API Together AI dans votre fichier `.env` :

```
TOGETHER_API=votre_clé_api_together
```

La clé est déjà configurée dans votre `.env` actuel.

## 🎲 Système de génération

### Catégories basées sur le jet de D20

#### 🔥 Jet 1-5 : Armes ultra-puissantes
- **Dégâts** : 1D20
- **Utilisations** : 2-4 (très limité)
- **Ton** : Épique et mystique
- **Exemples** :
  - Lame de l'Éternité Quantique
  - Prisme de Destruction Atomique
  - Canon Hypersonique Dimensionnel

#### ⚡ Jet 6-10 : Objets pratiques et délicats
- **Dégâts** : 1D6
- **Utilisations** : 6-15
- **Ton** : Raffiné et ingénieux
- **Exemples** :
  - Dague de Cristal Harmonique
  - Pistolet à Plasma Élégant
  - Orbe de Gravité Focalisée

#### 💎 Jet 11-15 : Reliques précieuses inutilisables
- **Dégâts** : 1D4
- **Utilisations** : 0 (objet décoratif/cassé)
- **Ton** : Mystérieux et contemplatif
- **Exemples** :
  - Relique Stellaire Désactivée
  - Gemme du Néant Scellée
  - Anneau Temporel Gelé

#### 💀 Jet 16-20 : Objets maudits
- **Dégâts** : 1D4 ou 0
- **Utilisations** : Variable
- **Ton** : Sombre, ironique, humour noir
- **Effets** : Handicaps temporaires pour Copper
- **Exemples** :
  - Marteau de Gravité Inversée (champ gravitationnel chaotique 10min)
  - Épée de Sacrifice Vital (draine 1D4 HP de Copper par frappe)
  - Gant de Force Réfléchie (inverse mouvements pendant 5min)

## 🎮 Utilisation

### Pour Copper (Joueur)

1. **Accéder au générateur** : Visible uniquement dans l'interface de Copper
2. **Limites** : 10 utilisations maximum sans autorisation du MJ
3. **Génération** :
   - Cliquer sur "✨ Générer un objet légendaire"
   - Le système lance automatiquement un D20
   - L'objet est généré selon le jet
   - Une image est créée via Together AI (FLUX.1-schnell)
   - L'objet est ajouté automatiquement à l'inventaire (verrouillé)

### Pour le Maître du Jeu

Le MJ peut :
- Voir les notifications quand Copper génère un objet
- Réinitialiser le compteur d'utilisations de Copper via socket event `copper:reset-uses`

## 🖼️ Génération d'images

Les images sont générées avec :
- **Modèle** : black-forest-labs/FLUX.1-schnell
- **Style** : Photo-réaliste, technophantasy, rendu cinéma
- **Résolution** : 1024x1024
- **Prompt** : Français, ultra-détaillé, éclairage studio froid

## 🔧 Architecture technique

### Backend (server/index.js)

**Fonctions principales** :
- `generateLegendaryItemData(d20Roll)` : Génère les données de l'objet
- `generateImagePrompt(itemData)` : Crée le prompt pour Together AI
- `generateItemImage(prompt)` : Appelle l'API Together AI

**Socket events** :
- `copper:generate-item` : Demande de génération (player → server)
- `copper:item-generated` : Objet généré avec succès (server → player)
- `copper:item-error` : Erreur de génération (server → player)
- `copper:item-notification` : Notification au MJ (server → GM)
- `copper:reset-uses` : Réinitialisation par MJ (GM → server)
- `copper:uses-reset` : Confirmation de réinitialisation (server → player)

### Frontend

**Composant** : `src/components/LegendaryItemGenerator.jsx`

**Features** :
- Interface utilisateur avec gradient technophantasy
- Compteur d'utilisations (10 max)
- Modal de résultat avec image et détails
- Gestion d'erreurs
- Auto-ajout à l'inventaire

**Intégration** : `src/pages/Player.jsx`
- Visible uniquement si `name === 'Copper'`
- Placé entre la fiche personnage et les dés

## 📦 Structure de données

```json
{
  "jet_d20": 7,
  "objet": {
    "nom": "Dague de Cristal Harmonique",
    "degats": "1D6",
    "utilisations": 8,
    "description": "Lame translucide qui résonne...",
    "categorie": "objet pratique"
  },
  "image_prompt": "Dague de Cristal Harmonique, objet technophantasy...",
  "image_url": "https://...",
  "usesRemaining": 9
}
```

## 🛡️ Règles d'équilibrage

- ✅ Aucun objet ne peut tuer Copper
- ✅ Aucun objet ne peut le rendre immortel
- ✅ Les malus ont toujours une durée limitée
- ✅ Objets plausibles dans un univers technophantasy futuriste
- ✅ Les objets légendaires sont verrouillés dans l'inventaire (non modifiables par le joueur)

## 🚀 Démarrage

```bash
# Installer les dépendances
npm install

# Démarrer le serveur et le client
npm run dev:all

# Ou séparément
npm run server  # Backend sur :4000
npm run dev     # Frontend sur :5173
```

## 📝 Notes

- Le compteur d'utilisations est stocké dans `player.copperItemUses`
- Les objets générés sont marqués avec `locked: true` et `legendary: true`
- Les images Together AI sont temporaires (expiration après quelques heures)
- Le style visuel utilise la police **Hamstrong** pour les titres
