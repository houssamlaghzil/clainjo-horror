# 🧪 Test de Persistance - Inventaire, Compétences & Compteur Copper

## ✅ Corrections apportées

### Système de persistance basé sur le nom du joueur

Le serveur maintenant :
1. ✅ **Identifie les joueurs par leur nom** dans une room
2. ✅ **Restaure l'état précédent** quand un joueur se reconnecte
3. ✅ **Conserve** :
   - Inventaire complet (objets normaux + légendaires)
   - Compétences
   - HP, argent, statistiques
   - Compteur d'utilisations de Copper (`copperItemUses`)

### Comment ça fonctionne

**Côté serveur** (`server/index.js`):
- Lors du `join`, le serveur cherche un joueur existant avec le même nom
- Si trouvé, il restaure toutes les données du serveur (priorité serveur)
- L'ancien socketId est remplacé par le nouveau
- Le compteur `copperItemUses` est préservé

**Côté client** (`RealtimeProvider.jsx`):
- Sauvegarde la session dans `localStorage`
- Reçoit `state:init` du serveur avec l'état restauré
- Met à jour l'UI avec les données du serveur

**Compteur Copper** (`LegendaryItemGenerator.jsx`):
- Synchronise automatiquement avec `players.copperItemUses`
- Se met à jour à chaque `presence:update`

## 🧪 Procédure de test : Persistance complète

### Test 1 : Objets normaux + Compétences

#### Étape 1 : Créer un personnage
```bash
npm run dev:all
```

1. Se connecter en tant que **"TestPlayer"**
   - Room: `test-persist`
   - Nom: `TestPlayer`
   - Role: `player`

2. Ouvrir la fiche personnage

3. Ajouter plusieurs objets normaux :
   - "Épée en acier"
   - "Potion de soin"
   - "Bouclier"

4. Ajouter des compétences :
   - "Combat rapproché"
   - "Alchimie basique"

5. Modifier les stats :
   - HP: 50
   - Argent: 100
   - Force: 10
   - Intelligence: 8
   - Agilité: 12

6. **Enregistrer** (bouton "Enregistrer")

#### Étape 2 : Recharger la page

1. Appuyer sur **F5** pour recharger
2. Se reconnecter avec :
   - Room: `test-persist` (même room)
   - Nom: `TestPlayer` (même nom)
   - Role: `player`

#### Vérification ✅

- ✅ **Inventaire** : Les 3 objets sont toujours là
- ✅ **Compétences** : Les 2 compétences sont présentes
- ✅ **Stats** : HP=50, Argent=100, Force=10, Int=8, Agi=12

### Test 2 : Objets légendaires de Copper

#### Étape 1 : Créer Copper et générer des objets

1. Se connecter en tant que **"Copper"**
   - Room: `test-copper`
   - Nom: `Copper`
   - Role: `player`

2. Générer **3 objets légendaires** :
   - Cliquer 3 fois sur "✨ Générer un objet légendaire"
   - Fermer les modals pour ajouter à l'inventaire

3. Vérifier :
   - ✅ Compteur : `7/10` utilisations restantes
   - ✅ Inventaire : 3 objets avec bordure cyan + images

#### Étape 2 : Recharger la page

1. **F5** pour recharger
2. Se reconnecter :
   - Room: `test-copper`
   - Nom: `Copper`
   - Role: `player`

#### Vérification ✅

- ✅ **Inventaire** : Les 3 objets légendaires sont présents
  - Bordures cyan
  - Images affichées
  - Icônes ⚡
  - Verrouillés (non modifiables)
- ✅ **Compteur** : Toujours `7/10` utilisations
- ✅ **Console serveur** : Message de restauration
  ```
  🔄 Player Copper joined room test-copper (restored from previous session)
     Inventory: 3 items, Copper uses: 3
  ```

### Test 3 : Persistance après ajout d'objets

#### Étape 1 : État initial

1. Se connecter en tant que Copper
2. Inventaire : 3 objets légendaires, `7/10` uses

#### Étape 2 : Ajouter plus d'objets

1. Générer **2 nouveaux objets légendaires**
2. Ajouter **1 objet normal** manuellement :
   - Nom: "Corde d'escalade"
   - Description: "50m de corde solide"

3. État maintenant :
   - 5 objets légendaires
   - 1 objet normal
   - Compteur : `5/10` uses

#### Étape 3 : Recharger

1. **F5**
2. Se reconnecter (même nom, même room)

#### Vérification ✅

- ✅ **6 objets** dans l'inventaire
  - 5 légendaires (cyan, verrouillés)
  - 1 normal (modifiable)
- ✅ **Compteur** : `5/10`
- ✅ **Ordre préservé**

### Test 4 : Multiples rechargements

1. Générer 1 objet → Recharger → ✅ Présent
2. Générer 1 objet → Recharger → ✅ 2 objets présents
3. Générer 1 objet → Recharger → ✅ 3 objets présents
4. Compteur décrémente correctement : 9 → 8 → 7

### Test 5 : Fermer le navigateur

1. Se connecter en tant que Copper
2. Générer 2 objets
3. **Fermer complètement le navigateur** (pas juste l'onglet)
4. **Rouvrir le navigateur**
5. Retourner sur l'app
6. Se reconnecter

#### Vérification ✅

- ✅ Objets toujours présents
- ✅ Compteur correct
- ✅ Session restaurée depuis `localStorage`

### Test 6 : Plusieurs joueurs simultanés

#### Configuration

**Onglet 1** : Copper dans room `shared`
**Onglet 2** : TestPlayer dans room `shared`

#### Étape 1

1. **Copper** génère 2 objets
2. **TestPlayer** ajoute manuellement 3 objets

#### Étape 2 : Recharger les deux onglets

1. F5 sur onglet 1 (Copper)
2. F5 sur onglet 2 (TestPlayer)
3. Se reconnecter avec les mêmes noms

#### Vérification ✅

- ✅ **Copper** : 2 objets légendaires + compteur correct
- ✅ **TestPlayer** : 3 objets normaux
- ✅ **Aucune confusion** entre les inventaires

## 🐛 Débogage

### Console serveur

Chercher ces messages lors de la reconnexion :

```
🔄 Player Copper joined room test-copper (restored from previous session)
   Inventory: 3 items, Copper uses: 3
```

Si vous voyez :
```
🔄 Player Copper joined room test-copper (new)
```
→ Le joueur est considéré comme nouveau (pas de restauration)

### Console browser (F12)

1. **Avant rechargement** - Vérifier localStorage :
   ```js
   localStorage.getItem('clainjo.session.v1')
   ```
   Devrait contenir `inventory`, `skills`, etc.

2. **Après reconnexion** - Vérifier `state:init` :
   ```
   state:init received with inventory: [...]
   ```

### Problèmes courants

#### ❌ L'inventaire se vide après rechargement

**Cause possible** : Nom différent lors de la reconnexion
**Solution** : Vérifier que le nom est **exactement identique** (sensible à la casse)

#### ❌ Le compteur Copper revient à 10

**Cause possible** : `copperItemUses` n'est pas synchronisé
**Solution** :
1. Vérifier console serveur pour le message de restauration
2. Vérifier que `copperItemUses` est dans `sanitizePublicPlayer`

#### ❌ Les objets légendaires perdent leur image

**Cause possible** : Champs `legendary`, `imageUrl` non préservés
**Solution** :
1. Vérifier que `CharacterSheet.normalizeInventory()` préserve ces champs
2. Vérifier la console pour erreurs

## ✨ Comportements attendus

### Persistance garantie

| Donnée | Persistance après F5 | Persistance après fermeture navigateur |
|--------|---------------------|----------------------------------------|
| HP, Argent, Stats | ✅ Oui | ✅ Oui |
| Inventaire normal | ✅ Oui | ✅ Oui |
| Objets légendaires | ✅ Oui | ✅ Oui |
| Images des objets | ✅ Oui | ⚠️ Oui (si URL valide) |
| Compétences | ✅ Oui | ✅ Oui |
| Compteur Copper | ✅ Oui | ✅ Oui |

### Notes importantes

- ⚠️ **Images Together AI expirent** après quelques heures (normal, URLs temporaires)
- ✅ **Le nom du joueur est la clé** de persistance dans une room
- ✅ **localStorage** sauvegarde côté client en backup
- ✅ **Serveur** a toujours la priorité sur les données

## 📊 Résultats attendus

### Logs de reconnexion réussie

**Server :**
```
🔄 Player Copper joined room test (restored from previous session)
   Inventory: 5 items, Copper uses: 5
```

**Client (console):**
```
state:init received
✅ Inventory synchronized: 5 items
🔄 Copper uses: 5/10
```

### Test de bout en bout

1. ✅ Connexion initiale
2. ✅ Ajout de 3 objets + 2 compétences
3. ✅ Génération de 4 objets légendaires (Copper)
4. ✅ Rechargement (F5)
5. ✅ **TOUT est restauré**
6. ✅ Modification d'un objet normal
7. ✅ Rechargement
8. ✅ **Modification conservée**
