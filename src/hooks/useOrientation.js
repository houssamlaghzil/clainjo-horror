import { useEffect, useState } from 'react';

// Returns 'portrait' | 'landscape'
export default function useOrientation() {
  const getOrientation = () => {
    if (typeof window === 'undefined') return 'portrait';
    const { innerWidth: w, innerHeight: h } = window;
    if (w && h) return w >= h ? 'landscape' : 'portrait';
    // Fallback to screen orientation API
    const o = window.screen?.orientation?.type || '';
    if (/landscape/i.test(o)) return 'landscape';
    return 'portrait';
  };

  const [orientation, setOrientation] = useState(getOrientation());

  useEffect(() => {
    const onResize = () => setOrientation(getOrientation());
    const onChange = () => setOrientation(getOrientation());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onChange);
    if (window.screen?.orientation?.addEventListener) {
      try { window.screen.orientation.addEventListener('change', onChange); } catch (_) {}
    }
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onChange);
      if (window.screen?.orientation?.removeEventListener) {
        try { window.screen.orientation.removeEventListener('change', onChange); } catch (_) {}
      }
    };
  }, []);

  return orientation;
}
