# Icônes PWA

## Génération des icônes

Pour générer les icônes PWA à partir d'une image source:

```bash
# Installer sharp (si pas déjà fait)
npm install sharp --save-dev

# Générer les icônes
node scripts/generate-icons.js path/to/your-logo.png
```

## Tailles requises

Les icônes suivantes sont nécessaires pour une PWA complète:

- **72x72** - Android Chrome
- **96x96** - Android Chrome
- **128x128** - Android Chrome
- **144x144** - Android Chrome
- **152x152** - iOS Safari
- **192x192** - Android Chrome (minimum requis)
- **384x384** - Android Chrome
- **512x512** - Android Chrome (splash screen)

## Recommandations

- **Format:** PNG avec transparence
- **Taille source:** 1024x1024px minimum
- **Design:** Simple, reconnaissable à petite taille
- **Couleur de fond:** Cohérente avec le theme (#0a0a0c)
- **Maskable:** Les icônes 192x192 et 512x512 doivent être "maskable" (zone de sécurité de 10%)

## Outils recommandés

- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Maskable.app](https://maskable.app/) - Tester les icônes maskable

## Placeholder

En attendant vos icônes personnalisées, vous pouvez utiliser des placeholders:

```bash
# Créer des placeholders rapidement
npm run generate-placeholder-icons
```

Ou créer manuellement des icônes simples avec:
- Fond noir (#0a0a0c)
- Texte "CH" (Clainjo Horror) en rouge (#8b0000)
- Police grande et lisible
