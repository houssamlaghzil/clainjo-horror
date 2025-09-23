import React, { useEffect, useRef } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

// Runs in the background on all clients. When haptics.active is true
// it triggers a continuous pattern (currently: heartbeat) at the given BPM.
// This should not disturb the rest of the experience: it's lightweight and non-blocking.
export default function HapticsManager() {
  const { haptics } = useRealtime();
  const timerRef = useRef(null);

  // Helper to stop any ongoing scheduled work and stop vibration
  const stopNow = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try { navigator.vibrate(0); } catch (_) {}
  };

  useEffect(() => {
    stopNow();

    if (!haptics?.active) return; // nothing to do
    if (!('vibrate' in navigator)) return; // unsupported device

    const bpm = Math.max(50, Math.min(160, Number(haptics.bpm) || 60));
    const pattern = String(haptics.pattern || 'heartbeat');
    const beatMs = Math.round(60000 / bpm);

    // One heartbeat cycle: two short taps (lub-dub)
    // Keep total pattern duration << beat interval to avoid overlap.
    const doHeartbeat = () => {
      try {
        // Shape durations a little with bpm so it feels natural
        // Faster bpm -> slightly shorter taps and gap
        const speed = (bpm - 50) / (160 - 50); // 0..1
        const tap1 = Math.max(15, Math.round(28 - 8 * speed)); // ~28..20ms
        const gap = Math.max(30, Math.round(80 - 30 * speed)); // ~80..50ms
        const tap2 = Math.max(20, Math.round(38 - 10 * speed)); // ~38..28ms
        navigator.vibrate([tap1, gap, tap2]);
      } catch (_) {
        // ignore
      }
    };

    if (pattern === 'heartbeat') {
      // Fire immediately, then repeat every beat
      doHeartbeat();
      timerRef.current = setInterval(doHeartbeat, beatMs);
    } else {
      // Future patterns can be added here; for now, default to heartbeat
      doHeartbeat();
      timerRef.current = setInterval(doHeartbeat, beatMs);
    }

    return () => stopNow();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haptics.active, haptics.pattern, haptics.bpm, haptics.ts]);

  return null; // no UI
}
