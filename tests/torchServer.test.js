import { describe, it, expect } from 'vitest';
import { io as ioc } from 'socket.io-client';

// Import server to ensure it is running (index.js will listen on PORT)
import '../server/index.js';

const SERVER_URL = 'http://localhost:4000';

async function connectClient(opts = {}) {
  return new Promise((resolve, reject) => {
    const sock = ioc(SERVER_URL, { transports: ['websocket'], forceNew: true });
    sock.on('connect', () => resolve(sock));
    sock.on('connect_error', (e) => reject(e));
  });
}

describe('torch websocket broadcast', () => {
  it('GM torch:set reaches the targeted player', async () => {
    const roomId = 'test-room-' + Math.random().toString(36).slice(2);
    const gm = await connectClient();
    const player = await connectClient();

    // join as GM and player
    gm.emit('join', { roomId, role: 'gm', name: 'GM' });
    player.emit('join', { roomId, role: 'player', name: 'P1' });

    // wait identifiers
    const targetId = await new Promise((resolve) => {
      player.on('state:init', (st) => {
        resolve(st.you?.socketId);
      });
    });

    // Report player capability (supported) so server allows torch:set delivery
    player.emit('torch:capability', { roomId, supported: true });

    const received = new Promise((resolve) => {
      player.once('torch:set', ({ on }) => resolve(on));
    });

    // ask server to set torch ON for the player
    gm.emit('torch:set', { roomId, targets: targetId, on: true });

    const onVal = await Promise.race([
      received,
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
    ]);

    expect(onVal).toBe(true);

    gm.close();
    player.close();
  });
});
