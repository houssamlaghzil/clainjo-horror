import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const PORT = process.env.PORT || 4000;

// ---- Config constants (tunable)
const DICE_MAX_HISTORY = 200;
const DICE_MAX_COUNT = 100;
const SCREAMER_DEFAULT_ID = 'default';
const SCREAMER_DEFAULT_INTENSITY = 0.8;
const AUTO_SCREAMER_INTENSITY_FAIL = 0.7;    // on d20 critical fail
const AUTO_SCREAMER_INTENSITY_SUCCESS = 0.9; // on d20 critical success
const HINT_DURATION_MS_DEFAULT = 5000;       // how long the bubble stays clickable
const HINT_MALUS_SCREAMER_ID = SCREAMER_DEFAULT_ID; // screamer shown on malus claim
const HINT_MALUS_SCREAMER_INTENSITY = SCREAMER_DEFAULT_INTENSITY;

const app = express();
// CORS: dev accepts any origin (LAN access), prod typically same-origin inside container
const isProd = process.env.NODE_ENV === 'production';
app.use(cors(isProd ? undefined : {
  origin: true, // reflect request origin in dev to allow LAN devices
  methods: ['GET', 'POST'],
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: isProd ? undefined : {
    origin: true, // allow any dev origin (Vite served over LAN)
    methods: ['GET', 'POST'],
  },
  // Use defaults: polling + websocket upgrade for better compatibility
});

// Serve frontend build in production (single container)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// App version: prefer env, fallback to version.txt written at build time, else 'dev-local'
function readBuiltVersion() {
  try {
    const p = path.join(__dirname, '../version.txt');
    return fs.readFileSync(p, 'utf8').trim();
  } catch (_) {
    return null;
  }
}
const APP_VERSION = process.env.APP_VERSION || readBuiltVersion() || 'dev-local';

// Simple version endpoint (useful for probes/UI)
app.get('/api/version', (_req, res) => {
  res.json({ version: APP_VERSION });
});

// In-memory state (for dev/demo). In prod, use a DB or state service.
const rooms = new Map(); // roomId -> { players: Map<socketId, player>, gm: Set<socketId>, diceLog: [] }
const socketToRoom = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      players: new Map(),
      gms: new Set(),
      diceLog: [],
      // pendingHints: per-socket map of unclaimed hints with expiry
      pendingHints: new Map(), // socketId -> Map<hintId, { kind, value, expiresAt }>
      // modifiers to apply on next dice roll for a player
      modifiers: new Map(), // socketId -> Array<{ kind: 'bonus'|'malus', value: number, id: string }>
    });
  }
  return rooms.get(roomId);
}

function sanitizePublicPlayer(p) {
  // limit data exposed to other players
  const { socketId, name, hp = 0, money = 0, inventory = [], role = 'player' } = p;
  return { socketId, name, hp, money, inventory, role };
}

io.on('connection', (socket) => {
  // announce server meta including version
  socket.emit('server:meta', { version: APP_VERSION });
  // Client sends join with metadata
  socket.on('join', ({ roomId, role, name, hp = 0, money = 0, inventory = [] }) => {
    if (!roomId || !role || !name) return;
    const room = getOrCreateRoom(roomId);

    socket.join(roomId);
    socketToRoom.set(socket.id, roomId);

    const player = { socketId: socket.id, role, name, hp, money, inventory };

    if (role === 'gm') {
      room.gms.add(socket.id);
    } else {
      room.players.set(socket.id, player);
    }

    // notify others
    io.to(roomId).emit('presence:update', {
      players: Array.from(room.players.values()).map(sanitizePublicPlayer),
      gms: Array.from(room.gms.values()),
    });

    // send initial state to the new client
    socket.emit('state:init', {
      you: player,
      players: Array.from(room.players.values()).map(sanitizePublicPlayer),
      gms: Array.from(room.gms.values()),
      diceLog: room.diceLog,
    });
  });

  // Chat
  socket.on('chat:message', ({ roomId, text, from, to }) => {
    if (!roomId || !text) return;
    const payload = { id: Date.now() + ':' + Math.random().toString(36).slice(2), text, from: from || socket.id, to: to || 'all', ts: Date.now() };
    if (to && to !== 'all') {
      // targeted DM(s)
      const targets = Array.isArray(to) ? to : [to];
      targets.forEach((sid) => io.to(sid).emit('chat:message', payload));
      io.to(socket.id).emit('chat:message', payload); // echo back to sender
    } else {
      io.to(roomId).emit('chat:message', payload);
    }
  });

  // GM sends a hint (bonus/malus) to one player
  socket.on('hint:send', ({ roomId, target, kind = 'bonus', value = 0, durationMs }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.gms.has(socket.id)) return; // only GM may send hints
    if (!room.players.has(target)) return; // must target a player in the room

    const id = Date.now() + ':' + Math.random().toString(36).slice(2);
    const dur = typeof durationMs === 'number' ? durationMs : HINT_DURATION_MS_DEFAULT;
    const expiresAt = Date.now() + Math.max(1000, dur);
    // store pending hint for target
    const byPlayer = room.pendingHints.get(target) || new Map();
    byPlayer.set(id, { kind, value: Number(value || 0), expiresAt });
    room.pendingHints.set(target, byPlayer);
    // notify the target
    io.to(target).emit('hint:notify', { id, kind, value: Number(value || 0), durationMs: dur });
  });

  // Player claims their hint bubble
  socket.on('hint:claim', ({ roomId, hintId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const byPlayer = room.pendingHints.get(socket.id);
    if (!byPlayer) return;
    const h = byPlayer.get(hintId);
    if (!h) return;
    if (Date.now() > h.expiresAt) { byPlayer.delete(hintId); return; }
    // move to modifiers queue
    const q = room.modifiers.get(socket.id) || [];
    q.push({ id: hintId, kind: h.kind === 'malus' ? 'malus' : 'bonus', value: Number(h.value || 0) });
    room.modifiers.set(socket.id, q);
    byPlayer.delete(hintId);
    // if malus, trigger a screamer as per spec
    if (h.kind === 'malus') {
      io.to(socket.id).emit('screamer:trigger', { id: HINT_MALUS_SCREAMER_ID, intensity: HINT_MALUS_SCREAMER_INTENSITY });
    }
  });

  // Update character sheet
  socket.on('player:update', ({ roomId, hp, money, inventory }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    if (typeof hp === 'number') player.hp = hp;
    if (typeof money === 'number') player.money = money;
    if (Array.isArray(inventory)) player.inventory = inventory;
    io.to(roomId).emit('presence:update', {
      players: Array.from(room.players.values()).map(sanitizePublicPlayer),
      gms: Array.from(room.gms.values()),
    });
  });

  // Dice roll - server authoritative for fairness
  socket.on('dice:roll', ({ roomId, sides = 6, count = 1, label }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const rolls = Array.from({ length: Math.max(1, Math.min(DICE_MAX_COUNT, count)) }, () => 1 + Math.floor(Math.random() * Math.max(2, sides)));
    let total = rolls.reduce((a, b) => a + b, 0);
    // Apply a pending modifier if any for this player (single-use consumable)
    let modifier = null;
    const list = room.modifiers.get(socket.id);
    if (Array.isArray(list) && list.length) {
      modifier = list.shift();
      if (modifier?.kind === 'bonus') total = Math.max(0, total - Number(modifier.value || 0));
      if (modifier?.kind === 'malus') total = total + Number(modifier.value || 0);
    }
    const result = { id: Date.now() + ':' + Math.random().toString(36).slice(2), from: socket.id, sides, count, rolls, total, label, ts: Date.now(), modifier };

    room.diceLog.push(result);
    if (room.diceLog.length > DICE_MAX_HISTORY) room.diceLog.shift();

    io.to(roomId).emit('dice:result', result);

    // Auto screamer for critical fail (1) or critical success (20) on d20
    if (sides === 20) {
      if (rolls.includes(1)) {
        io.to(socket.id).emit('screamer:trigger', { id: 'auto-crit-fail', intensity: AUTO_SCREAMER_INTENSITY_FAIL });
        room.gms.forEach((gmId) => io.to(gmId).emit('screamer:notice', { target: socket.id, reason: 'crit-fail', result }));
      }
      if (rolls.includes(20)) {
        io.to(socket.id).emit('screamer:trigger', { id: 'auto-crit-success', intensity: AUTO_SCREAMER_INTENSITY_SUCCESS });
        room.gms.forEach((gmId) => io.to(gmId).emit('screamer:notice', { target: socket.id, reason: 'crit-success', result }));
      }
    }
  });

  // GM triggers screamer
  socket.on('screamer:send', ({ roomId, targets = 'all', screamerId, intensity, imageUrl, soundUrl }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    // ensure sender is GM
    if (!room.gms.has(socket.id)) return;

    const id = screamerId || SCREAMER_DEFAULT_ID;
    const inten = typeof intensity === 'number' ? intensity : SCREAMER_DEFAULT_INTENSITY;
    const payload = { id, intensity: inten, imageUrl, soundUrl };
    if (targets === 'all') {
      // to all players (not GMs)
      for (const [sid] of room.players) {
        io.to(sid).emit('screamer:trigger', payload);
      }
    } else {
      const list = Array.isArray(targets) ? targets : [targets];
      list.forEach((sid) => io.to(sid).emit('screamer:trigger', payload));
    }
  });

  // GM requests current state
  socket.on('state:get', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    socket.emit('state:init', {
      players: Array.from(room.players.values()).map(sanitizePublicPlayer),
      gms: Array.from(room.gms.values()),
      diceLog: room.diceLog,
    });
  });

  socket.on('disconnect', () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.players.delete(socket.id);
    room.gms.delete(socket.id);
    socketToRoom.delete(socket.id);
    room.modifiers.delete(socket.id);
    room.pendingHints.delete(socket.id);

    // notify
    io.to(roomId).emit('presence:update', {
      players: Array.from(room.players.values()).map(sanitizePublicPlayer),
      gms: Array.from(room.gms.values()),
    });
  });
});

// SPA fallback (after Socket.IO setup); let websocket handle /socket.io
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Realtime server listening on http://localhost:${PORT}`);
});
