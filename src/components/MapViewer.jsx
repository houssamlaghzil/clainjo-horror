import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import { getZoneMaps, normalizeZoneName } from '../utils/zoneMaps.js';
import * as THREE from 'three';

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

  // Lightweight DeviceOrientation controls (internal, no external example import)
  function createDeviceOrientationControls(object) {
    const scope = { deviceOrientation: {}, screenOrientation: 0 };
    const zee = new THREE.Vector3(0, 0, 1);
    const euler = new THREE.Euler();
    const q0 = new THREE.Quaternion();
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X

    const onDeviceOrientation = (event) => {
      scope.deviceOrientation = event;
    };
    const onScreenOrientation = () => {
      scope.screenOrientation = (window.orientation || 0);
    };
    window.addEventListener('deviceorientation', onDeviceOrientation, true);
    window.addEventListener('orientationchange', onScreenOrientation, false);
    onScreenOrientation();

    function setObjectQuaternion(quaternion, alpha, beta, gamma, orient) {
      // ZXY for the device, but 'YXZ' for us
      euler.set(beta, alpha, -gamma, 'YXZ');
      quaternion.setFromEuler(euler);
      quaternion.multiply(q1);
      quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
    }

    return {
      update() {
        const alpha = THREE.MathUtils.degToRad(scope.deviceOrientation.alpha || 0); // Z
        const beta = THREE.MathUtils.degToRad(scope.deviceOrientation.beta || 0); // X'
        const gamma = THREE.MathUtils.degToRad(scope.deviceOrientation.gamma || 0); // Y''
        const orient = THREE.MathUtils.degToRad(scope.screenOrientation || 0);
        setObjectQuaternion(object.quaternion, alpha, beta, gamma, orient);
      },
      dispose() {
        window.removeEventListener('deviceorientation', onDeviceOrientation, true);
        window.removeEventListener('orientationchange', onScreenOrientation, false);
      }
    };
  }

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
    let controls = createDeviceOrientationControls(camera);
    controlsRef.current = controls;

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
              controlsRef.current?.dispose?.();
              controlsRef.current = createDeviceOrientationControls(cameraRef.current);
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
