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

    // actions
    join,
    sendChat,
    rollDice,
    updatePlayer,
    sendScreamer,
    clearSession,
  }), [connected, roomId, role, name, hp, money, inventory, players, gms, diceLog, chat, serverVersion, screamer, join, sendChat, rollDice, updatePlayer, sendScreamer]);

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
