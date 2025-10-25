import React, { useEffect, useRef } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';
import confetti from 'canvas-confetti';

// ==== Tunable globals for ConfettiOverlay ====
const CONFETTI_DURATION_MS = 3000;
const CRITICAL_SUCCESS_COLOR = ['#FFD700', '#FFA500', '#FF8C00']; // Gold colors
const CRITICAL_FAIL_COLOR = ['#8B4513', '#A0522D', '#CD853F']; // Brown/bronze colors

export default function ConfettiOverlay() {
  const { diceLog } = useRealtime();
  const lastProcessedRef = useRef(null);

  useEffect(() => {
    if (!diceLog || diceLog.length === 0) return;
    
    const lastRoll = diceLog[diceLog.length - 1];
    
    // Avoid processing the same roll twice
    if (lastProcessedRef.current === lastRoll.id) return;
    lastProcessedRef.current = lastRoll.id;

    // Check if it's a d20 roll
    if (lastRoll.sides !== 20 || lastRoll.count !== 1) return;
    
    const roll = lastRoll.rolls?.[0];
    
    // Critical success (20)
    if (roll === 20) {
      fireConfetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: CRITICAL_SUCCESS_COLOR,
        scalar: 1.2,
      });
      
      // Extra burst for critical success
      setTimeout(() => {
        fireConfetti({
          particleCount: 100,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: CRITICAL_SUCCESS_COLOR,
        });
        fireConfetti({
          particleCount: 100,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: CRITICAL_SUCCESS_COLOR,
        });
      }, 250);
    }
    
    // Critical fail (1)
    if (roll === 1) {
      fireConfetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: CRITICAL_FAIL_COLOR,
        scalar: 0.8,
        gravity: 1.5,
      });
    }
  }, [diceLog]);

  return null; // This component doesn't render anything, just triggers confetti
}

function fireConfetti(options) {
  try {
    confetti(options);
  } catch (error) {
    console.warn('Confetti error:', error);
  }
}
