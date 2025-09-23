import React from 'react';

// Simple controlled collapsible section.
// Props:
// - title: string | ReactNode
// - collapsed: boolean (controlled)
// - onToggle: () => void
// - children: content to show when expanded
export default function CollapsibleSection({ title, collapsed, onToggle, children }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
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
          padding: '10px 12px',
          background: 'linear-gradient(180deg, #15161b 0%, #0f1014 100%)',
          border: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px 12px 0 0',
          cursor: 'pointer',
        }}
     >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
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
        <div style={{ padding: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}
