import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function Landing() {
  const navigate = useNavigate();
  const { join } = useRealtime();

  const [roomId, setRoomId] = useState('room-1');
  const [role, setRole] = useState('player');
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomId || !role || !name) return;
    join({ roomId, role, name });
    navigate(role === 'gm' ? '/gm' : '/player');
  };

  return (
    <div style={{ padding: 16, maxWidth: 520, margin: '0 auto' }}>
      <h1>Clainjo Horror</h1>
      <p>Connectez-vous à une partie, choisissez votre rôle et entrez votre nom.</p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Room ID
          <input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="room-1" />
        </label>
        <div>
          <label style={{ marginRight: 12 }}>
            <input type="radio" name="role" value="player" checked={role === 'player'} onChange={() => setRole('player')} />
            Joueur
          </label>
          <label>
            <input type="radio" name="role" value="gm" checked={role === 'gm'} onChange={() => setRole('gm')} />
            Maître du jeu
          </label>
        </div>
        <label>
          Nom
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
        </label>
        <button type="submit">Entrer</button>
      </form>
    </div>
  );
}
