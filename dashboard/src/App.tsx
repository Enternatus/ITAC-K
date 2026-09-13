import React, { useState, useEffect } from 'react';
import Overview from './screens/Overview';
import DecisionDetail from './screens/DecisionDetail';
import Telemetry from './screens/Telemetry';
import EventHistory from './screens/EventHistory';
import Performance from './screens/Performance';
import ThemePicker from './ThemePicker';
import { Tooltip } from './components';
import { THEMES, applyTheme } from './themes';
import { ITACDataProvider, useITACData } from './context/ITACDataContext';

type ScreenType = 'overview' | 'decision' | 'telemetry' | 'history' | 'performance';
const SCREENS: Array<{ id: ScreenType; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'decision', label: 'Decision' },
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'history', label: 'History' },
  { id: 'performance', label: 'Performance' },
];

function DashboardContent() {
  const [screen, setScreen] = useState<ScreenType>('overview');
  const [historySlotFilter, setHistorySlotFilter] = useState<number | undefined>();
  const [themeId, setThemeId] = useState('controlroom');

  // Dev mode toggle via query string (?dev=true)
  const isDevMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev') === 'true';

  useEffect(() => {
    // Control Room dark theme is the authoritative default
    applyTheme(THEMES[0]);
  }, []);

  const {
    mode,
    slots,
    peers,
    decision,
    prevDecision,
    events,
    volatilitySpark,
    debtSpark,
    boundaryHistory,
    perfData,
    connected,
    lastUpdate,
    dataSource,
  } = useITACData();

  function navigateDecision() { setScreen('decision'); }
  function navigateTelemetry(_nodeId?: string) { setScreen('telemetry'); }
  function navigateHistory(slotId?: number) {
    setHistorySlotFilter(slotId);
    setScreen('history');
  }

  const dimStyle = connected ? {} : { opacity: 0.7 };

  // Data provenance status badge
  function renderProvenanceBadge() {
    if (mode === 'live' && !connected) {
      return (
        <Tooltip text="Attempting connection to ITAC-K gateway at ws://localhost:8000/ws/telemetry">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
            borderRadius: 'var(--radius-badge)', border: '1px solid var(--amber-red)',
            background: 'color-mix(in srgb, var(--amber-red) 12%, transparent)',
            fontSize: 10, fontWeight: 600, color: 'var(--amber-red)', fontFamily: 'var(--font-display)',
            letterSpacing: '0.04em', cursor: 'help',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber-red)', display: 'inline-block' }} />
            GATEWAY RECONNECTING
          </div>
        </Tooltip>
      );
    }

    if (dataSource === 'LIVE_HARDWARE') {
      return (
        <Tooltip text="Active stream from physical ESP32 edge nodes via ESP-NOW gateway.">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
            borderRadius: 'var(--radius-badge)', border: '1px solid var(--green)',
            background: 'color-mix(in srgb, var(--green) 12%, transparent)',
            fontSize: 10, fontWeight: 600, color: 'var(--green)', fontFamily: 'var(--font-display)',
            letterSpacing: '0.04em', cursor: 'help',
          }}>
            <span className="pulse-live" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            LIVE HARDWARE
          </div>
        </Tooltip>
      );
    }

    if (dataSource === 'SIMULATED_GATEWAY') {
      return (
        <Tooltip text="Connected to external ITAC-K simulation gateway adapter via WebSocket.">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
            borderRadius: 'var(--radius-badge)', border: '1px solid var(--cyan)',
            background: 'color-mix(in srgb, var(--cyan) 12%, transparent)',
            fontSize: 10, fontWeight: 600, color: 'var(--cyan)', fontFamily: 'var(--font-display)',
            letterSpacing: '0.04em', cursor: 'help',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block' }} />
            SIMULATED GATEWAY
          </div>
        </Tooltip>
      );
    }

    // Default: LOCAL_MOCK
    return (
      <Tooltip text="Running browser-local synthetic simulation stream (MockProvider).">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
          borderRadius: 'var(--radius-badge)', border: '1px solid var(--amber)',
          background: 'color-mix(in srgb, var(--amber) 12%, transparent)',
          fontSize: 10, fontWeight: 600, color: 'var(--amber)', fontFamily: 'var(--font-display)',
          letterSpacing: '0.04em', cursor: 'help',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }} />
          SIMULATION
        </div>
      </Tooltip>
    );
  }

  const rightMargin = isDevMode ? 200 : 0;
  const headerRightPadding = isDevMode ? 224 : 20;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', display: 'flex', flexDirection: 'column', transition: 'background 0.3s' }}>
      {/* Top bar */}
      <header style={{
        height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `0 ${headerRightPadding}px 0 20px`, borderBottom: '1px solid var(--border)', background: 'var(--header-bg)',
        position: 'sticky', top: 0, zIndex: 30, flexShrink: 0, transition: 'background 0.3s, border-color 0.3s',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            ITAC-K
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-ui)' }}>
            Distributed Parking Controller
          </span>
        </div>

        {/* Tabs */}
        <nav style={{ display: 'flex', gap: 0 }}>
          {SCREENS.map(s => (
            <button key={s.id} onClick={() => setScreen(s.id)} style={{
              padding: '0 16px', height: 48, fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: screen === s.id ? 'var(--text-primary)' : 'var(--text-muted)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: screen === s.id ? '2px solid var(--text-primary)' : '2px solid transparent',
              transition: 'color 0.15s', fontFamily: 'var(--font-ui)',
            }}>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Status Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {renderProvenanceBadge()}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="pulse-live" style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? 'var(--green)' : 'var(--amber-red)', display: 'inline-block',
            }} />
            <span style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', fontFamily: 'var(--font-display)',
              color: connected ? 'var(--green)' : 'var(--amber-red)',
            }}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          <Tooltip text="ESP-NOW mesh connectivity to peer nodes">
            <span style={{
              fontSize: 11, fontFamily: 'var(--font-display)', color: connected ? 'var(--text-muted)' : 'var(--amber-red)',
              borderBottom: '1px dotted var(--text-dim)', cursor: 'help',
            }}>
              {peers.filter(p => p.online).length}/{peers.length} nodes
            </span>
          </Tooltip>
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, padding: '20px 24px', marginRight: rightMargin, ...dimStyle }}>
        {screen === 'overview' && (
          <Overview
            slots={slots}
            peers={peers}
            decision={decision}
            events={events}
            onNavigateDecision={navigateDecision}
            onNavigateTelemetry={navigateTelemetry}
            onNavigateHistory={navigateHistory}
            connected={connected}
            lastUpdate={lastUpdate}
          />
        )}
        {screen === 'decision' && (
          <DecisionDetail
            current={decision}
            previous={prevDecision}
            onNavigateTelemetry={navigateTelemetry}
          />
        )}
        {screen === 'telemetry' && (
          <Telemetry
            peers={peers}
            decision={decision}
            volatilitySparkline={volatilitySpark}
            debtSparkline={debtSpark}
            boundaryHistory={boundaryHistory}
            onNavigateDecision={navigateDecision}
          />
        )}
        {screen === 'history' && (
          <EventHistory
            events={events}
            initialSlotFilter={historySlotFilter}
            connected={connected}
          />
        )}
        {screen === 'performance' && (
          <Performance data={perfData} />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '8px 24px',
        marginRight: rightMargin,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text-dim)' }}>
          ITAC-K Control Room Dashboard · ESP32 / ESP-NOW Swarm Architecture
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text-dim)' }}>
          {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC
        </span>
      </footer>

      {isDevMode && <ThemePicker activeId={themeId} onSelect={setThemeId} />}
    </div>
  );
}

export default function App() {
  return (
    <ITACDataProvider>
      <DashboardContent />
    </ITACDataProvider>
  );
}