import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [role, setRole] = useState('player');
  const [name, setName] = useState('');

  // character state
  const [hp, setHp] = useState(10);
  const [money, setMoney] = useState(0);
  const [inventory, setInventory] = useState([]);

  // presence & logs
  const [players, setPlayers] = useState([]);
  const [gms, setGms] = useState([]);
  const [diceLog, setDiceLog] = useState([]);
  const [chat, setChat] = useState([]);

  // screamer UI
  const [screamer, setScreamer] = useState(null); // { id, intensity, ts }

  // lazy-connect socket
  useEffect(() => {
    // In production (served by the same Express app), connect to same-origin.
    // In development, use Vite env VITE_SOCKET_URL if provided, otherwise localhost:4000.
    const socketUrl = import.meta.env.PROD ? undefined : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000');
    const s = io(socketUrl, { transports: ['websocket'] });
    socketRef.current = s;

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

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
    s.on('screamer:trigger', ({ id = 'default', intensity = 0.8 }) => {
      setScreamer({ id, intensity, ts: Date.now() });
      try {
        // haptics
        if (navigator.vibrate) {
          const pattern = intensity >= 0.9 ? [300, 150, 300, 150, 600] : intensity >= 0.6 ? [200, 100, 200, 100, 200] : [120, 80, 120];
          navigator.vibrate(pattern);
        }
        // audio tone
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = 440 + intensity * 440; // 440-880Hz
        g.gain.value = Math.min(0.2 + intensity * 0.2, 0.4);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        setTimeout(() => { o.stop(); ctx.close(); }, 1200 + intensity * 800);
      } catch (_e) {}
    });

    return () => {
      s.close();
    };
  }, []);

  const join = useCallback(({ roomId, role, name, hp = 10, money = 0, inventory = [] }) => {
    setRoomId(roomId);
    setRole(role);
    setName(name);
    setHp(hp);
    setMoney(money);
    setInventory(inventory);
    socketRef.current?.emit('join', { roomId, role, name, hp, money, inventory });
  }, []);

  const sendChat = useCallback(({ text, to }) => {
    if (!roomId) return;
    socketRef.current?.emit('chat:message', { roomId, text, from: name, to });
  }, [roomId, name]);

  const rollDice = useCallback(({ sides = 6, count = 1, label }) => {
    if (!roomId) return;
    socketRef.current?.emit('dice:roll', { roomId, sides, count, label });
  }, [roomId]);

  const updatePlayer = useCallback(({ hp, money, inventory }) => {
    if (!roomId) return;
    socketRef.current?.emit('player:update', { roomId, hp, money, inventory });
    if (typeof hp === 'number') setHp(hp);
    if (typeof money === 'number') setMoney(money);
    if (Array.isArray(inventory)) setInventory(inventory);
  }, [roomId]);

  const sendScreamer = useCallback(({ targets = 'all', screamerId = 'default', intensity = 0.8 }) => {
    if (!roomId) return;
    socketRef.current?.emit('screamer:send', { roomId, targets, screamerId, intensity });
  }, [roomId]);

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

    // screamer
    screamer, setScreamer,

    // actions
    join,
    sendChat,
    rollDice,
    updatePlayer,
    sendScreamer,
  }), [connected, roomId, role, name, hp, money, inventory, players, gms, diceLog, chat, screamer, join, sendChat, rollDice, updatePlayer, sendScreamer]);

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
