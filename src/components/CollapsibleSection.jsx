import React from 'react';

// Simple controlled collapsible section.
// Props:
// - title: string | ReactNode
// - collapsed: boolean (controlled)
// - onToggle: () => void
// - children: content to show when expanded
export default function CollapsibleSection({ title, collapsed, onToggle, children, noCard = false }) {
  const Wrapper = noCard ? 'div' : 'div';
  return (
    <Wrapper className={noCard ? '' : 'card'} style={{ overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '12px 14px',
          background: 'linear-gradient(180deg, #15161b 0%, #0f1014 100%)',
          border: 'none',
          borderBottom: noCard ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: noCard ? 8 : '12px 12px 0 0',
          cursor: 'pointer',
        }}
     >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 16 }}>
          <span style={{
            display: 'inline-block',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}>
            ▶
          </span>
          <span>{title}</span>
        </div>
        <span style={{ fontSize: 12, opacity: 0.8 }}>{collapsed ? 'déployer' : 'réduire'}</span>
      </button>
      {!collapsed && (
        <div style={{ padding: noCard ? '10px 0' : 12 }}>
          {children}
        </div>
      )}
    </Wrapper>
  );
}
