import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRealtime } from '../context/RealtimeProvider.jsx';

// Top-level tunables for the hint bubble UI (neutral appearance)
const BUBBLE_SIZE = 56; // px
const BUBBLE_MARGIN = 16; // px from screen edges
const BUBBLE_BG = 'rgba(16,16,16,0.92)';
const BUBBLE_BORDER = '1px solid rgba(255,255,255,0.18)';
const BUBBLE_TEXT_COLOR = '#fff';
const HOVER_SCALE = 1.08;
const WIGGLE_MS = 1200; // time for one wiggle step

export default function HintBubble() {
  const { hintBubble, setHintBubble, claimHint } = useRealtime();
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);
  const wiggleRef = useRef(null);

  // Auto-hide when expired
  useEffect(() => {
    if (!hintBubble) return;
    const tick = () => {
      if (Date.now() > hintBubble.expiresAt) {
        setHintBubble(null);
      }
    };
    timerRef.current = setInterval(tick, 200);
    return () => clearInterval(timerRef.current);
  }, [hintBubble, setHintBubble]);

  // Simple random wiggle animation within viewport bounds
  useEffect(() => {
    if (!hintBubble) return;
    const move = () => {
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      const maxX = Math.max(0, vw - BUBBLE_SIZE - BUBBLE_MARGIN * 2);
      const maxY = Math.max(0, vh - BUBBLE_SIZE - BUBBLE_MARGIN * 2);
      const x = BUBBLE_MARGIN + Math.round(Math.random() * maxX);
      const y = BUBBLE_MARGIN + Math.round(Math.random() * maxY);
      setPos({ x, y });
    };
    move();
    wiggleRef.current = setInterval(move, WIGGLE_MS);
    return () => clearInterval(wiggleRef.current);
  }, [hintBubble]);

  const style = useMemo(() => {
    if (!hintBubble) return null;
    return {
      position: 'fixed',
      left: pos.x,
      top: pos.y,
      width: BUBBLE_SIZE,
      height: BUBBLE_SIZE,
      borderRadius: BUBBLE_SIZE / 2,
      background: BUBBLE_BG,
      border: BUBBLE_BORDER,
      color: BUBBLE_TEXT_COLOR,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: 16,
      boxShadow: '0 6px 22px rgba(0,0,0,0.4)',
      zIndex: 9998,
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'left 0.5s ease, top 0.5s ease, transform 0.12s ease',
    };
  }, [hintBubble, pos]);

  if (!hintBubble || !style) return null;

  return (
    <div
      title="Indice"
      onClick={claimHint}
      style={style}
      onMouseEnter={(e) => { e.currentTarget.style.transform = `scale(${HOVER_SCALE})`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      ?
    </div>
  );
}
