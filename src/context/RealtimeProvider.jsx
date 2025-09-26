import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toggleTorchOnTrack, isTorchSupportedOnTrack, playStreamInHiddenVideo } from '../utils/torch.js';
import { io } from 'socket.io-client';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [role, setRole] = useState('player');
  const [name, setName] = useState('');
  const STORAGE_KEY = 'clainjo.session.v1';

  const saveSession = useCallback((payload) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }, []);

  // Player: local flash test without MJ (short pulse)
  const testTorchLocal = useCallback(async () => {
    try {
      const track = torchTrackRef.current;
      if (!track) return { ok: false, reason: 'no-track' };
      const ok = await toggleTorchOnTrack(track, true);
      if (ok) {
        setTorchActive(true);
        await new Promise((r) => setTimeout(r, 320));
        await toggleTorchOnTrack(track, false);
        setTorchActive(false);
        return { ok: true, mode: 'native' };
      }
      // fallback pulse
      let ov = torchOverlayRef.current;
      if (!ov) {
        ov = document.createElement('div');
        Object.assign(ov.style, { position: 'fixed', inset: '0', background: '#ffffff', opacity: '0', transition: 'opacity 60ms linear', zIndex: '2147483647', pointerEvents: 'none' });
        document.body.appendChild(ov);
        torchOverlayRef.current = ov;
      }
      ov.style.display = 'block'; requestAnimationFrame(() => { ov.style.opacity = '1'; });
      try { if (navigator.vibrate) navigator.vibrate([30, 20, 30]); } catch (_) {}
      await new Promise((r) => setTimeout(r, 320));
      ov.style.opacity = '0'; setTimeout(() => { ov.style.display = 'none'; }, 80);
      return { ok: true, mode: 'fallback' };
    } catch (e) {
      return { ok: false, reason: 'error' };
    }
  }, []);

  const loadSession = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }, []);

  const clearSession = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }, []);

  // character state
  const [hp, setHp] = useState(10);
  const [money, setMoney] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [strength, setStrength] = useState(0);
  const [intelligence, setIntelligence] = useState(0);
  const [agility, setAgility] = useState(0);
  const [skills, setSkills] = useState([]);

  // presence & logs
  const [players, setPlayers] = useState([]);
  const [gms, setGms] = useState([]);
  const [diceLog, setDiceLog] = useState([]);
  const [chat, setChat] = useState([]);
  const [serverVersion, setServerVersion] = useState('');
  const [hintBubble, setHintBubble] = useState(null); // { id, kind, value?, contentType?, expiresAt }
  const [hintContent, setHintContent] = useState(null); // { id, contentType: 'text'|'image'|'pdf', text?, url? }
  // background haptics (e.g., heartbeat)
  const [haptics, setHaptics] = useState({ active: false, pattern: null, bpm: null, ts: 0 });
  // my socket id
  const [myId, setMyId] = useState('');

  // Wizard Battle state
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardRound, setWizardRound] = useState(0);
  const [wizardLocked, setWizardLocked] = useState(false);
  const [wizardGroupsCount, setWizardGroupsCount] = useState(0);
  const [wizardResolving, setWizardResolving] = useState(false);
  const [wizardAIResult, setWizardAIResult] = useState(null); // GM only
  const [wizardAIError, setWizardAIError] = useState(null); // { message, canRetry }
  const [wizardMyResult, setWizardMyResult] = useState(null); // player-only last result
  const [statusSummary, setStatusSummary] = useState(null); // { diceMod, narrative, hpDelta }

  // screamer UI
  const [screamer, setScreamer] = useState(null); // { id, intensity, imageUrl?, soundUrl?, ts }
  const lastJoinKeyRef = useRef('');

  // Torch (flash) state
  const torchStreamRef = useRef(null); // MediaStream
  const torchTrackRef = useRef(null);  // MediaStreamTrack (video)
  const [torchSupported, setTorchSupported] = useState(false); // player-side capability
  const [torchActive, setTorchActive] = useState(false); // last requested state (best-effort)
  const [gmTorchLog, setGmTorchLog] = useState([]); // GM-side log entries
  const [torchSupportedMap, setTorchSupportedMap] = useState({}); // GM view: { socketId: boolean }
  const [torchMeta, setTorchMeta] = useState({}); // GM view: { socketId: { supported, settings, capabilities, constraints, ua, secure, note, ts } }
  const torchVideoElRef = useRef(null); // hidden <video> to keep pipeline alive
  const torchOverlayRef = useRef(null); // fallback white overlay element
  // Camera selection & lens control
  const [cameraDevices, setCameraDevices] = useState([]); // Array<{ deviceId, label, facing: 'front'|'environment'|'unknown' }>
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [zoomCap, setZoomCap] = useState(null); // { min, max, step } or null

  // lazy-connect socket
  useEffect(() => {
    // In production (served by the same Express app), connect to same-origin.
    // In development, use Vite env VITE_SOCKET_URL if provided, otherwise localhost:4000.
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const socketUrl = import.meta.env.PROD ? undefined : (import.meta.env.VITE_SOCKET_URL || `http://${host}:4000`);
    const s = io(socketUrl); // allow default transports (polling + ws upgrade)
    socketRef.current = s;

    s.on('connect', () => {
      setConnected(true);
      // Auto-restore session data if none in state
      const sess = loadSession();
      if (sess && !roomId) {
        const { roomId: r, role: ro, name: nm, hp: hp0 = 10, money: m0 = 0, inventory: inv0 = [], strength: s0 = 0, intelligence: iq0 = 0, agility: ag0 = 0, skills: sk0 = [] } = sess;
        if (r && ro && nm) {
          setRoomId(r); setRole(ro); setName(nm);
          setHp(hp0); setMoney(m0); setInventory(inv0);
          setStrength(s0); setIntelligence(iq0); setAgility(ag0); setSkills(Array.isArray(sk0) ? sk0 : []);
        }
      }
    });
    s.on('disconnect', () => {
      setConnected(false);
      // Clear any transient hint UI on connection loss to avoid stale bubbles/modals
      setHintBubble(null);
      setHintContent(null);
    });

    // server meta (version, etc.)
    s.on('server:meta', ({ version }) => {
      if (version) setServerVersion(version);
    });

    // presence
    s.on('presence:update', (payload) => {
      const ps = payload.players || [];
      setPlayers(ps);
      setGms(payload.gms || []);
      // If we know our socketId, sync our own character fields to reflect GM edits
      if (myId) {
        const me = ps.find((p) => p.socketId === myId);
        if (me) {
          if (typeof me.hp === 'number') setHp(me.hp);
          if (typeof me.money === 'number') setMoney(me.money);
          if (Array.isArray(me.inventory)) setInventory(me.inventory);
          if (typeof me.strength === 'number') setStrength(me.strength);
          if (typeof me.intelligence === 'number') setIntelligence(me.intelligence);
          if (typeof me.agility === 'number') setAgility(me.agility);
          if (Array.isArray(me.skills)) setSkills(me.skills);
        }
      }
    });

    // init state
    s.on('state:init', (payload) => {
      if (payload.players) setPlayers(payload.players);
      if (payload.gms) setGms(payload.gms);
      if (payload.diceLog) setDiceLog(payload.diceLog);
      if (payload.you) {
        const y = payload.you;
        if (y.socketId) setMyId(y.socketId);
        if (typeof y.hp === 'number') setHp(y.hp);
        if (typeof y.money === 'number') setMoney(y.money);
        if (Array.isArray(y.inventory)) setInventory(y.inventory);
        if (typeof y.strength === 'number') setStrength(y.strength);
        if (typeof y.intelligence === 'number') setIntelligence(y.intelligence);
        if (typeof y.agility === 'number') setAgility(y.agility);
        if (Array.isArray(y.skills)) setSkills(y.skills);
      }
    });

    // chat
    s.on('chat:message', (msg) => setChat((c) => [...c, msg]));

    // dice
    s.on('dice:result', (res) => setDiceLog((d) => [...d, res]));

    // screamer
    s.on('screamer:trigger', ({ id = 'default', intensity = 0.8, imageUrl, soundUrl }) => {
      // Let ScreamerOverlay handle audio + haptics centrally
      setScreamer({ id, intensity, imageUrl, soundUrl, ts: Date.now() });
    });

    // haptics control (GM -> players)
    s.on('haptics:start', ({ pattern = 'heartbeat', bpm = 60 }) => {
      const b = Math.max(50, Math.min(160, Number(bpm) || 60));
      setHaptics({ active: true, pattern, bpm: b, ts: Date.now() });
    });
    s.on('haptics:stop', () => {
      setHaptics({ active: false, pattern: null, bpm: null, ts: Date.now() });
      try { navigator.vibrate(0); } catch (_) {}
    });

    // hint bubble notification from server (GM -> player)
    s.on('hint:notify', ({ id, kind = 'bonus', value = 0, durationMs = 5000, contentType }) => {
      const expiresAt = Date.now() + Math.max(1000, Number(durationMs));
      // Receiving a new notification invalidates any previous open content
      setHintContent(null);
      if (kind === 'info') {
        setHintBubble({ id, kind: 'info', contentType: contentType || 'text', expiresAt });
      } else {
        setHintBubble({ id, kind, value: Number(value || 0), expiresAt });
      }
    });

    // one-time hint content payload; emitted after we request open
    s.on('hint:content', (payload) => {
      // payload: { id, contentType, text?, url? }
      setHintContent(payload || null);
    });

    // Torch events
    // Player receives set commands
    s.on('torch:set', async ({ on }) => {
      try {
        const track = torchTrackRef.current;
        if (!track) {
          s.emit('torch:status', { roomId, ok: false, message: 'no-track' });
          return;
        }
        const ok = await toggleTorchOnTrack(track, !!on);
        if (ok) {
          setTorchActive(!!on);
          s.emit('torch:status', { roomId, ok: true });
          return;
        }
        // Fallback: emulate flash (white overlay + vibrate + optional click sound)
        // Create overlay if missing
        let ov = torchOverlayRef.current;
        if (!ov) {
          ov = document.createElement('div');
          Object.assign(ov.style, { position: 'fixed', inset: '0', background: '#ffffff', opacity: '0', transition: 'opacity 60ms linear', zIndex: '2147483647', pointerEvents: 'none' });
          document.body.appendChild(ov);
          torchOverlayRef.current = ov;
        }
        if (on) {
          ov.style.display = 'block';
          // small raf to ensure paint
          requestAnimationFrame(() => { ov.style.opacity = '1'; });
          try { if (navigator.vibrate) navigator.vibrate([30, 20, 30]); } catch (_) {}
          // soft beep (may be blocked without user gesture)
          try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
              const ctx = new AC();
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.type = 'square'; o.frequency.value = 880;
              g.gain.value = 0.05; o.connect(g); g.connect(ctx.destination);
              o.start(); o.stop(ctx.currentTime + 0.08);
            }
          } catch (_) {}
          setTorchActive(true);
          s.emit('torch:status', { roomId, ok: true, message: 'fallback' });
        } else {
          ov.style.opacity = '0';
          setTimeout(() => { ov.style.display = 'none'; }, 80);
          try { if (navigator.vibrate) navigator.vibrate(0); } catch (_) {}
          setTorchActive(false);
          s.emit('torch:status', { roomId, ok: true, message: 'fallback' });
        }
      } catch (err) {
        console.error('[torch] set handler failed', err);
        try { s.emit('torch:status', { roomId, ok: false, message: 'error' }); } catch (_) {}
      }
    });
    // Player: run a local torch test (short ON then OFF)
    s.on('torch:test', async () => {
      try {
        const track = torchTrackRef.current;
        if (!track) { s.emit('torch:status', { roomId, ok: false, message: 'test-no-track' }); return; }
        const ok = await toggleTorchOnTrack(track, true);
        if (ok) {
          setTorchActive(true);
          setTimeout(async () => { await toggleTorchOnTrack(track, false); setTorchActive(false); s.emit('torch:status', { roomId, ok: true, message: 'test-ok' }); }, 320);
        } else {
          // fallback short pulse
          let ov = torchOverlayRef.current;
          if (!ov) {
            ov = document.createElement('div');
            Object.assign(ov.style, { position: 'fixed', inset: '0', background: '#ffffff', opacity: '0', transition: 'opacity 60ms linear', zIndex: '2147483647', pointerEvents: 'none' });
            document.body.appendChild(ov);
            torchOverlayRef.current = ov;
          }
          ov.style.display = 'block'; requestAnimationFrame(() => { ov.style.opacity = '1'; });
          try { if (navigator.vibrate) navigator.vibrate([30, 20, 30]); } catch (_) {}
          try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
              const ctx = new AC();
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.type = 'square'; o.frequency.value = 880;
              g.gain.value = 0.05; o.connect(g); g.connect(ctx.destination);
              o.start(); o.stop(ctx.currentTime + 0.08);
            }
          } catch (_) {}
          setTimeout(() => { ov.style.opacity = '0'; setTimeout(() => { ov.style.display = 'none'; }, 80); s.emit('torch:status', { roomId, ok: true, message: 'test-fallback' }); }, 320);
        }
      } catch (e) {
        s.emit('torch:status', { roomId, ok: false, message: 'test-error' });
      }
    });
    // GM receives capability updates (detailed)
    s.on('torch:support', (payload) => {
      const { socketId, supported } = payload || {};
      if (!socketId) return;
      setTorchSupportedMap((m) => ({ ...m, [socketId]: !!supported }));
      setTorchMeta((m) => ({ ...m, [socketId]: { ...payload, supported: !!supported } }));
    });
    // GM log entries
    s.on('torch:log', ({ at, target, action }) => {
      setGmTorchLog((logs) => [{ at, target, action }, ...logs].slice(0, 200));
    });
    // GM sees status acks
    s.on('torch:status', ({ from, ok, message }) => {
      const action = ok ? (message ? `ACK:${message}` : 'ACK') : `ERR:${message||''}`;
      setGmTorchLog((logs) => [{ at: new Date().toLocaleTimeString(), target: from, action }, ...logs].slice(0, 200));
    });

    // Wizard Battle events
    s.on('wizard:state', (st) => {
      setWizardActive(Boolean(st?.active));
      setWizardRound(Number(st?.round || 0));
      setWizardGroupsCount(Number(st?.groupsCount || 0));
      // If my socket is in locked list, lock UI
      const me = socketRef.current?.id;
      const locked = Array.isArray(st?.locked) && me ? st.locked.includes(me) : false;
      setWizardLocked(locked);
      setWizardResolving(false);
    });
    s.on('wizard:locked', () => setWizardLocked(true));
    s.on('wizard:round:resolving', () => setWizardResolving(true));
    s.on('wizard:aiResult', (payload) => { setWizardAIResult(payload); setWizardAIError(null); setWizardResolving(false); });
    s.on('wizard:aiError', (err) => { setWizardAIError(err); setWizardAIResult(null); setWizardResolving(false); });
    s.on('wizard:published', () => { setWizardAIResult(null); setWizardAIError(null); setWizardResolving(false); setWizardLocked(false); });
    s.on('wizard:results', (res) => { setWizardMyResult(res); setStatusSummary({ diceMod: res?.diceMod || 0, narrative: res?.narrative || '', hpDelta: res?.hpDelta || 0 }); setWizardResolving(false); });
    s.on('wizard:info', (payload) => { setWizardAIResult(payload); });

    return () => {
      s.close();
    };
  }, [loadSession, roomId]);

  const join = useCallback(({ roomId, role, name, hp = 10, money = 0, inventory = [], strength = 0, intelligence = 0, agility = 0, skills = [] }) => {
    setRoomId(roomId);
    setRole(role);
    setName(name);
    setHp(hp);
    setMoney(money);
    setInventory(inventory);
    setStrength(strength);
    setIntelligence(intelligence);
    setAgility(agility);
    setSkills(skills);
    // persist session for reload-resume
    saveSession({ roomId, role, name, hp, money, inventory, strength, intelligence, agility, skills });
    // Immediate emit if already connected; otherwise the effect below will handle it
    if (socketRef.current?.connected) {
      socketRef.current.emit('join', { roomId, role, name, hp, money, inventory, strength, intelligence, agility, skills });
      lastJoinKeyRef.current = `${roomId}|${role}|${name}`;
    }
  }, [saveSession]);

  // Ensure join is emitted once connected and identity is ready (handles race at first connect)
  useEffect(() => {
    const s = socketRef.current;
    if (!s || !s.connected) return;
    if (!roomId || !role || !name) return;
    const key = `${roomId}|${role}|${name}`;
    if (lastJoinKeyRef.current === key) return; // already emitted for this identity
    s.emit('join', { roomId, role, name, hp, money, inventory, strength, intelligence, agility, skills });
    lastJoinKeyRef.current = key;
  }, [connected, roomId, role, name, hp, money, inventory, strength, intelligence, agility, skills]);

  // Helper to ensure we have emitted join for the current identity
  const ensureJoin = useCallback(() => {
    const s = socketRef.current;
    if (!s || !s.connected) return;
    if (!roomId || !role || !name) return;
    const key = `${roomId}|${role}|${name}`;
    if (lastJoinKeyRef.current === key) return false;
    s.emit('join', { roomId, role, name, hp, money, inventory, strength, intelligence, agility, skills });
    lastJoinKeyRef.current = key;
    return true;
  }, [roomId, role, name, hp, money, inventory, strength, intelligence, agility, skills]);

  const sendChat = useCallback(({ text, to }) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('chat:message', { roomId, text, from: name, to });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, name, ensureJoin]);

  const rollDice = useCallback(({ sides = 6, count = 1, label }) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('dice:roll', { roomId, sides, count, label });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  // GM: request a local torch test on targets
  const gmTestTorch = useCallback(({ targets = 'all' } = {}) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('torch:test', { roomId, targets });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  // Player: start/stop torch session (camera permission + capability check)
  const startTorchSession = useCallback(async (opts = {}) => {
    try {
      if (!roomId) return false;
      const justJoined = ensureJoin();
      if (justJoined) await new Promise((r) => setTimeout(r, 60));
      if (torchStreamRef.current) return true; // already
      const { deviceId: deviceIdPref, facingMode: facingPref } = opts || {};
      let stream = await navigator.mediaDevices.getUserMedia({
        video: deviceIdPref ? { deviceId: { exact: deviceIdPref }, width: { ideal: 1280 }, height: { ideal: 720 } } : { facingMode: { ideal: facingPref || 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      torchStreamRef.current = stream;
      torchTrackRef.current = track;
      // Attach to hidden <video> to ensure pipeline active
      try { torchVideoElRef.current = await playStreamInHiddenVideo(stream, torchVideoElRef.current); } catch (_) {}
      // Ensure back camera: if settings don't indicate environment, try re-select via deviceId
      let settings = typeof track.getSettings === 'function' ? track.getSettings() : {};
      setSelectedCameraId(settings?.deviceId || null);
      if (settings?.facingMode && settings.facingMode !== 'environment') {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const backs = devices.filter((d) => d.kind === 'videoinput' && /back|rear|environment/i.test(d.label || ''));
          if (backs.length) {
            const devId = backs[0].deviceId;
            // stop previous
            try { stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
            stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: devId }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
            const tr = stream.getVideoTracks()[0];
            torchStreamRef.current = stream;
            torchTrackRef.current = tr;
            try { torchVideoElRef.current = await playStreamInHiddenVideo(stream, torchVideoElRef.current); } catch (_) {}
            settings = typeof tr.getSettings === 'function' ? tr.getSettings() : {};
            setSelectedCameraId(settings?.deviceId || null);
          }
        } catch (_) {}
      }
      // detect support (caps + optional ImageCapture)
      const supported = await isTorchSupportedOnTrack(torchTrackRef.current);
      setTorchSupported(!!supported);
      // collect debug meta
      const capabilities = typeof torchTrackRef.current?.getCapabilities === 'function' ? torchTrackRef.current.getCapabilities() : undefined;
      const constraints = typeof torchTrackRef.current?.getConstraints === 'function' ? torchTrackRef.current.getConstraints() : undefined;
      // update zoom capability if present
      if (capabilities && typeof capabilities.zoom !== 'undefined') {
        const z = capabilities.zoom; // may be number or {min,max,step}
        if (z && typeof z === 'object') setZoomCap({ min: z.min ?? 1, max: z.max ?? 1, step: z.step ?? 0.1 });
        else setZoomCap(null);
      } else {
        setZoomCap(null);
      }
      const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
      const secure = (typeof location !== 'undefined') ? (location.protocol === 'https:' || location.hostname === 'localhost') : false;
      const note = (torchVideoElRef.current && torchVideoElRef.current.paused) ? 'video-not-playing' : undefined;
      socketRef.current?.emit('torch:capability', { roomId, supported: !!supported, settings, capabilities, constraints, ua, secure, note });
      // refresh device catalog (labels become available after permission)
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const vids = devs.filter((d) => d.kind === 'videoinput').map((d) => ({ deviceId: d.deviceId, label: d.label || 'Caméra', facing: /front/i.test(d.label) ? 'front' : (/back|rear|environment/i.test(d.label) ? 'environment' : 'unknown') }));
        setCameraDevices(vids);
      } catch (_) {}
      return true;
    } catch (err) {
      console.error('[torch] start session failed', err);
      setTorchSupported(false);
      socketRef.current?.emit('torch:capability', { roomId, supported: false });
      return false;
    }
  }, [roomId, ensureJoin]);

  const stopTorchSession = useCallback(() => {
    try {
      const stream = torchStreamRef.current;
      if (stream) {
        for (const tr of stream.getTracks()) tr.stop();
      }
    } catch (_) {}
    torchStreamRef.current = null;
    torchTrackRef.current = null;
    setTorchActive(false);
    setTorchSupported(false);
    // Remove hidden video if present
    try {
      const v = torchVideoElRef.current; if (v && v.parentNode) v.parentNode.removeChild(v);
    } catch (_) {}
    torchVideoElRef.current = null;
    // Hide overlay if any
    try {
      const ov = torchOverlayRef.current; if (ov) ov.style.display = 'none';
    } catch (_) {}
    setCameraDevices([]);
    setSelectedCameraId(null);
    setZoomCap(null);
  }, []);

  // Refresh available video input devices (labels require prior permission)
  const refreshVideoDevices = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const vids = devs.filter((d) => d.kind === 'videoinput').map((d) => ({ deviceId: d.deviceId, label: d.label || 'Caméra', facing: /front/i.test(d.label) ? 'front' : (/back|rear|environment/i.test(d.label) ? 'environment' : 'unknown') }));
      setCameraDevices(vids);
      return vids;
    } catch (e) {
      return [];
    }
  }, []);

  // Switch camera to a specific deviceId
  const setCameraDevice = useCallback(async (deviceId) => {
    try {
      if (!deviceId) return false;
      // stop current
      try { torchStreamRef.current?.getTracks()?.forEach((t) => t.stop()); } catch (_) {}
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      const tr = stream.getVideoTracks()[0];
      torchStreamRef.current = stream;
      torchTrackRef.current = tr;
      setSelectedCameraId(deviceId);
      try { torchVideoElRef.current = await playStreamInHiddenVideo(stream, torchVideoElRef.current); } catch (_) {}
      // recompute support and caps
      const supported = await isTorchSupportedOnTrack(tr);
      setTorchSupported(!!supported);
      const settings = typeof tr.getSettings === 'function' ? tr.getSettings() : {};
      const capabilities = typeof tr.getCapabilities === 'function' ? tr.getCapabilities() : undefined;
      const constraints = typeof tr.getConstraints === 'function' ? tr.getConstraints() : undefined;
      if (capabilities && typeof capabilities.zoom !== 'undefined') {
        const z = capabilities.zoom; if (z && typeof z === 'object') setZoomCap({ min: z.min ?? 1, max: z.max ?? 1, step: z.step ?? 0.1 }); else setZoomCap(null);
      } else { setZoomCap(null); }
      const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
      const secure = (typeof location !== 'undefined') ? (location.protocol === 'https:' || location.hostname === 'localhost') : false;
      const note = (torchVideoElRef.current && torchVideoElRef.current.paused) ? 'video-not-playing' : undefined;
      socketRef.current?.emit('torch:capability', { roomId, supported: !!supported, settings, capabilities, constraints, ua, secure, note });
      return true;
    } catch (e) {
      console.warn('[torch] failed to switch camera', e);
      return false;
    }
  }, [roomId]);

  // Set zoom value if supported
  const setZoom = useCallback(async (value) => {
    try {
      const tr = torchTrackRef.current; if (!tr) return false;
      if (!zoomCap) return false;
      const v = Math.max(zoomCap.min, Math.min(zoomCap.max, value));
      await tr.applyConstraints({ advanced: [{ zoom: v }] });
      return true;
    } catch (e) { return false; }
  }, [zoomCap]);

  // Lens presets using zoom
  const applyLensPreset = useCallback(async (preset) => {
    if (!zoomCap) return false;
    const { min, max } = zoomCap;
    const mid = (min + max) / 2;
    if (preset === 'ultrawide') return setZoom(min);
    if (preset === 'tele') return setZoom(max);
    // 'wide' default or unknown
    return setZoom(mid);
  }, [zoomCap, setZoom]);

  // GM: update any player's character sheet
  const gmUpdatePlayer = useCallback(({ target, hp, money, inventory, strength, intelligence, agility, skills }) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('gm:player:update', { roomId, target, hp, money, inventory, strength, intelligence, agility, skills });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  const wizardGet = useCallback(() => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('wizard:get', { roomId });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  const updatePlayer = useCallback(({ hp, money, inventory, strength, intelligence, agility, skills }) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('player:update', { roomId, hp, money, inventory, strength, intelligence, agility, skills });
    if (justJoined) setTimeout(emit, 50); else emit();
    if (typeof hp === 'number') setHp(hp);
    if (typeof money === 'number') setMoney(money);
    if (Array.isArray(inventory)) setInventory(inventory);
    if (typeof strength === 'number') setStrength(strength);
    if (typeof intelligence === 'number') setIntelligence(intelligence);
    if (typeof agility === 'number') setAgility(agility);
    if (Array.isArray(skills)) setSkills(skills);
  }, [roomId, ensureJoin]);

  const sendScreamer = useCallback(({ targets = 'all', screamerId = 'default', intensity = 0.8, imageUrl, soundUrl }) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('screamer:send', { roomId, targets, screamerId, intensity, imageUrl, soundUrl });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  // GM: start/stop background haptics for selected players
  const sendHapticsStart = useCallback(({ targets = 'all', pattern = 'heartbeat', bpm = 60 }) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('haptics:start', { roomId, targets, pattern, bpm });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  const sendHapticsStop = useCallback(({ targets = 'all' } = {}) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('haptics:stop', { roomId, targets });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  // GM: send a hint to a single player (bonus/malus) or content (info)
  const sendHint = useCallback(({ target, kind = 'bonus', value = 0, durationMs = 5000, content } = {}) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('hint:send', { roomId, target, kind, value, durationMs, content });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  // Player: claim the current hint bubble
  const claimHint = useCallback(() => {
    if (!roomId || !hintBubble?.id) return;
    const snapshotId = hintBubble.id;
    const snapshotRoom = roomId;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('hint:claim', { roomId: snapshotRoom, hintId: snapshotId });
    if (justJoined) setTimeout(emit, 50); else emit();
    setHintBubble(null);
  }, [roomId, hintBubble, ensureJoin]);

  // Player: open a one-time content hint
  const openInfoHint = useCallback(() => {
    if (!roomId || !hintBubble?.id) return;
    const snapshotId = hintBubble.id;
    const snapshotRoom = roomId;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('hint:open', { roomId: snapshotRoom, hintId: snapshotId });
    if (justJoined) setTimeout(emit, 50); else emit();
    // hide the bubble immediately to prevent multiple clicks
    setHintBubble(null);
  }, [roomId, hintBubble, ensureJoin]);

  // Wizard Battle actions
  const wizardToggle = useCallback((active) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('wizard:toggle', { roomId, active });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  const wizardSubmit = useCallback((text) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('wizard:submit', { roomId, text });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  const wizardForce = useCallback(() => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('wizard:force', { roomId });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  const wizardRetry = useCallback(() => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('wizard:retry', { roomId });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  const wizardManual = useCallback((results) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('wizard:manual', { roomId, results });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  const wizardPublish = useCallback((results) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('wizard:publish', { roomId, results });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  // GM: toggle players' device torch (flash) ON/OFF
  const gmSetTorch = useCallback(({ targets = 'all', on = false } = {}) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('torch:set', { roomId, targets, on });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  const value = useMemo(() => ({
    // connection
    socket: socketRef.current,
    connected,

    // identity
    roomId, setRoomId,
    role, setRole,
    name, setName,

    // character
    hp, setHp,
    money, setMoney,
    inventory, setInventory,
    strength, setStrength,
    intelligence, setIntelligence,
    agility, setAgility,
    skills, setSkills,

    // presence & logs
    players,
    gms,
    diceLog,
    chat,

    // server info
    serverVersion,

    // screamer
    screamer, setScreamer,

    // haptics
    haptics,

    // torch (player)
    torchSupported,
    torchActive,
    startTorchSession,
    stopTorchSession,
    testTorchLocal,
    cameraDevices,
    selectedCameraId,
    refreshVideoDevices,
    setCameraDevice,
    zoomCap,
    setZoom,
    applyLensPreset,

    // torch (GM)
    gmSetTorch,
    gmTestTorch,
    gmTorchLog,
    torchSupportedMap,
    torchMeta,

    // hint bubble
    hintBubble, setHintBubble,
    hintContent, setHintContent,
    openInfoHint,

    // Wizard Battle
    wizardActive,
    wizardRound,
    wizardLocked,
    wizardGroupsCount,
    wizardResolving,
    wizardAIResult,
    wizardAIError,
    wizardMyResult,
    statusSummary,

    // actions
    join,
    sendChat,
    rollDice,
    updatePlayer,
    sendScreamer,
    sendHint,
    claimHint,
    wizardToggle,
    wizardSubmit,
    wizardForce,
    wizardRetry,
    wizardGet,
    wizardManual,
    wizardPublish,
    sendHapticsStart,
    sendHapticsStop,
    gmUpdatePlayer,
    clearSession,
  }), [connected, roomId, role, name, hp, money, inventory, strength, intelligence, agility, skills, players, gms, diceLog, chat, serverVersion, screamer, haptics, hintBubble, hintContent, wizardActive, wizardRound, wizardLocked, wizardGroupsCount, wizardResolving, wizardAIResult, wizardAIError, wizardMyResult, statusSummary, join, sendChat, rollDice, updatePlayer, sendScreamer, sendHint, claimHint, openInfoHint, wizardToggle, wizardSubmit, wizardForce, wizardRetry, wizardGet, wizardManual, wizardPublish, sendHapticsStart, sendHapticsStop, gmUpdatePlayer, startTorchSession, stopTorchSession, testTorchLocal, cameraDevices, selectedCameraId, refreshVideoDevices, setCameraDevice, zoomCap, setZoom, applyLensPreset, gmSetTorch, gmTestTorch, torchSupported, torchActive, gmTorchLog, torchSupportedMap, torchMeta]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}
