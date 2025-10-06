import React, { useEffect, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

export default function LegendaryItemGenerator() {
  const { socket, roomId, name, setInventory, myId, players } = useRealtime();
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [error, setError] = useState(null);
  const [usesRemaining, setUsesRemaining] = useState(10);

  // Initial fallback: read backup from localStorage (in case server hasn't restored yet)
  useEffect(() => {
    if (name !== 'Copper') return;
    try {
      const raw = localStorage.getItem('clainjo.copper.backup.v1');
      if (!raw) return;
      const b = JSON.parse(raw);
      if (b && b.roomId === roomId && b.name === name && typeof b.copperItemUses === 'number') {
        setUsesRemaining(Math.max(0, 10 - b.copperItemUses));
      }
    } catch {}
  }, [roomId, name]);

  // Sync usesRemaining from server state
  useEffect(() => {
    if (!myId || !players) return;
    const me = players.find(p => p.socketId === myId);
    if (me && typeof me.copperItemUses === 'number') {
      setUsesRemaining(10 - me.copperItemUses);
      // Keep backup in sync
      try {
        const raw = localStorage.getItem('clainjo.copper.backup.v1');
        const prev = raw ? JSON.parse(raw) : {};
        localStorage.setItem('clainjo.copper.backup.v1', JSON.stringify({
          ...prev,
          roomId,
          name,
          copperItemUses: me.copperItemUses,
        }));
      } catch {}
    }
  }, [myId, players]);

  // Only show for Copper
  if (name !== 'Copper') {
    return null;
  }

  useEffect(() => {
    if (!socket) return;

    const handleItemGenerated = (data) => {
      console.log('✅ Item generated:', data);
      setLastGenerated(data);
      setUsesRemaining(data.usesRemaining);
      setError(null);
      
      // Force update inventory immediately
      if (data.updatedInventory) {
        console.log('🔄 Updating inventory with:', data.updatedInventory);
        setInventory(data.updatedInventory);
        // Persist Copper backup locally as a safety net
        if (name === 'Copper') {
          try {
            const raw = localStorage.getItem('clainjo.copper.backup.v1');
            const prev = raw ? JSON.parse(raw) : {};
            const used = Math.max(0, 10 - (data.usesRemaining ?? 10));
            localStorage.setItem('clainjo.copper.backup.v1', JSON.stringify({
              ...prev,
              roomId,
              name,
              inventory: data.updatedInventory,
              copperItemUses: used,
            }));
          } catch {}
        }
      }
    };

    const handleItemError = (data) => {
      console.error('❌ Item generation error:', data);
      setError(data.error);
      setGenerating(false);
    };

    const handleUsesReset = () => {
      setUsesRemaining(10);
      setError(null);
    };

    socket.on('copper:item-generated', handleItemGenerated);
    socket.on('copper:item-error', handleItemError);
    socket.on('copper:uses-reset', handleUsesReset);

    return () => {
      socket.off('copper:item-generated', handleItemGenerated);
      socket.off('copper:item-error', handleItemError);
      socket.off('copper:uses-reset', handleUsesReset);
    };
  }, [socket]);

  const handleGenerate = () => {
    if (!socket || !roomId || generating) return;
    
    setGenerating(true);
    setError(null);
    socket.emit('copper:generate-item', { roomId });
  };

  const closeModal = () => {
    setLastGenerated(null);
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', 
        borderRadius: 12, 
        padding: 20,
        border: '2px solid #0f4c75'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#00d4ff', fontFamily: 'Hamstrong, serif', fontSize: '1.5rem' }}>
          ⚡ Générateur d'Items Légendaires
        </h3>
        
        <p style={{ margin: '0 0 16px 0', opacity: 0.9, lineHeight: 1.5 }}>
          Capacité spéciale de <strong>Copper</strong> : Invoquez un objet légendaire unique basé sur un jet de D20.
          Chaque génération consomme une utilisation.
        </p>

        <div style={{ 
          display: 'grid', 
          gap: 12, 
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          marginBottom: 16,
          background: 'rgba(15, 76, 117, 0.3)',
          padding: 12,
          borderRadius: 8
        }}>
          <span style={{ fontSize: '1.2rem' }}>🎲</span>
          <div>
            <div style={{ fontWeight: 'bold', color: '#00d4ff' }}>Utilisations restantes</div>
            <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>10 maximum sans autorisation du MJ</div>
          </div>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: usesRemaining > 0 ? '#00ff88' : '#ff4444',
            fontFamily: 'Hamstrong, serif'
          }}>
            {usesRemaining}/10
          </div>
        </div>

        {error && (
          <div style={{ 
            padding: 12, 
            background: '#3c1111', 
            borderRadius: 8, 
            marginBottom: 12,
            border: '1px solid #ff4444'
          }}>
            ❌ {error}
          </div>
        )}

        <button 
          onClick={handleGenerate}
          disabled={generating || usesRemaining <= 0}
          style={{ 
            width: '100%',
            padding: '14px 20px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            background: generating ? '#555' : (usesRemaining > 0 ? 'linear-gradient(135deg, #0f4c75 0%, #00d4ff 100%)' : '#444'),
            cursor: generating || usesRemaining <= 0 ? 'not-allowed' : 'pointer',
            opacity: generating || usesRemaining <= 0 ? 0.5 : 1,
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            transition: 'all 0.3s'
          }}
        >
          {generating ? '🔮 Génération en cours...' : '✨ Générer un objet légendaire'}
        </button>

        <div style={{ marginTop: 16, fontSize: '0.85rem', opacity: 0.7, lineHeight: 1.6 }}>
          <strong>Catégories de jets :</strong>
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li><strong>1-5 :</strong> Armes ultra-puissantes (1D20, usage limité)</li>
            <li><strong>6-10 :</strong> Objets pratiques et délicats (1D6)</li>
            <li><strong>11-15 :</strong> Reliques précieuses mais inutilisables (1D4)</li>
            <li><strong>16-20 :</strong> Objets maudits et dangereux (1D4)</li>
          </ul>
        </div>
      </div>

      {/* Result Modal */}
      {lastGenerated && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0, 0, 0, 0.9)', 
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(8px)'
          }}
          onClick={closeModal}
        >
          <div 
            style={{ 
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: 16,
              maxWidth: 600,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              border: '2px solid #0f4c75',
              boxShadow: '0 20px 60px rgba(0, 212, 255, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 24 }}>
              {/* D20 Roll Result */}
              <div style={{ 
                textAlign: 'center', 
                marginBottom: 20,
                padding: 16,
                background: 'rgba(0, 212, 255, 0.1)',
                borderRadius: 12,
                border: '1px solid #0f4c75'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: 8 }}>Jet de D20</div>
                <div style={{ 
                  fontSize: '3rem', 
                  fontWeight: 'bold', 
                  color: '#00d4ff',
                  fontFamily: 'Hamstrong, serif'
                }}>
                  {lastGenerated.jet_d20}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: 8, color: '#00ff88' }}>
                  {lastGenerated.objet.categorie}
                </div>
              </div>

              {/* Item Image */}
              {lastGenerated.image_url && (
                <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '2px solid #0f4c75' }}>
                  <img 
                    src={lastGenerated.image_url} 
                    alt={lastGenerated.objet.nom}
                    style={{ width: '100%', display: 'block' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Item Details */}
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ 
                  margin: '0 0 16px 0', 
                  color: '#00d4ff',
                  fontFamily: 'Hamstrong, serif',
                  fontSize: '1.8rem',
                  textAlign: 'center'
                }}>
                  {lastGenerated.objet.nom}
                </h2>

                <div style={{ 
                  display: 'grid', 
                  gap: 12, 
                  gridTemplateColumns: '1fr 1fr',
                  marginBottom: 16
                }}>
                  <div style={{ 
                    padding: 12, 
                    background: 'rgba(255, 68, 68, 0.2)', 
                    borderRadius: 8,
                    textAlign: 'center',
                    border: '1px solid rgba(255, 68, 68, 0.4)'
                  }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Dégâts</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff4444' }}>
                      {lastGenerated.objet.degats}
                    </div>
                  </div>
                  <div style={{ 
                    padding: 12, 
                    background: 'rgba(0, 255, 136, 0.2)', 
                    borderRadius: 8,
                    textAlign: 'center',
                    border: '1px solid rgba(0, 255, 136, 0.4)'
                  }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Utilisations</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00ff88' }}>
                      {lastGenerated.objet.utilisations}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  padding: 16, 
                  background: 'rgba(15, 76, 117, 0.3)', 
                  borderRadius: 8,
                  lineHeight: 1.6,
                  border: '1px solid #0f4c75'
                }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 8 }}>Description</div>
                  <div>{lastGenerated.objet.description}</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button 
                  onClick={closeModal}
                  style={{ 
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #0f4c75 0%, #00d4ff 100%)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ✅ Ajouter à l'inventaire
                </button>
              </div>

              <div style={{ 
                marginTop: 16, 
                padding: 12, 
                background: 'rgba(0, 212, 255, 0.1)', 
                borderRadius: 8,
                fontSize: '0.85rem',
                textAlign: 'center',
                opacity: 0.8
              }}>
                L'objet a été automatiquement ajouté à votre inventaire (verrouillé)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
