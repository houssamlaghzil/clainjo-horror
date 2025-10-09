#!/usr/bin/env node

/**
 * Script pour générer les icônes PWA à partir d'une image source
 * 
 * Usage:
 *   node scripts/generate-icons.js <source-image.png>
 * 
 * Requirements:
 *   npm install sharp --save-dev
 * 
 * L'image source doit être au format PNG, idéalement 1024x1024px ou plus
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tailles d'icônes requises pour PWA
const ICON_SIZES = [
  72,   // Android Chrome
  96,   // Android Chrome
  128,  // Android Chrome
  144,  // Android Chrome
  152,  // iOS Safari
  192,  // Android Chrome (minimum requis)
  384,  // Android Chrome
  512   // Android Chrome (splash screen)
];

// Couleur de fond pour les icônes (si l'image source a de la transparence)
const BACKGROUND_COLOR = { r: 10, g: 10, b: 12, alpha: 1 };

async function generateIcons(sourceImage) {
  const outputDir = path.join(__dirname, '../public/icons');
  
  // Créer le dossier icons s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ Dossier créé: ${outputDir}`);
  }

  console.log(`📸 Source: ${sourceImage}`);
  console.log(`📁 Destination: ${outputDir}`);
  console.log('');

  // Vérifier que le fichier source existe
  if (!fs.existsSync(sourceImage)) {
    console.error(`❌ Erreur: Le fichier source n'existe pas: ${sourceImage}`);
    process.exit(1);
  }

  // Générer chaque taille d'icône
  for (const size of ICON_SIZES) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: BACKGROUND_COLOR
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Généré: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Erreur lors de la génération de icon-${size}x${size}.png:`, error.message);
    }
  }

  console.log('');
  console.log('🎉 Génération des icônes terminée!');
  console.log('');
  console.log('📝 Prochaines étapes:');
  console.log('   1. Vérifiez les icônes dans public/icons/');
  console.log('   2. Ajoutez des screenshots dans public/screenshots/');
  console.log('   3. Testez avec Lighthouse (PWA audit)');
}

// Récupérer l'argument de ligne de commande
const sourceImage = process.argv[2];

if (!sourceImage) {
  console.log('Usage: node scripts/generate-icons.js <source-image.png>');
  console.log('');
  console.log('Exemple:');
  console.log('  node scripts/generate-icons.js logo.png');
  console.log('');
  console.log('Note: L\'image source doit être au format PNG, idéalement 1024x1024px ou plus');
  process.exit(1);
}

// Exécuter la génération
generateIcons(sourceImage).catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
