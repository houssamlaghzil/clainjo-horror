# 🐛 Debug de la persistance

## Test à effectuer

### Étape 1 : Connexion initiale

1. Démarrer l'app : `npm run dev:all`
2. Se connecter en tant que **Copper** (room: `test`, name: `Copper`, role: `player`)
3. Ouvrir la console (F12)

### Étape 2 : Générer un objet légendaire

1. Cliquer sur "✨ Générer un objet légendaire"
2. Fermer la modal pour ajouter à l'inventaire
3. **Vérifier dans la console client** :
   ```
   ✅ Item generated: {...}
   🔄 Updating inventory with: [...]
   ```
4. **Vérifier dans la console serveur** :
   ```
   ✅ Copper generated item: [nom], inventory count: 1
   ```

### Étape 3 : Recharger la page

1. **Appuyer sur F5**
2. Se reconnecter (même room, même nom)
3. **Observer la console client** :
   ```
   📥 state:init received from server: { ..., inventory: [...], ... }
   📦 Restoring inventory from server: 1 items
   ```
4. **Observer la console serveur** :
   ```
   🔄 Player Copper joined room test (restored from previous session)
      📦 Inventory: 1 items, Copper uses: 1
      📤 Sending state:init with inventory: [nom de l'objet]
   ```

## 🔍 Points à vérifier

### Si l'inventaire est vide après rechargement

#### Console serveur dit "new" au lieu de "restored"
❌ **Problème** : Le joueur n'est pas reconnu
**Cause** : Nom différent ou serveur redémarré
**Solution** : Vérifier que le nom est exactement "Copper"

#### Console serveur dit "restored" mais inventory count: 0
❌ **Problème** : L'inventaire n'a pas été sauvegardé
**Cause** : L'objet n'a jamais été ajouté côté serveur
**Solution** : Vérifier que l'objet est bien ajouté dans le handler `copper:generate-item`

#### Console client ne montre pas "state:init"
❌ **Problème** : Le client ne reçoit pas les données du serveur
**Cause** : Événement non écouté ou erreur de connexion
**Solution** : Vérifier la connexion socket

#### Console client montre "state:init" mais inventory vide
❌ **Problème** : Le serveur envoie un inventaire vide
**Cause** : Bug dans la logique de restauration
**Solution** : Vérifier les logs serveur pour voir ce qui est envoyé

## 📊 Logs attendus (séquence complète)

### Génération initiale

**Client :**
```
✅ Item generated: { objet: { nom: "Dague de Cristal" }, ... }
🔄 Updating inventory with: [{ name: "Dague...", legendary: true, ... }]
```

**Serveur :**
```
✅ Copper generated item: Dague de Cristal, inventory count: 1
```

### Rechargement de la page

**Client :**
```
📥 state:init received from server: { 
  socketId: "...", 
  name: "Copper", 
  inventory: [{ name: "Dague...", legendary: true, ... }],
  copperItemUses: 1,
  ...
}
📦 Restoring inventory from server: 1 items
```

**Serveur :**
```
🔄 Player Copper joined room test (restored from previous session)
   📦 Inventory: 1 items, Copper uses: 1
   📤 Sending state:init with inventory: Dague de Cristal (1D6, 3 uses)
```

## 🧪 Test complet

1. ✅ Générer 3 objets
2. ✅ Vérifier qu'ils sont dans l'inventaire
3. ✅ Compteur : 7/10
4. ✅ Recharger (F5)
5. ✅ Reconnecter
6. ✅ **Les 3 objets doivent être présents**
7. ✅ **Compteur doit être 7/10**

## 🚨 Si le problème persiste

Envoyez-moi :
1. La console serveur complète (depuis le redémarrage)
2. La console client (F12) après le rechargement
3. Le contenu de `localStorage.getItem('clainjo.session.v1')`
