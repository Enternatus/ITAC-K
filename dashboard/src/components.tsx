import React from 'react';
import type { BoundaryState, Verdict, ActionType } from './data';

// --- Card ---
export function Card({ children, className = '', accent }: { children: React.ReactNode; className?: string; accent?: string }) {
  return (
    <div
      className={`rounded-lg p-5 ${className}`}
      style={{
        background: 'var(--panel)',
        border: accent ? `2px solid ${accent}` : '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
        {children}
      </span>
      {right && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{right}</span>}
    </div>
  );
}

// --- Status Badge ---
// Semantic colors use CSS vars so they shift per theme
function badgeColor(label: string): string {
  const map: Record<string, string> = {
    AVAILABLE: 'var(--green)',
    OCCUPIED: 'var(--amber-red)',
    RECOMMENDED: 'var(--green)',
    EXPLOIT: 'var(--cyan)',
    'REMOTE SUBSTITUTE': 'var(--violet)',
    'LOCAL PROBE': 'var(--amber)',
    ACCEPTED: 'var(--green)',
    REJECTED: 'var(--amber-red)',
    STALE: 'var(--amber)',
    'CONTEXT-MISMATCH': 'var(--neutral)',
    CLEAR: 'var(--green)',
    NARROW: 'var(--amber)',
    UNRESOLVED: 'var(--amber-red)',
    ONLINE: 'var(--green)',
    OFFLINE: 'var(--neutral)',
    DECISION: 'var(--cyan)',
    EVIDENCE: 'var(--violet)',
    SYSTEM: 'var(--text-muted)',
  };
  return map[label] || 'var(--neutral)';
}

export function Badge({ label, size = 'sm' }: { label: string; size?: 'sm' | 'md' | 'lg' }) {
  const color = badgeColor(label);
  const padding = size === 'lg' ? '6px 14px' : size === 'md' ? '4px 10px' : '3px 8px';
  const fontSize = size === 'lg' ? 14 : size === 'md' ? 12 : 11;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding,
      borderRadius: 'var(--radius-badge)',
      fontSize, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
      color, background: `color-mix(in srgb, ${color} 14%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
      fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap',
      transition: 'color 0.3s',
    }}>
      {label}
    </span>
  );
}

export function ActionBadge({ action, size = 'md' }: { action: ActionType; size?: 'sm' | 'md' | 'lg' }) {
  return <Badge label={action} size={size} />;
}

// --- Confidence / Boundary Bar ---
export function ConfidenceBar({ confidence, competing, boundary, showLabel = true }: {
  confidence: number; competing: number; boundary: BoundaryState; showLabel?: boolean;
}) {
  const boundaryColor = boundary === 'CLEAR' ? 'var(--green)' : boundary === 'NARROW' ? 'var(--amber)' : 'var(--amber-red)';
  const boundaryLabel = boundary === 'CLEAR' ? 'CLEAR BOUNDARY' : boundary === 'NARROW' ? 'NARROW BOUNDARY' : 'UNRESOLVED BOUNDARY';
  const ambiguityWidth = Math.abs(confidence - competing);

  return (
    <div>
      <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${competing}%`, background: 'var(--neutral)' }} />
        <div style={{ position: 'absolute', left: `${Math.min(competing, confidence)}%`, top: 0, height: '100%', width: `${ambiguityWidth}%`, background: 'color-mix(in srgb, var(--amber) 20%, transparent)' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${confidence}%`, background: boundaryColor, opacity: 0.85 }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, height: '100%', width: 1, background: 'color-mix(in srgb, var(--text-primary) 35%, transparent)' }} />
      </div>
      {showLabel && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}>{confidence}%</span>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: boundaryColor }}>{boundaryLabel}</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-dim)' }}>{competing}%</span>
        </div>
      )}
    </div>
  );
}

// --- Evidence Source Chip ---
export function EvidenceChip({ source, peer }: { source: 'LOCAL PROBE' | 'PEER'; peer?: string }) {
  const isLocal = source === 'LOCAL PROBE';
  const color = isLocal ? 'var(--cyan)' : 'var(--violet)';
  const label = isLocal ? 'LOCAL PROBE' : `PEER: ${peer || 'NODE'}`;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px',
      borderRadius: 9999, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color,
      fontFamily: 'var(--font-ui)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  );
}

// --- Peer Node Indicator — CSS-only tooltip ---
export function PeerNodeIndicator({ node, onClick }: {
  node: { id: string; online: boolean; verdict: Verdict; lastSeen: number; contextScore: number };
  onClick?: () => void;
}) {
  const ringColor = !node.online ? 'var(--neutral)'
    : node.verdict === 'ACCEPTED' ? 'var(--green)'
    : node.verdict === 'REJECTED' ? 'var(--amber-red)'
    : node.verdict === 'STALE' ? 'var(--amber)'
    : 'var(--neutral)';

  return (
    <div className="peer-node-wrap" onClick={onClick}
      style={{ position: 'relative', display: 'inline-block', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: node.online ? 'var(--panel)' : 'transparent',
        border: `2px solid ${ringColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, fontFamily: 'var(--font-display)', fontWeight: 600, color: ringColor,
      }}>
        {node.id.replace('NODE-', 'N')}
      </div>
      <div className="peer-tip" style={{
        position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
        background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6,
        padding: '8px 12px', zIndex: 50, whiteSpace: 'nowrap', minWidth: 160, pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{node.id}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Status: <span style={{ color: node.online ? 'var(--green)' : 'var(--amber-red)' }}>{node.online ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Last seen: <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{node.lastSeen}ms ago</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          Verdict: <Badge label={node.verdict} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Context: <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{node.contextScore}</span>
        </div>
      </div>
    </div>
  );
}

// --- Inline Alert ---
export function InlineAlert({ color, text, icon = '⚠' }: { color: string; text: string; icon?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
      borderLeft: `4px solid ${color}`, background: `color-mix(in srgb, ${color} 10%, transparent)`,
      borderRadius: '0 4px 4px 0', fontSize: 12, color: 'var(--text-primary)', marginTop: 8,
    }}>
      <span style={{ color }}>{icon}</span>
      {text}
    </div>
  );
}

// --- Tooltip — CSS-only ---
export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="itac-tip-wrap" style={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      <span className="itac-tip" style={{
        position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
        background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6,
        padding: '6px 10px', fontSize: 11, color: 'var(--text-primary)',
        whiteSpace: 'normal', zIndex: 100, pointerEvents: 'none', maxWidth: 240,
        textAlign: 'center', lineHeight: 1.5, fontFamily: 'var(--font-ui)', width: 'max-content',
      }}>
        {text}
      </span>
    </span>
  );
}

// --- Telemetry Tile ---
export function TelemetryTile({ label, value, unit, trend, tooltip }: {
  label: string; value: string; unit?: string; trend?: 'up' | 'down' | 'flat'; tooltip?: string;
}) {
  const trendChar = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendColor = trend === 'up' ? 'var(--amber-red)' : trend === 'down' ? 'var(--green)' : 'var(--text-muted)';
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 16, transition: 'background 0.3s' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-ui)' }}>
        {tooltip ? (
          <Tooltip text={tooltip}>
            <span style={{ borderBottom: '1px dotted var(--text-dim)', cursor: 'help' }}>{label}</span>
          </Tooltip>
        ) : label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{unit}</span>}
        {trend && <span style={{ fontSize: 14, color: trendColor }}>{trendChar}</span>}
      </div>
    </div>
  );
}

// --- Sparkline (SVG) ---
export function Sparkline({ data, color = 'var(--cyan)', width = 120, height = 32 }: {
  data: Array<{ t: number; v: number }>; color?: string; width?: number; height?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.v));
  const min = Math.min(...data.map(d => d.v));
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

// --- Boundary History Ticks ---
export function BoundaryTicks({ states }: { states: BoundaryState[] }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
      {states.map((s, i) => {
        const color = s === 'CLEAR' ? 'var(--green)' : s === 'NARROW' ? 'var(--amber)' : 'var(--amber-red)';
        return <div key={i} title={s} style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: 0.85 }} />;
      })}
    </div>
  );
}

// --- Tabs ---
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
      {tabs.map(tab => (
        <button key={tab} onClick={() => onChange(tab)} style={{
          padding: '8px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: active === tab ? 'var(--text-primary)' : 'var(--text-muted)',
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: active === tab ? '2px solid var(--text-primary)' : '2px solid transparent',
          marginBottom: -1, transition: 'color 0.15s', fontFamily: 'var(--font-ui)',
        }}>
          {tab}
        </button>
      ))}
    </div>
  );
}
