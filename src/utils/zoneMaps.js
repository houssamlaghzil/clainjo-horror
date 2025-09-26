// Utility to load map image assets and expose them by lowercase basename.
// Example: assets/maps/Village.png -> key 'village'

const modules = import.meta.glob('../assets/maps/*.{png,jpg,jpeg,webp,svg}', { eager: true });

const zoneMaps = {};
for (const [p, mod] of Object.entries(modules)) {
  const file = p.split('/').pop() || p;
  const base = file.replace(/\.[^.]+$/, '').toLowerCase();
  const url = mod?.default || mod;
  if (url) zoneMaps[base] = url;
}

export function getZoneMaps() {
  return zoneMaps;
}

export function normalizeZoneName(name) {
  return String(name || '').trim().toLowerCase();
}
