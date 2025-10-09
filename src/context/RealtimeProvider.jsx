import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Torch/camera features removed: define no-op helpers to keep legacy paths inert
async function toggleTorchOnTrack() { return false; }
async function isTorchSupportedOnTrack() { return false; }
async function playStreamInHiddenVideo() { return null; }

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

  // Player: local flash test without MJ (removed feature)
  const testTorchLocal = useCallback(async () => ({ ok: false, reason: 'removed' }), []);

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
  const [lucidity, setLucidity] = useState(0);
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

  // Torch/camera features removed

  // Zone selection (map)
  const [selectedZone, setSelectedZone] = useState('village');

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
      // Sync our own character fields to reflect GM edits.
      // Be resilient to reconnects by falling back to current socket id if myId is not set/stale.
      const sid = myId || s.id || socketRef.current?.id || '';
      if (sid) {
        const me = ps.find((p) => p.socketId === sid);
        if (me) {
          if (!myId) setMyId(sid);
          if (typeof me.hp === 'number') setHp(me.hp);
          if (typeof me.money === 'number') setMoney(me.money);
          if (Array.isArray(me.inventory)) setInventory(me.inventory);
          if (typeof me.strength === 'number') setStrength(me.strength);
          if (typeof me.intelligence === 'number') setIntelligence(me.intelligence);
          if (typeof me.agility === 'number') setAgility(me.agility);
          if (typeof me.lucidity === 'number') setLucidity(me.lucidity);
          if (Array.isArray(me.skills)) setSkills(me.skills);
        }
      }
    });

    // init state
    s.on('state:init', (payload) => {
      console.log('📥 state:init received from server:', payload.you);
      if (payload.players) setPlayers(payload.players);
      if (payload.gms) setGms(payload.gms);
      if (payload.diceLog) setDiceLog(payload.diceLog);
      if (payload.you) {
        const y = payload.you;
        if (y.socketId) setMyId(y.socketId);
        if (typeof y.hp === 'number') setHp(y.hp);
        if (typeof y.money === 'number') setMoney(y.money);
        if (Array.isArray(y.inventory)) {
          console.log('📦 Restoring inventory from server:', y.inventory.length, 'items');
          setInventory(y.inventory);
        }
        if (typeof y.strength === 'number') setStrength(y.strength);
        if (typeof y.intelligence === 'number') setIntelligence(y.intelligence);
        if (typeof y.agility === 'number') setAgility(y.agility);
        if (typeof y.lucidity === 'number') setLucidity(y.lucidity);
        if (Array.isArray(y.skills)) setSkills(y.skills);
      }
      if (payload.zone) setSelectedZone(String(payload.zone));
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

    // Torch/camera events removed

    // Zone updates
    s.on('zone:update', ({ zone }) => {
      if (zone) setSelectedZone(String(zone));
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

  // GM: request a local torch test on targets (removed feature)
  const gmTestTorch = useCallback(() => {}, []);

  // Player: start/stop torch session (removed feature)
  const startTorchSession = useCallback(async () => false, []);

  const stopTorchSession = useCallback(() => {}, []);

  // Refresh available video input devices (removed)
  const refreshVideoDevices = useCallback(async () => [], []);

  // Switch camera (removed)
  const setCameraDevice = useCallback(async () => false, []);

  // Set zoom (removed)
  const setZoom = useCallback(async () => false, []);

  // Lens presets (removed)
  const applyLensPreset = useCallback(async () => false, []);

  // GM: update any player's character sheet
  const gmUpdatePlayer = useCallback(({ target, hp, money, inventory, strength, intelligence, agility, skills, lucidity }) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('gm:player:update', { roomId, target, hp, money, inventory, strength, intelligence, agility, skills, lucidity });
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

  // GM: set current zone (map)
  const gmSetZone = useCallback((zone) => {
    if (!roomId) return;
    const z = String(zone || '').trim() || 'village';
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('zone:set', { roomId, zone: z });
    if (justJoined) setTimeout(emit, 50); else emit();
    // Optimistic update for GM UI
    setSelectedZone(z);
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

  const value = useMemo(() => ({
    // connection
    socket: socketRef.current,
    connected,

    // identity
    roomId, setRoomId,
    role, setRole,
    name, setName,
    myId,

    // character
    hp, setHp,
    money, setMoney,
    inventory, setInventory,
    strength, setStrength,
    intelligence, setIntelligence,
    agility, setAgility,
    lucidity, setLucidity,
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

    // hint bubble
    hintBubble, setHintBubble,
    hintContent, setHintContent,
    openInfoHint,

    // zone selection
    selectedZone,
    gmSetZone,

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
  }), [connected, roomId, role, name, myId, hp, money, inventory, strength, intelligence, agility, lucidity, skills, players, gms, diceLog, chat, serverVersion, screamer, haptics, hintBubble, hintContent, wizardActive, wizardRound, wizardLocked, wizardGroupsCount, wizardResolving, wizardAIResult, wizardAIError, wizardMyResult, statusSummary, join, sendChat, rollDice, updatePlayer, sendScreamer, sendHint, claimHint, openInfoHint, wizardToggle, wizardSubmit, wizardForce, wizardRetry, wizardGet, wizardManual, wizardPublish, sendHapticsStart, sendHapticsStop, gmUpdatePlayer, clearSession, selectedZone, gmSetZone]);

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
