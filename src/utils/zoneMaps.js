// Utility to load map image and video assets and expose them by lowercase basename.
// Example: assets/maps/Village.png -> key 'village'
// Example: assets/maps/Village_3D.mp4 -> key 'village_3d'

const modules = import.meta.glob('../assets/maps/*.{png,jpg,jpeg,webp,svg,mp4,webm,ogg,mov}', { eager: true });

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
