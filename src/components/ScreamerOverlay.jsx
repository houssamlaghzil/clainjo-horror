import React, { useEffect, useMemo, useRef } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import screamImg1 from '../assets/88463959-b331-4a6a-b9ee-9843ec1a9229-1665760464118.png';
import screamImg2 from '../assets/ab67616d00001e029ae6150575a2dafd89f0fc1a.jpeg';
import screamAudio from '../assets/CRWDPanic_Hurlement de deux enfants 2 (ID 1680)_LS.mp3';

// ==== Tunable globals for ScreamerOverlay ====
// Intensity defaults
const DEFAULT_INTENSITY = 0.8;

// Audio volume curve (final volume = clamp(0..1, BASE + intensity * RANGE))
const AUDIO_VOL_BASE = 0.6;
const AUDIO_VOL_RANGE = 0.4; // so 0.6..1.0

// Vibration pattern parameters
const VIB_ON_MIN_MS = 20;     // minimum ON duration
const VIB_ON_RANGE_MS = 50;   // added up to +50ms as intensity -> 1
const VIB_OFF_MAX_MS = 40;    // maximum OFF duration at low intensity
const VIB_OFF_RANGE_MS = 25;  // subtracted up to -25ms as intensity -> 1
const VIB_BURSTS_MIN = 20;    // minimum pulses
const VIB_BURSTS_RANGE = 30;  // added pulses as intensity -> 1

// Auto dismiss overlay timing
const DISMISS_BASE_MS = 1800;
const DISMISS_RANGE_MS = 2200; // added by intensity 0..1

// WebAudio synthesis parameters
const OSC1_TYPE = 'square';
const OSC1_FREQ_BASE = 380;   // Hz
const OSC1_FREQ_RANGE = 280;  // Hz added with intensity
const OSC1_GAIN = 0.7;

const OSC2_TYPE = 'sawtooth';
const OSC2_FREQ_BASE = 200;   // Hz
const OSC2_FREQ_RANGE = 220;  // Hz
const OSC2_DETUNE = 1200;     // cents (+1 octave)
const OSC2_GAIN = 0.4;

const NOISE_SECONDS = 2;      // buffer length in seconds
const NOISE_FILTER_TYPE = 'highpass';
const NOISE_FILTER_FREQ_BASE = 800;  // Hz
const NOISE_FILTER_FREQ_RANGE = 2000;// Hz
const NOISE_GAIN_BASE = 0.25;
const NOISE_GAIN_RANGE = 0.35;

// ==== Screamer catalog ====
const SCREAMERS = {
  // Defaults wired to src/assets (imported via Vite)
  default:  { bg: '#000', color: '#fff', text: '!!!',      image: screamImg1, soundUrl: screamAudio },
  ghost:    { bg: '#000', color: '#7ff', text: 'GHOST',    image: screamImg1, soundUrl: screamAudio },
  shriek:   { bg: '#000', color: '#fff', text: 'SHRIEK',   image: screamImg2, soundUrl: screamAudio },
  heartbeat:{ bg: '#000', color: '#f33', text: 'HEARTBEAT',image: screamImg2, soundUrl: screamAudio },
};

export default function ScreamerOverlay() {
  const { screamer, setScreamer } = useRealtime();
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const stopNodesRef = useRef(() => {});

  const style = useMemo(() => {
    if (!screamer) return null;
    const conf = SCREAMERS[screamer.id] || SCREAMERS.default;
    return conf;
  }, [screamer]);

  // Build a vibration pattern based on intensity [0..1]
  const vibrate = (intensity = 0.7) => {
    try {
      if (!('vibrate' in navigator)) return;
      const i = Math.max(0, Math.min(1, intensity));
      // More intense => more pulses and longer durations
      const baseOn = VIB_ON_MIN_MS + Math.round(i * VIB_ON_RANGE_MS);
      const baseOff = VIB_OFF_MAX_MS - Math.round(i * VIB_OFF_RANGE_MS);
      const bursts = VIB_BURSTS_MIN + Math.round(i * VIB_BURSTS_RANGE);
      const pattern = [];
      for (let b = 0; b < bursts; b++) {
        pattern.push(baseOn, baseOff);
      }
      navigator.vibrate(pattern);
    } catch (_) {
      // ignore
    }
  };

  const stopAll = () => {
    try { navigator.vibrate(0); } catch (_) {}
    const a = audioRef.current;
    if (a) {
      try { a.pause(); a.currentTime = 0; } catch (_) {}
      audioRef.current = null;
    }
    if (stopNodesRef.current) {
      try { stopNodesRef.current(); } catch (_) {}
      stopNodesRef.current = () => {};
    }
    setScreamer(null);
  };

  // Try to play a screamer sound – from provided URL, else WebAudio fallback (oscillator/noise)
  const playSound = async (intensity = 0.8, url) => {
    const vol = Math.max(0, Math.min(1, AUDIO_VOL_BASE + intensity * AUDIO_VOL_RANGE));
    if (url) {
      try {
        const audio = new Audio(url);
        audio.volume = vol;
        audioRef.current = audio;
        await audio.play();
        return;
      } catch (_) {
        // Fallback to WebAudio
      }
    }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const master = ctx.createGain();
      master.gain.value = vol;
      master.connect(ctx.destination);

      // Build a harsh sound: detuned oscillators + noise burst
      const osc1 = ctx.createOscillator();
      osc1.type = OSC1_TYPE;
      osc1.frequency.value = OSC1_FREQ_BASE + intensity * OSC1_FREQ_RANGE;
      const o1g = ctx.createGain(); o1g.gain.value = OSC1_GAIN;
      osc1.connect(o1g).connect(master);

      const osc2 = ctx.createOscillator();
      osc2.type = OSC2_TYPE;
      osc2.frequency.value = OSC2_FREQ_BASE + intensity * OSC2_FREQ_RANGE;
      osc2.detune.value = OSC2_DETUNE; // cents
      const o2g = ctx.createGain(); o2g.gain.value = OSC2_GAIN;
      osc2.connect(o2g).connect(master);

      // Noise
      const bufferSize = NOISE_SECONDS * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = NOISE_FILTER_TYPE;
      noiseFilter.frequency.value = NOISE_FILTER_FREQ_BASE + intensity * NOISE_FILTER_FREQ_RANGE;
      const ng = ctx.createGain(); ng.gain.value = NOISE_GAIN_BASE + intensity * NOISE_GAIN_RANGE;
      noise.connect(noiseFilter).connect(ng).connect(master);

      osc1.start();
      osc2.start();
      noise.start();

      // Auto stop nodes helper
      stopNodesRef.current = () => {
        try { osc1.stop(); osc1.disconnect(); } catch (_) {}
        try { osc2.stop(); osc2.disconnect(); } catch (_) {}
        try { noise.stop(); noise.disconnect(); } catch (_) {}
        try { master.disconnect(); } catch (_) {}
        try { ctx.close(); } catch (_) {}
      };
    } catch (_) {
      // give up silently
    }
  };

  useEffect(() => {
    if (!screamer) return;
    // Start audio and vibration immediately
    const intensity = typeof screamer.intensity === 'number' ? screamer.intensity : DEFAULT_INTENSITY;
    const conf = SCREAMERS[screamer.id] || SCREAMERS.default;
    playSound(intensity, screamer.soundUrl || conf.soundUrl);
    vibrate(intensity);

    // Auto dismiss after a duration based on intensity (still allow manual stop)
    const ms = DISMISS_BASE_MS + Math.floor(intensity * DISMISS_RANGE_MS);
    const t = setTimeout(() => stopAll(), ms);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screamer]);

  if (!screamer || !style) return null;

  return (
    <div
      onClick={stopAll}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: style.bg,
        color: style.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, fontWeight: 900,
        overflow: 'hidden',
      }}
    >
      {/* Image or big text */}
      {style.image ? (
        <img
          src={screamer.imageUrl || style.image}
          alt={screamer.id}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'cover',
            width: '100%',
            height: '100%',
            filter: 'contrast(1.1) saturate(0.95) brightness(0.95)',
          }}
        />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div>{style.text}</div>
        </div>
      )}

      {/* Immediate stop hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 0.5,
          textShadow: '0 0 8px rgba(0,0,0,0.8), 0 0 18px rgba(227,6,44,0.35)',
        }}
      >
        (Appuyez pour arrêter)
      </div>
    </div>
  );
}
