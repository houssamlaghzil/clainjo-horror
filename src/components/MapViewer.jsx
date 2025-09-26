import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import { getZoneMaps, normalizeZoneName } from '../utils/zoneMaps.js';
import * as THREE from 'three';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';

export default function MapViewer() {
  const { selectedZone } = useRealtime();
  const maps = useMemo(() => getZoneMaps(), []);
  const zone = normalizeZoneName(selectedZone || 'village');
  const src = maps[zone];
  const is3D = zone.includes('3d');

  if (!src) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', width: '100%', minHeight: '60vh', color: '#94a3b8' }}>
        <div>
          <div style={{ fontSize: 14 }}>Aucune carte trouvée pour:</div>
          <div style={{ fontWeight: 600 }}>{zone}</div>
        </div>
      </div>
    );
  }

  if (is3D) {
    return <Panorama360 src={src} alt={zone} />;
  }

  // 2D fallback
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={src}
        alt={zone}
        style={{
          display: 'block',
          width: '100vw',
          height: '100vh',
          objectFit: 'contain',
          objectPosition: 'center center',
        }}
      />
    </div>
  );
}

function Panorama360({ src, alt }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rafRef = useRef(0);
  const [needPermission, setNeedPermission] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1100);
    cameraRef.current = camera;

    // Inverted sphere geometry for equirectangular panoramic texture
    const geometry = new THREE.SphereGeometry(500, 64, 32);
    geometry.scale(-1, 1, 1); // invert the sphere to view from inside

    const texture = new THREE.TextureLoader().load(src);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // DeviceOrientation controls (monoscopic)
    let controls;
    try {
      controls = new DeviceOrientationControls(camera);
      controlsRef.current = controls;
    } catch (_) {
      controls = null;
    }

    // iOS 13+ requires permission
    const iosNeedsPerm = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
    if (iosNeedsPerm) {
      setNeedPermission(true);
    }

    const onResize = () => {
      const W = mount.clientWidth || window.innerWidth;
      const H = mount.clientHeight || window.innerHeight;
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      if (controls) controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      try { controls?.dispose?.(); } catch (_) {}
      try { renderer.dispose(); } catch (_) {}
      try { mount.removeChild(renderer.domElement); } catch (_) {}
      texture.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [src]);

  const requestOrientation = async () => {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === 'granted') {
          setNeedPermission(false);
          // Recreate controls after permission
          if (cameraRef.current) {
            try {
              controlsRef.current = new DeviceOrientationControls(cameraRef.current);
            } catch (_) {}
          }
        }
      } else {
        setNeedPermission(false);
      }
    } catch (_) {
      // ignore
    }
  };

  return (
    <div ref={mountRef} style={{ position: 'absolute', inset: 0, background: '#000' }}>
      {needPermission && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2, background: 'rgba(0,0,0,0.5)' }}>
          <button onClick={requestOrientation} style={{ padding: '10px 16px', fontSize: 16 }}>Activer la vision 360°</button>
        </div>
      )}
      {/* Canvas injected here by Three.js renderer */}
    </div>
  );
}
