import React from 'react';
import { THEMES, applyTheme } from './themes';
import type { Theme } from './themes';

const SWATCHES: Record<string, string[]> = {
  controlroom: ['#0E1114', '#33C481', '#E8A33D', '#3FB6D6', '#9A7FE0'],
  phosphor:    ['#020D05', '#39FF6A', '#C8E820', '#39DFAA', '#A87EFF'],
  blueprint:   ['#06101E', '#4CDDAA', '#FFBB33', '#5AC8FA', '#B09AFF'],
  ember:       ['#110D0A', '#5EC46A', '#FF9F1C', '#F4A261', '#C77DFF'],
  clinical:    ['#F0F2F5', '#0F9B5A', '#B87A00', '#0080A8', '#6B50CC'],
};

export default function ThemePicker({ activeId, onSelect }: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  function select(theme: Theme) {
    applyTheme(theme);
    onSelect(theme.id);
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 200, zIndex: 40,
      background: 'var(--panel)',
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 14px 10px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'var(--text-muted)',
          fontFamily: 'var(--font-ui)',
        }}>
          Design Direction
        </div>
      </div>

      {/* Options */}
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1 }}>
        {THEMES.map(theme => {
          const isActive = theme.id === activeId;
          return (
            <button
              key={theme.id}
              onClick={() => select(theme)}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 10px',
                borderRadius: 6, cursor: 'pointer',
                background: isActive ? 'color-mix(in srgb, var(--cyan) 10%, transparent)' : 'transparent',
                border: isActive ? '1px solid var(--cyan)' : '1px solid transparent',
                display: 'flex', flexDirection: 'column', gap: 6,
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'color-mix(in srgb, var(--text-muted) 8%, transparent)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Name + active indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: isActive ? 'var(--cyan)' : 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)',
                }}>
                  {theme.name}
                </span>
                {isActive && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--cyan)', display: 'inline-block', flexShrink: 0,
                  }} />
                )}
              </div>

              {/* Swatch strip */}
              <div style={{ display: 'flex', gap: 3 }}>
                {(SWATCHES[theme.id] ?? []).map((color, i) => (
                  <div key={i} style={{
                    width: i === 0 ? 20 : 12, height: 12,
                    borderRadius: 2, background: color,
                    border: '1px solid rgba(128,128,128,0.2)',
                    flexShrink: 0,
                  }} />
                ))}
              </div>

              {/* Description */}
              <div style={{
                fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.45,
                fontFamily: 'var(--font-ui)',
              }}>
                {theme.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
