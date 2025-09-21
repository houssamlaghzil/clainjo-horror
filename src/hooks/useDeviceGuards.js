import { useCallback, useRef } from 'react';

export function useDeviceGuards() {
  const wakeLockRef = useRef(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock?.request) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current?.addEventListener?.('release', () => {
          // console.log('Wake Lock released');
        });
      }
    } catch (e) {
      // console.warn('Wake lock failed', e);
    }
  }, []);

  const requestFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch (e) {
      // console.warn('Fullscreen failed', e);
    }
  }, []);

  const enableImmersive = useCallback(async () => {
    await requestFullscreen();
    await requestWakeLock();
  }, [requestFullscreen, requestWakeLock]);

  return { enableImmersive };
}
