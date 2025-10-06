import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load dotenv only in development
if (process.env.NODE_ENV !== 'production') {
  try {
    await import('dotenv/config');
  } catch (e) {
    console.warn('dotenv not available (OK in production)');
  }
}

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
// Wizard Battle (AI arbitration)
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-nano';
const WIZARD_AI_TIMEOUT_MS = 4000; // keep total round < 5s
const WIZARD_MAX_TEAM_SIZE = 3; // pairs, last may be a trio
let LAST_WIZARD_ERROR_AT = 0;
let LAST_WIZARD_ERROR_MSG = '';

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

// Internal status for Wizard Battle
app.get('/api/wizard/status', (_req, res) => {
  if (LAST_WIZARD_ERROR_AT) {
    return res.status(503).json({ ok: false, since: LAST_WIZARD_ERROR_AT, message: LAST_WIZARD_ERROR_MSG || 'wizard error' });
  }
  res.json({ ok: true });
});

// In-memory state (for dev/demo). In prod, use a DB or state service.
const rooms = new Map(); // roomId -> { players: Map<socketId, player>, gm: Set<socketId>, diceLog: [] }
const socketToRoom = new Map();

function sanitizePublicPlayer(p) {
  // limit data exposed to other players
  const {
    socketId,
    name,
    role = 'player',
    hp = 0,
    money = 0,
    inventory = [], // Array<string|{ name, description }>
    strength = 0,
    intelligence = 0,
    agility = 0,
    skills = [], // Array<{ name, description }>
    copperItemUses = 0,
  } = p;
  return { socketId, name, role, hp, money, inventory, strength, intelligence, agility, skills, copperItemUses };
}

// Socket.IO connection handlers
io.on('connection', (socket) => {
  // announce server meta including version
  socket.emit('server:meta', { version: APP_VERSION });

  // Client sends join with metadata
  socket.on('join', ({ roomId, role, name, hp = 0, money = 0, inventory = [], strength = 0, intelligence = 0, agility = 0, skills = [] }) => {
    if (!roomId || !role || !name) return;
    const room = getOrCreateRoom(roomId);

    socket.join(roomId);
    socketToRoom.set(socket.id, roomId);

    // Prefer persisted player snapshot by name
    let existingPlayer = room.persistentPlayers?.get(name) || null;
    // Fallback: search current live players with same name (stale socket)
    if (!existingPlayer) {
      for (const [oldSocketId, p] of room.players.entries()) {
        if (p.name === name && oldSocketId !== socket.id) {
          existingPlayer = p;
          // Remove old socket mapping
          room.players.delete(oldSocketId);
          socketToRoom.delete(oldSocketId);
          room.modifiers.delete(oldSocketId);
          room.pendingHints.delete(oldSocketId);
          break;
        }
      }
    }

    // If player existed, merge server-side state with client data (server takes priority for important fields)
    const player = {
      socketId: socket.id,
      role,
      name,
      // Use existing server data if available, otherwise use client data
      hp: existingPlayer?.hp ?? hp,
      money: existingPlayer?.money ?? money,
      inventory: existingPlayer?.inventory ?? inventory,
      strength: existingPlayer?.strength ?? strength,
      intelligence: existingPlayer?.intelligence ?? intelligence,
      agility: existingPlayer?.agility ?? agility,
      skills: existingPlayer?.skills ?? skills,
      // Preserve Copper's usage count
      copperItemUses: existingPlayer?.copperItemUses ?? 0
    };

    console.log(`🔄 Player ${name} joined room ${roomId}${existingPlayer ? ' (restored from previous session)' : ' (new)'}`);
    if (existingPlayer) {
      console.log(`   📦 Inventory: ${player.inventory.length} items, Copper uses: ${player.copperItemUses}`);
      console.log(`   📤 Sending state:init with inventory:`, player.inventory.map(i => i.name).join(', '));
    }

    if (role === 'gm') {
      room.gms.add(socket.id);
    } else {
      room.players.set(socket.id, player);
    }

    // Persist snapshot by player name for future reconnects
    try { room.persistentPlayers.set(name, { ...player }); } catch (_) {}

    // Send back the merged state to the client so they have the server's version
    socket.emit('state:init', {
      players: Array.from(room.players.values()).map(sanitizePublicPlayer),
      gms: Array.from(room.gms.values()),
      diceLog: room.diceLog,
      you: player,
      zone: room.selectedZone,
    });

    // notify others
    io.to(roomId).emit('presence:update', {
      players: Array.from(room.players.values()).map(sanitizePublicPlayer),
      gms: Array.from(room.gms.values()),
    });
  });

  // GM sets the current zone (map)
  socket.on('zone:set', ({ roomId, zone }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.gms.has(socket.id)) return; // GM only
    const z = String(zone || '').trim() || 'village';
    room.selectedZone = z;
    io.to(roomId).emit('zone:update', { zone: z });
  });

  // GM-only: update another player's character sheet
  socket.on('gm:player:update', ({ roomId, target, hp, money, inventory, strength, intelligence, agility, skills }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.gms.has(socket.id)) return; // only GM can update others
    if (!target) return;
    const player = room.players.get(target);
    if (!player) return;
    if (typeof hp === 'number') player.hp = hp;
    if (typeof money === 'number') player.money = money;
    if (Array.isArray(inventory)) player.inventory = inventory;
    if (typeof strength === 'number') player.strength = strength;
    if (typeof intelligence === 'number') player.intelligence = intelligence;
    if (typeof agility === 'number') player.agility = agility;
    if (Array.isArray(skills)) player.skills = skills;
    // Persist snapshot by name
    try { room.persistentPlayers.set(player.name, { ...player }); } catch (_) {}
    io.to(roomId).emit('presence:update', {
      players: Array.from(room.players.values()).map(sanitizePublicPlayer),
      gms: Array.from(room.gms.values()),
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

  // GM sends a hint: 'bonus' | 'malus' (dice modifier) or 'info' (one-time content)
  socket.on('hint:send', ({ roomId, target, kind = 'bonus', value = 0, durationMs, content }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.gms.has(socket.id)) return; // only GM may send hints
    if (!room.players.has(target)) return; // must target a player in the room

    const id = Date.now() + ':' + Math.random().toString(36).slice(2);
    const dur = typeof durationMs === 'number' ? durationMs : HINT_DURATION_MS_DEFAULT;
    const expiresAt = Date.now() + Math.max(1000, dur);
    // store pending hint for target
    const byPlayer = room.pendingHints.get(target) || new Map();
    if (kind === 'info') {
      // content hint: one-time view
      const safe = content && typeof content === 'object' ? content : {};
      const type = (safe.type === 'text' || safe.type === 'image' || safe.type === 'pdf') ? safe.type : 'text';
      const entry = {
        kind: 'info',
        expiresAt,
        content: {
          type,
          text: type === 'text' ? String(safe.text || '') : undefined,
          url: (type === 'image' || type === 'pdf') ? String(safe.url || '') : undefined,
        },
        opened: false,
      };
      byPlayer.set(id, entry);
      room.pendingHints.set(target, byPlayer);
      // notify the target to show a bubble
      io.to(target).emit('hint:notify', { id, kind: 'info', durationMs: dur, contentType: type });
    } else {
      // dice modifier hint
      byPlayer.set(id, { kind, value: Number(value || 0), expiresAt });
      room.pendingHints.set(target, byPlayer);
      // notify the target
      io.to(target).emit('hint:notify', { id, kind, value: Number(value || 0), durationMs: dur });
    }
  });

  // Player claims their hint bubble (dice modifier)
  socket.on('hint:claim', ({ roomId, hintId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const byPlayer = room.pendingHints.get(socket.id);
    if (!byPlayer) return;
    const h = byPlayer.get(hintId);
    if (!h) return;
    if (Date.now() > h.expiresAt) { byPlayer.delete(hintId); return; }
    if (h.kind === 'info') {
      // info hints are opened via 'hint:open' and cannot be claimed as modifiers
      return;
    }
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

  // Player opens a one-time content hint. This returns content exactly once.
  socket.on('hint:open', ({ roomId, hintId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const byPlayer = room.pendingHints.get(socket.id);
    if (!byPlayer) return;
    const h = byPlayer.get(hintId);
    if (!h) return; // already used or invalid
    if (Date.now() > h.expiresAt) { byPlayer.delete(hintId); return; }
    if (h.kind !== 'info') return; // only content hints can be opened
    if (h.opened) return; // already opened once
    h.opened = true;
    // Remove from pending so it cannot be re-opened
    byPlayer.delete(hintId);
    // Emit content to this player only
    const payload = { id: hintId, contentType: h.content?.type || 'text' };
    if (h.content?.type === 'text') payload.text = String(h.content.text || '');
    if (h.content?.type === 'image' || h.content?.type === 'pdf') payload.url = String(h.content.url || '');
    io.to(socket.id).emit('hint:content', payload);
  });

  // Update character sheet (player-self). Preserve locked items/skills from template.
  socket.on('player:update', ({ roomId, hp, money, inventory, strength, intelligence, agility, skills }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    if (typeof hp === 'number') player.hp = hp;
    if (typeof money === 'number') player.money = money;
    // Locked preservation helpers
    const key = (it) => `${(it?.name||'').trim()}::${(it?.description||'').trim()}`;
    if (Array.isArray(inventory)) {
      const existingLocked = Array.isArray(player.inventory) ? player.inventory.filter((it) => it && it.locked) : [];
      const incoming = inventory.filter(Boolean).map((it) => ({ 
        name: String(it.name||''), 
        description: String(it.description||''), 
        locked: !!it.locked,
        // Preserve legendary item fields
        legendary: !!it.legendary,
        imageUrl: it.imageUrl || '',
        damage: it.damage || '',
        uses: typeof it.uses === 'number' ? it.uses : undefined
      }));
      const map = new Map();
      // Always keep existing locked entries
      for (const it of existingLocked) map.set(key(it), { ...it, locked: true });
      // Add non-locked incoming entries (ignore attempts to remove locked ones)
      for (const it of incoming) {
        const k = key(it);
        if (map.has(k)) continue; // don't duplicate
        if (it.locked) {
          // player cannot flip lock state; ignore locked incoming (will be kept from existing if any)
          continue;
        }
        map.set(k, { ...it, locked: false });
      }
      player.inventory = Array.from(map.values());
    }
    if (typeof strength === 'number') player.strength = strength;
    if (typeof intelligence === 'number') player.intelligence = intelligence;
    if (typeof agility === 'number') player.agility = agility;
    if (Array.isArray(skills)) {
      const existingLocked = Array.isArray(player.skills) ? player.skills.filter((it) => it && it.locked) : [];
      const incoming = skills.filter(Boolean).map((it) => ({ name: String(it.name||''), description: String(it.description||''), locked: !!it.locked }));
      const map = new Map();
      for (const it of existingLocked) map.set(key(it), { ...it, locked: true });
      for (const it of incoming) {
        const k = key(it);
        if (map.has(k)) continue;
        if (it.locked) continue; // players cannot alter locked state
        map.set(k, { ...it, locked: false });
      }
      player.skills = Array.from(map.values());
    }
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

    const r = rooms.get(roomId);
    if (!r) return;
    r.diceLog.push(result);
    if (r.diceLog.length > DICE_MAX_HISTORY) r.diceLog.shift();

    io.to(roomId).emit('dice:result', result);

    // Auto screamer for critical fail (1) or critical success (20) on d20
    if (sides === 20) {
      if (rolls.includes(1)) {
        io.to(socket.id).emit('screamer:trigger', { id: 'auto-crit-fail', intensity: AUTO_SCREAMER_INTENSITY_FAIL });
        r.gms.forEach((gmId) => io.to(gmId).emit('screamer:notice', { target: socket.id, reason: 'crit-fail', result }));
      }
      if (rolls.includes(20)) {
        io.to(socket.id).emit('screamer:trigger', { id: 'auto-crit-success', intensity: AUTO_SCREAMER_INTENSITY_SUCCESS });
        r.gms.forEach((gmId) => io.to(gmId).emit('screamer:notice', { target: socket.id, reason: 'crit-success', result }));
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

  // GM starts targeted haptics (e.g., heartbeat) on selected players' devices
  socket.on('haptics:start', ({ roomId, targets = 'all', pattern = 'heartbeat', bpm = 60 }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    // only GM may control haptics
    if (!room.gms.has(socket.id)) return;

    const safePattern = (pattern === 'heartbeat') ? 'heartbeat' : 'heartbeat';
    let b = Number(bpm || 60);
    if (!Number.isFinite(b)) b = 60;
    b = Math.max(50, Math.min(160, Math.round(b)));

    const payload = { pattern: safePattern, bpm: b };
    if (targets === 'all') {
      for (const [sid] of room.players) {
        io.to(sid).emit('haptics:start', payload);
      }
    } else {
      const list = Array.isArray(targets) ? targets : [targets];
      list.forEach((sid) => io.to(sid).emit('haptics:start', payload));
    }
  });

  // GM stops haptics on selected players
  socket.on('haptics:stop', ({ roomId, targets = 'all' }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.gms.has(socket.id)) return;

    if (targets === 'all') {
      for (const [sid] of room.players) {
        io.to(sid).emit('haptics:stop');
      }
    } else {
      const list = Array.isArray(targets) ? targets : [targets];
      list.forEach((sid) => io.to(sid).emit('haptics:stop'));
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
      wizard: wizardStatePayload(room),
      zone: room.selectedZone || 'village',
    });
  });


  // ---- Wizard Battle mode ----
  // Toggle by GM
  socket.on('wizard:toggle', ({ roomId, active }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.gms.has(socket.id)) return;
    const next = Boolean(active);
    room.wizardActive = next;
    room.wizardAIFailCount = 0;
    if (next) {
      startWizardRound(room);
    } else {
      // clear locks but keep history
      room.wizardLocked.clear();
      room.wizardSubmissions.clear();
      room.wizardGroups = [];
    }
    io.to(roomId).emit('wizard:state', wizardStatePayload(room));
  });

  // Player submits a spell
  socket.on('wizard:submit', ({ roomId, text }) => {
    const room = rooms.get(roomId);
    if (!room || !room.wizardActive) return;
    if (!room.players.has(socket.id)) return;
    const content = String(text || '').trim();
    if (!content) return;
    room.wizardSubmissions.set(socket.id, { text: content, ts: Date.now() });
    room.wizardLocked.add(socket.id);
    io.to(socket.id).emit('wizard:locked', { round: room.wizardRound });
    // If all participants submitted, resolve
    const participants = Array.from(room.players.keys());
    const allSubmitted = participants.every((sid) => room.wizardSubmissions.has(sid));
    if (allSubmitted) {
      io.to(roomId).emit('wizard:round:resolving', { round: room.wizardRound });
      resolveWizardRound(roomId);
    } else {
      io.to(roomId).emit('wizard:state', wizardStatePayload(room));
    }
  });

  // GM forces resolution (AFK)
  socket.on('wizard:force', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.wizardActive) return;
    if (!room.gms.has(socket.id)) return;
    io.to(roomId).emit('wizard:round:resolving', { round: room.wizardRound, forced: true });
    resolveWizardRound(roomId);
  });

  // GM retries AI after first failure
  socket.on('wizard:retry', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.wizardActive) return;
    if (!room.gms.has(socket.id)) return;
    if (room.wizardAIFailCount !== 1) return; // only one retry allowed
    resolveWizardRound(roomId);
  });

  // GM provides manual results
  socket.on('wizard:manual', ({ roomId, results }) => {
    const room = rooms.get(roomId);
    if (!room || !room.wizardActive) return;
    if (!room.gms.has(socket.id)) return;
    publishWizardResults(roomId, results, { source: 'manual' });
  });

  // GM publishes (after optional edits of AI result)
  socket.on('wizard:publish', ({ roomId, results }) => {
    const room = rooms.get(roomId);
    if (!room || !room.wizardActive) return;
    if (!room.gms.has(socket.id)) return;
    publishWizardResults(roomId, results, { source: 'ai' });
  });

  // GM requests current wizard details
  socket.on('wizard:get', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.wizardActive) return;
    if (!room.gms.has(socket.id)) return;
    socket.emit('wizard:info', {
      round: room.wizardRound,
      groups: room.wizardGroups,
      submissions: Object.fromEntries(room.wizardSubmissions),
      history: room.wizardHistory.slice(-5),
    });
  });

  // Copper: Generate legendary item (special ability)
  socket.on('copper:generate-item', async ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('copper:item-error', { error: 'Room not found' });
      return;
    }
    
    const player = room.players.get(socket.id);
    if (!player) {
      socket.emit('copper:item-error', { error: 'Player not found' });
      return;
    }

    // Check if player is Copper
    if (player.name !== 'Copper') {
      socket.emit('copper:item-error', { error: 'Cette capacité est réservée à Copper' });
      return;
    }

    // Initialize usage counter if not exists
    if (typeof player.copperItemUses !== 'number') {
      player.copperItemUses = 0;
    }

    // Check usage limit (10 max without GM permission)
    if (player.copperItemUses >= 10) {
      socket.emit('copper:item-error', { error: 'Limite de 10 utilisations atteinte. Demandez l\'autorisation du MJ.' });
      return;
    }

    try {
      // Roll D20
      const d20Roll = 1 + Math.floor(Math.random() * 20);
      
      // Generate item data
      const itemData = generateLegendaryItemData(d20Roll);
      
      // Generate image prompt
      const imagePrompt = generateImagePrompt(itemData);
      
      // Generate image with Together AI
      const imageUrl = await generateItemImage(imagePrompt);
      
      // Prepare the complete result
      const result = {
        jet_d20: itemData.jet_d20,
        objet: itemData.objet,
        image_prompt: imagePrompt,
        image_url: imageUrl
      };

      // Add item to inventory (locked = true so player can't edit it)
      const newItem = {
        name: `${itemData.objet.nom} (${itemData.objet.degats}, ${itemData.objet.utilisations} uses)`,
        description: itemData.objet.description,
        locked: true,
        imageUrl: imageUrl,
        legendary: true,
        damage: itemData.objet.degats,
        uses: itemData.objet.utilisations
      };
      
      if (!Array.isArray(player.inventory)) {
        player.inventory = [];
      }
      player.inventory.push(newItem);

      // Increment usage counter
      player.copperItemUses += 1;

      // Persist snapshot by player name so reloads restore inventory and uses
      try { room.persistentPlayers.set(player.name, { ...player }); } catch (_) {}

      // Log for debugging
      console.log(`✅ Copper generated item: ${itemData.objet.nom}, inventory count: ${player.inventory.length}`);

      // Send success response with full data AND updated inventory
      socket.emit('copper:item-generated', {
        ...result,
        usesRemaining: 10 - player.copperItemUses,
        updatedInventory: player.inventory
      });

      // Update presence to sync inventory with all clients
      io.to(roomId).emit('presence:update', {
        players: Array.from(room.players.values()).map(sanitizePublicPlayer),
        gms: Array.from(room.gms.values()),
      });

      // Notify GMs
      room.gms.forEach((gmId) => {
        io.to(gmId).emit('copper:item-notification', {
          player: player.name,
          item: result,
          usesRemaining: 10 - player.copperItemUses
        });
      });

    } catch (error) {
      console.error('Copper item generation error:', error);
      socket.emit('copper:item-error', { 
        error: 'Erreur lors de la génération de l\'objet', 
        details: error.message 
      });
    }
  });

  // GM: Reset Copper's item generation count
  socket.on('copper:reset-uses', ({ roomId, targetSocketId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.gms.has(socket.id)) return; // Only GM can reset
    
    const targetPlayer = room.players.get(targetSocketId);
    if (!targetPlayer) return;
    
    targetPlayer.copperItemUses = 0;
    // Persist snapshot after reset
    try { room.persistentPlayers.set(targetPlayer.name, { ...targetPlayer }); } catch (_) {}
    // Broadcast presence so clients update uses
    io.to(roomId).emit('presence:update', {
      players: Array.from(room.players.values()).map(sanitizePublicPlayer),
      gms: Array.from(room.gms.values()),
    });
    
    io.to(targetSocketId).emit('copper:uses-reset', { message: 'Le MJ a réinitialisé vos utilisations' });
    socket.emit('copper:uses-reset-success', { player: targetPlayer.name });
  });

  // Disconnect
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

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      players: new Map(),
      gms: new Set(),
      diceLog: [],
      // pendingHints: per-socket map of unclaimed hints with expiry
      pendingHints: new Map(), // socketId -> Map<hintId, { kind, value, expiresAt }>
      // modifiers to apply on next dice roll for a player
      modifiers: new Map(), // socketId -> Array<{ kind: 'bonus'|'malus', value: number, id: string }>
      // Zone selection (map)
      selectedZone: 'village',
      // Wizard Battle state
      wizardActive: false,
      wizardRound: 0,
      wizardSubmissions: new Map(), // socketId -> { text, ts }
      wizardGroups: [], // Array<Array<socketId>>
      wizardLocked: new Set(), // Set<socketId>
      wizardHistory: [], // Array<{ round, groups, submissions, results, ts }>
      wizardAIFailCount: 0,
      statusEffects: new Map(), // socketId -> Array<{ type: 'narrative', text }>
      // Persistent per-name player cache to survive reconnects
      persistentPlayers: new Map(), // name -> { player snapshot }
    });
  }
  return rooms.get(roomId);
}

function wizardStatePayload(room) {
  // Compact state for clients
  return {
    active: Boolean(room.wizardActive),
    round: Number(room.wizardRound || 0),
    groupsCount: Array.isArray(room.wizardGroups) ? room.wizardGroups.length : 0,
    locked: Array.from(room.wizardLocked || []),
  };
}

function startWizardRound(room) {
  if (!room) return;
  // Reset round state
  room.wizardRound = Number(room.wizardRound || 0) + 1;
  room.wizardSubmissions.clear();
  room.wizardLocked.clear();

  // Build groups (pairs; last may be a trio)
  const participants = Array.from(room.players.keys());
  const groups = [];
  // Simple deterministic grouping by join order
  while (participants.length >= 2) {
    const a = participants.shift();
    const b = participants.shift();
    groups.push([a, b]);
  }
  if (participants.length === 1) {
    // Add the remaining player to the last group if trio allowed
    if (groups.length && WIZARD_MAX_TEAM_SIZE >= 3) {
      groups[groups.length - 1].push(participants.shift());
    } else {
      // Or keep a solo group
      groups.push([participants.shift()]);
    }
  }
  room.wizardGroups = groups;

  // Broadcast new state
  io.to(room.id).emit('wizard:state', wizardStatePayload(room));
}

// Lightweight OpenAI call wrapper for wizard AI
async function callOpenAIForWizard({ apiKey, model, payload }) {
  // Prefer the Responses API for GPT-4.1 family
  const url = 'https://api.openai.com/v1/responses';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const body = {
    model,
    input: payload,
    max_output_tokens: 1024,
  };

  // Use global fetch if available
  if (typeof fetch === 'function') {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`OpenAI error ${res.status}: ${txt}`);
    }
    const out = await res.json();
    // Try to extract a sensible text output
    const text = out.output_text
      || out.output?.[0]?.content?.[0]?.text
      || out.choices?.[0]?.message?.content
      || (typeof out === 'string' ? out : JSON.stringify(out));
    return String(text || '');
  }

  // Fallback using https if fetch is not available
  const https = await import('node:https');
  const payloadStr = JSON.stringify(body);
  const options = {
    method: 'POST',
    headers: { ...headers, 'Content-Length': Buffer.byteLength(payloadStr) },
  };
  const raw = await new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`OpenAI error ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(payloadStr);
    req.end();
  });
  const out = JSON.parse(raw);
  const text = out.output_text
    || out.output?.[0]?.content?.[0]?.text
    || out.choices?.[0]?.message?.content
    || (typeof out === 'string' ? out : JSON.stringify(out));
  return String(text || '');
}

// Resolve wizard round: call AI, handle failures
async function resolveWizardRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const round = room.wizardRound;
  const submissions = Object.fromEntries(Array.from(room.wizardSubmissions.entries()));
  const groups = room.wizardGroups;
  // Build prompt
  const playersById = Object.fromEntries(Array.from(room.players).map(([sid, p]) => [sid, { name: p.name || sid.slice(0,4) }]));
  let payload;
  try {
    const content = `Tu es un arbitre impartial d'un duel de sorcellerie. On te donne des sorts (texte libre) envoyés par des joueurs, regroupés par binômes/trinômes secrets. Règles: si un sort est incohérent/surpuissant, annule-le. Tiens compte de la cohérence univers, originalité, vitesse, et interactions élémentaires (feu vs glace etc.). Pour CHAQUE joueur, fournis un JSON strict décrivant: { inflicted: string, suffered: string, diceMod: integer (bonus = nombre négatif, malus = positif), hpDelta: integer (soin positif, dégâts négatif), narrative: string }. Réponds UNIQUEMENT en JSON objet map { <socketId>: {...} } sans texte additionnel.`;
    payload = { role: 'system', content };
  } catch (e) {
    console.error('[wizard] Prompt build error:', e);
    const gmIds = Array.from(room.gms);
    const message = 'Erreur de construction du prompt (wizard)';
    gmIds.forEach((gmId) => io.to(gmId).emit('wizard:aiError', { round, message, canRetry: false }));
    return;
  }
  const input = {
    round,
    players: playersById,
    groups,
    submissions,
  };
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
    const text = await callOpenAIForWizard({ apiKey, model: OPENAI_MODEL, payload: [payload, { role: 'user', content: JSON.stringify(input) }] });
    let results;
    try {
      results = JSON.parse(text);
    } catch (_) {
      throw new Error('AI JSON parse error');
    }
    // Send to GM for review
    const gmIds = Array.from(room.gms);
    gmIds.forEach((gmId) => io.to(gmId).emit('wizard:aiResult', { round, groups, submissions, results }));
    room.wizardAIFailCount = 0;
  } catch (err) {
    console.error('[wizard] AI evaluation error:', err);
    room.wizardAIFailCount = (room.wizardAIFailCount || 0) + 1;
    LAST_WIZARD_ERROR_AT = Date.now();
    LAST_WIZARD_ERROR_MSG = String(err?.message || err) || 'wizard error';
    const gmIds = Array.from(room.gms);
    const canRetry = room.wizardAIFailCount === 1;
    gmIds.forEach((gmId) => io.to(gmId).emit('wizard:aiError', { round, message: String(err.message || err), canRetry }));
  }
}

function publishWizardResults(roomId, results, meta) {
  const room = rooms.get(roomId);
  if (!room) return;
  const round = room.wizardRound;
  const applied = {};
  // Apply per-player
  for (const [sid, r] of Object.entries(results || {})) {
    const inflicted = String(r?.inflicted || '');
    const suffered = String(r?.suffered || '');
    const diceMod = Number(r?.diceMod || 0);
    const hpDelta = Number(r?.hpDelta || 0);
    const narrative = String(r?.narrative || '');
    // queue dice modifier (bonus negative reduces total; malus positive increases total)
    if (diceMod !== 0) {
      const list = room.modifiers.get(sid) || [];
      list.push({ id: `wiz-${round}-${Date.now()}`, kind: diceMod > 0 ? 'malus' : 'bonus', value: Math.abs(diceMod) });
      room.modifiers.set(sid, list);
    }
    // apply hp change to stored player sheet
    const p = room.players.get(sid);
    if (p && Number.isFinite(hpDelta) && hpDelta !== 0) {
      p.hp = Math.max(0, Number(p.hp || 0) + hpDelta);
      // Persist HP change
      try { room.persistentPlayers.set(p.name, { ...p }); } catch (_) {}
    }
    // narrative effect persists (simple list)
    if (narrative) {
      const eff = room.statusEffects.get(sid) || [];
      eff.push({ type: 'narrative', text: narrative, round });
      room.statusEffects.set(sid, eff);
    }
    applied[sid] = { inflicted, suffered, diceMod, hpDelta, narrative };
    // notify privately
    io.to(sid).emit('wizard:results', { round, inflicted, suffered, diceMod, hpDelta, narrative });
  }
  // push history
  room.wizardHistory.push({ round, ts: Date.now(), groups: room.wizardGroups, submissions: Object.fromEntries(room.wizardSubmissions), results: applied, source: meta?.source || 'ai' });
  // broadcast updated presence (hp changes) and wizard state
  const roomIdLocal = roomId;
  io.to(roomIdLocal).emit('presence:update', {
    players: Array.from(room.players.values()).map(sanitizePublicPlayer),
    gms: Array.from(room.gms.values()),
  });
  io.to(roomIdLocal).emit('wizard:published', { round });
  // start next round
  startWizardRound(room);
  io.to(roomIdLocal).emit('wizard:state', wizardStatePayload(room));
}

// ===== Copper's Legendary Item Generator =====

// Item data based on D20 roll
function generateLegendaryItemData(d20Roll) {
  const roll = Math.max(1, Math.min(20, Number(d20Roll) || 1));
  
  // Item pools for each category
  const items = {
    // 1-5: Ultra-powerful weapons (1D20 damage, limited uses, epic tone)
    ultraPowerful: [
      { nom: "Lame de l'Éternité Quantique", degats: "1D20", utilisations: 3, description: "Une épée forgée dans le vide entre les dimensions, sa lame scintille de particules subatomiques. Elle peut trancher la réalité elle-même." },
      { nom: "Prisme de Destruction Atomique", degats: "1D20", utilisations: 2, description: "Un artefact cristallin qui concentre l'énergie des étoiles mourantes. Sa décharge annihile toute matière en pure lumière." },
      { nom: "Sceptre du Chaos Originel", degats: "1D20", utilisations: 4, description: "Bâton titanesque gravé de runes qui défient les lois physiques. Il canalise l'entropie primordiale de l'univers." },
      { nom: "Gant d'Antimatter Compressé", degats: "1D20", utilisations: 2, description: "Gantelet noir absolu qui contient une singularité contrôlée. Son contact désintègre instantanément la matière ordinaire." },
      { nom: "Canon Hypersonique Dimensionnel", degats: "1D20", utilisations: 3, description: "Arme futuriste aux lignes élégantes qui tire des projectiles à travers les dimensions. Chaque tir déchire l'espace-temps." },
    ],
    // 6-10: Practical delicate items (1D6 damage, refined tone)
    practical: [
      { nom: "Dague de Cristal Harmonique", degats: "1D6", utilisations: 8, description: "Lame translucide qui résonne à la fréquence moléculaire des cibles. Fragile mais d'une précision mortelle." },
      { nom: "Pistolet à Plasma Élégant", degats: "1D6", utilisations: 12, description: "Arme de poing chromée au design épuré. Projette des bolts de plasma bleuté d'une beauté hypnotique." },
      { nom: "Glaive Neuronal Télékinétique", degats: "1D6", utilisations: 10, description: "Épée légère contrôlée par l'esprit, flotte en lévitation autour du porteur. Sa finesse compense sa fragilité." },
      { nom: "Fouet Énergétique Polymorphe", degats: "1D6", utilisations: 15, description: "Chaîne de photons solidifiés qui change de forme selon la volonté. Délicat mais infiniment adaptable." },
      { nom: "Orbe de Gravité Focalisée", degats: "1D6", utilisations: 6, description: "Sphère translucide qui manipule les champs gravitationnels locaux. Peut broyer ou repousser avec précision." },
    ],
    // 11-15: Rare precious but broken (1D4 damage, mysterious tone)
    broken: [
      { nom: "Relique Stellaire Désactivée", degats: "1D4", utilisations: 0, description: "Magnifique artefact doré couvert de glyphs aliens. Son noyau énergétique est éteint depuis des millénaires." },
      { nom: "Couronne de Résonance Brisée", degats: "1D4", utilisations: 0, description: "Diadème de métal vivant qui pulse faiblement. Ses circuits psychiques sont irrémédiablement endommagés." },
      { nom: "Gemme du Néant Scellée", degats: "1D4", utilisations: 0, description: "Cristal noir absolu d'une beauté hypnotique. Un verrou dimensionnel antique bloque son pouvoir terrifiant." },
      { nom: "Codex Holographique Corrompu", degats: "1D4", utilisations: 0, description: "Livre de lumière solidifiée contenant des savoirs infinis. Ses données sont fragmentées et illisibles." },
      { nom: "Anneau Temporel Gelé", degats: "1D4", utilisations: 0, description: "Bague d'argent liquide figée dans le temps. Elle vibre d'un pouvoir chronologique inaccessible." },
    ],
    // 16-20: Cursed/inverted (1D4 or none, dark ironic tone)
    cursed: [
      { nom: "Marteau de Gravité Inversée", degats: "1D4", utilisations: 5, description: "Masse qui repousse au lieu de frapper. Active un champ gravitationnel chaotique autour du porteur pendant 10 minutes." },
      { nom: "Bouclier Absorbant de Douleur", degats: "0", utilisations: 3, description: "Disque énergétique qui absorbe les dégâts... et les redirige vers son porteur avec 50% d'amplification." },
      { nom: "Épée de Sacrifice Vital", degats: "1D4", utilisations: 7, description: "Lame noire qui inflige des dégâts redoutables. Chaque frappe draine 1D4 HP de Copper pour alimenter sa puissance." },
      { nom: "Amulette de Vérité Cruelle", degats: "0", utilisations: 1, description: "Pendentif qui révèle toutes les vérités cachées dans 50m. Force Copper à dire uniquement la vérité pendant 1 heure." },
      { nom: "Gant de Force Réfléchie", degats: "1D4", utilisations: 4, description: "Gantelet qui décuple la force... mais inverse aussi tous les mouvements du porteur pendant 5 minutes." },
    ]
  };

  let category, item, categorieName;
  
  if (roll >= 1 && roll <= 5) {
    category = items.ultraPowerful;
    categorieName = "arme ultra-puissante";
  } else if (roll >= 6 && roll <= 10) {
    category = items.practical;
    categorieName = "objet pratique";
  } else if (roll >= 11 && roll <= 15) {
    category = items.broken;
    categorieName = "objet rare inutilisable";
  } else {
    category = items.cursed;
    categorieName = "objet maudit";
  }
  
  item = category[Math.floor(Math.random() * category.length)];
  
  return {
    jet_d20: roll,
    objet: {
      nom: item.nom,
      degats: item.degats,
      utilisations: item.utilisations,
      description: item.description,
      categorie: categorieName
    }
  };
}

// Generate image prompt for Together AI
function generateImagePrompt(itemData) {
  const { nom, description } = itemData.objet;
  
  // Create detailed prompt in French for FLUX model
  return `${nom}, objet technophantasy photo-réaliste, rendu ultra-détaillé 8K, matériaux futuristes luisants, reflets métalliques froids, aura énergétique subtile, particules lumineuses, éclairage directionnel studio froid, lumière cinématographique, fond neutre sombre gradient, composition centrée, depth of field, ray tracing, matériaux PBR, science-fiction réaliste, mystique technologique, ratio 1:1, hyper-réalisme`;
}

// Call Together AI to generate image
async function generateItemImage(prompt) {
  const TOGETHER_API_KEY = process.env.TOGETHER_API || '';
  if (!TOGETHER_API_KEY) {
    throw new Error('TOGETHER_API key not configured');
  }

  try {
    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell',
        prompt: prompt,
        width: 1024,
        height: 1024,
        steps: 4,
        n: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Together AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.data || !data.data[0] || !data.data[0].url) {
      throw new Error('Invalid response from Together AI');
    }

    return data.data[0].url;
  } catch (error) {
    console.error('Together AI generation error:', error);
    throw error;
  }
}

// SPA fallback (after Socket.IO setup); let websocket handle /socket.io
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Realtime server listening on http://localhost:${PORT}`);
});
