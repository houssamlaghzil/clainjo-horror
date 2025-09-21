import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

  // presence & logs
  const [players, setPlayers] = useState([]);
  const [gms, setGms] = useState([]);
  const [diceLog, setDiceLog] = useState([]);
  const [chat, setChat] = useState([]);
  const [serverVersion, setServerVersion] = useState('');
  const [hintBubble, setHintBubble] = useState(null); // { id, kind, value, expiresAt }

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
        const { roomId: r, role: ro, name: nm, hp: hp0 = 10, money: m0 = 0, inventory: inv0 = [] } = sess;
        if (r && ro && nm) {
          setRoomId(r); setRole(ro); setName(nm);
          setHp(hp0); setMoney(m0); setInventory(inv0);
        }
      }
    });
    s.on('disconnect', () => setConnected(false));

    // server meta (version, etc.)
    s.on('server:meta', ({ version }) => {
      if (version) setServerVersion(version);
    });

    // presence
    s.on('presence:update', (payload) => {
      setPlayers(payload.players || []);
      setGms(payload.gms || []);
    });

    // init state
    s.on('state:init', (payload) => {
      if (payload.players) setPlayers(payload.players);
      if (payload.gms) setGms(payload.gms);
      if (payload.diceLog) setDiceLog(payload.diceLog);
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

    // hint bubble notification from server (GM -> player)
    s.on('hint:notify', ({ id, kind = 'bonus', value = 0, durationMs = 5000 }) => {
      const expiresAt = Date.now() + Math.max(1000, Number(durationMs));
      setHintBubble({ id, kind, value: Number(value || 0), expiresAt });
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

  const join = useCallback(({ roomId, role, name, hp = 10, money = 0, inventory = [] }) => {
    setRoomId(roomId);
    setRole(role);
    setName(name);
    setHp(hp);
    setMoney(money);
    setInventory(inventory);
    // persist session for reload-resume
    saveSession({ roomId, role, name, hp, money, inventory });
    // Immediate emit if already connected; otherwise the effect below will handle it
    if (socketRef.current?.connected) {
      socketRef.current.emit('join', { roomId, role, name, hp, money, inventory });
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
    s.emit('join', { roomId, role, name, hp, money, inventory });
    lastJoinKeyRef.current = key;
  }, [connected, roomId, role, name, hp, money, inventory]);

  // Helper to ensure we have emitted join for the current identity
  const ensureJoin = useCallback(() => {
    const s = socketRef.current;
    if (!s || !s.connected) return;
    if (!roomId || !role || !name) return;
    const key = `${roomId}|${role}|${name}`;
    if (lastJoinKeyRef.current === key) return false;
    s.emit('join', { roomId, role, name, hp, money, inventory });
    lastJoinKeyRef.current = key;
    return true;
  }, [roomId, role, name, hp, money, inventory]);

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

  const wizardGet = useCallback(() => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('wizard:get', { roomId });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  const updatePlayer = useCallback(({ hp, money, inventory }) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('player:update', { roomId, hp, money, inventory });
    if (justJoined) setTimeout(emit, 50); else emit();
    if (typeof hp === 'number') setHp(hp);
    if (typeof money === 'number') setMoney(money);
    if (Array.isArray(inventory)) setInventory(inventory);
  }, [roomId, ensureJoin]);

  const sendScreamer = useCallback(({ targets = 'all', screamerId = 'default', intensity = 0.8, imageUrl, soundUrl }) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('screamer:send', { roomId, targets, screamerId, intensity, imageUrl, soundUrl });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  // GM: send a hint to a single player
  const sendHint = useCallback(({ target, kind = 'bonus', value = 0, durationMs = 5000 }) => {
    if (!roomId) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('hint:send', { roomId, target, kind, value, durationMs });
    if (justJoined) setTimeout(emit, 50); else emit();
  }, [roomId, ensureJoin]);

  // Player: claim the current hint bubble
  const claimHint = useCallback(() => {
    if (!roomId || !hintBubble?.id) return;
    const justJoined = ensureJoin();
    const emit = () => socketRef.current?.emit('hint:claim', { roomId, hintId: hintBubble.id });
    if (justJoined) setTimeout(emit, 50); else emit();
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

    // character
    hp, setHp,
    money, setMoney,
    inventory, setInventory,

    // presence & logs
    players,
    gms,
    diceLog,
    chat,

    // server info
    serverVersion,

    // screamer
    screamer, setScreamer,

    // hint bubble
    hintBubble, setHintBubble,

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
    clearSession,
  }), [connected, roomId, role, name, hp, money, inventory, players, gms, diceLog, chat, serverVersion, screamer, hintBubble, wizardActive, wizardRound, wizardLocked, wizardGroupsCount, wizardResolving, wizardAIResult, wizardAIError, wizardMyResult, statusSummary, join, sendChat, rollDice, updatePlayer, sendScreamer, sendHint, claimHint, wizardToggle, wizardSubmit, wizardForce, wizardRetry, wizardManual, wizardPublish]);

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
