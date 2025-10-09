#!/usr/bin/env node

/**
 * Génère des icônes placeholder pour la PWA
 * Utile pour le développement avant d'avoir les vraies icônes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

// Créer le dossier icons s'il n'existe pas
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🎨 Génération des icônes placeholder...\n');

// Fonction pour créer un SVG simple
function createSVG(size) {
  const fontSize = Math.floor(size * 0.4);
  const strokeWidth = Math.floor(size * 0.02);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#0a0a0c"/>
  <text 
    x="50%" 
    y="50%" 
    font-family="Arial, sans-serif" 
    font-size="${fontSize}" 
    font-weight="bold" 
    fill="#8b0000" 
    text-anchor="middle" 
    dominant-baseline="central"
    stroke="#a00000"
    stroke-width="${strokeWidth}"
  >CH</text>
</svg>`;
}

// Générer chaque taille
for (const size of ICON_SIZES) {
  const svgContent = createSVG(size);
  const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.svg`);
  
  fs.writeFileSync(outputPath, svgContent);
  console.log(`✅ Généré: icon-${size}x${size}.svg`);
}

console.log('\n🎉 Icônes placeholder générées avec succès!');
console.log('\n📝 Note: Ces icônes sont temporaires.');
console.log('   Remplacez-les par vos vraies icônes PNG avec:');
console.log('   node scripts/generate-icons.js path/to/your-logo.png\n');
