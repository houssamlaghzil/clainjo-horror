import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const PORT = process.env.PORT || 4000;

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

    const rolls = Array.from({ length: Math.max(1, Math.min(100, count)) }, () => 1 + Math.floor(Math.random() * Math.max(2, sides)));
    const total = rolls.reduce((a, b) => a + b, 0);
    const result = { id: Date.now() + ':' + Math.random().toString(36).slice(2), from: socket.id, sides, count, rolls, total, label, ts: Date.now() };

    room.diceLog.push(result);
    if (room.diceLog.length > 200) room.diceLog.shift();

    io.to(roomId).emit('dice:result', result);

    // Auto screamer for critical fail (1) or critical success (20) on d20
    if (sides === 20) {
      if (rolls.includes(1)) {
        io.to(socket.id).emit('screamer:trigger', { id: 'auto-crit-fail', intensity: 0.7 });
        room.gms.forEach((gmId) => io.to(gmId).emit('screamer:notice', { target: socket.id, reason: 'crit-fail', result }));
      }
      if (rolls.includes(20)) {
        io.to(socket.id).emit('screamer:trigger', { id: 'auto-crit-success', intensity: 0.9 });
        room.gms.forEach((gmId) => io.to(gmId).emit('screamer:notice', { target: socket.id, reason: 'crit-success', result }));
      }
    }
  });

  // GM triggers screamer
  socket.on('screamer:send', ({ roomId, targets = 'all', screamerId = 'default', intensity = 0.8, imageUrl, soundUrl }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    // ensure sender is GM
    if (!room.gms.has(socket.id)) return;

    const payload = { id: screamerId, intensity, imageUrl, soundUrl };
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
