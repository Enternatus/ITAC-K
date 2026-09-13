import React, { useState } from 'react';
import { Card, CardTitle, Badge, ActionBadge, ConfidenceBar, EvidenceChip, PeerNodeIndicator, InlineAlert } from '../components';
import type { SlotData, PeerNode, DecisionState, EventEntry } from '../data';
import { formatTimestamp } from '../data';

interface Props {
  slots: SlotData[];
  peers: PeerNode[];
  decision: DecisionState;
  events: EventEntry[];
  onNavigateDecision: () => void;
  onNavigateTelemetry: () => void;
  onNavigateHistory: (slotId?: number) => void;
  connected: boolean;
  lastUpdate: number;
}

export default function Overview({ slots, peers, decision, events, onNavigateDecision, onNavigateTelemetry, onNavigateHistory, connected, lastUpdate }: Props) {
  const [logPaused, setLogPaused] = useState(false);
  const recommendedSlot = slots.find(s => s.recommended);
  const onlinePeers = peers.filter(p => p.online).length;
  const rejectedPeers = peers.filter(p => p.verdict === 'REJECTED' || p.verdict === 'CONTEXT-MISMATCH').length;
  const headlineEvents = events.slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hero row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        {/* Recommended Slot Card */}
        <div
          onClick={onNavigateDecision}
          style={{ cursor: 'pointer', background: '#161A1E', border: '1px solid #262B31', borderRadius: 8, padding: 28, transition: 'border-color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#3FB6D6')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#262B31')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A929C', fontWeight: 600 }}>Recommended Slot</span>
            <Badge label="RECOMMENDED" />
          </div>

          {decision.recommendedSlot ? (
            <>
              <div style={{ fontSize: 72, fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#EDEFF1', lineHeight: 1, marginBottom: 12 }}>
                SLOT {decision.recommendedSlot}
              </div>
              <p style={{ fontSize: 14, color: '#8A929C', margin: '0 0 16px', lineHeight: 1.5 }}>
                {decision.reason}
              </p>
            </>
          ) : (
            <div style={{ fontSize: 28, fontFamily: 'JetBrains Mono', color: '#4A515A', marginBottom: 20, paddingTop: 8 }}>
              AWAITING FIRST DECISION
            </div>
          )}

          <button onClick={e => { e.stopPropagation(); onNavigateDecision(); }} style={{
            background: 'none', border: 'none', color: '#3FB6D6', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, padding: 0, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            Why did it do that? <span style={{ fontSize: 16 }}>→</span>
          </button>

          {!connected && (
            <InlineAlert color="#E5533D" text={`Connection lost — last update ${formatTimestamp(lastUpdate)}`} icon="⚡" />
          )}
        </div>

        {/* Current Action Card */}
        <div
          onClick={onNavigateDecision}
          style={{ cursor: 'pointer', background: '#161A1E', border: '1px solid #262B31', borderRadius: 8, padding: 28, transition: 'border-color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#9A7FE0')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#262B31')}
        >
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A929C', fontWeight: 600, display: 'block', marginBottom: 16 }}>Current Action</span>
          <div style={{ marginBottom: 12 }}>
            <ActionBadge action={decision.action} size="lg" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <EvidenceChip source={decision.evidenceSource} peer={decision.evidencePeer} />
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#8A929C', marginBottom: 16 }}>
            {formatTimestamp(decision.timestamp)}
          </div>
          <ConfidenceBar
            confidence={decision.confidence}
            competing={decision.competingConfidence}
            boundary={decision.boundaryState}
          />
        </div>
      </div>

      {/* Slot Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {slots.map(slot => (
          <div
            key={slot.id}
            onClick={() => onNavigateHistory(slot.id)}
            style={{
              cursor: 'pointer',
              background: '#161A1E',
              border: slot.recommended ? `2px solid #33C481` : '1px solid #262B31',
              borderRadius: 8,
              padding: 20,
              transition: 'opacity 0.2s',
              opacity: connected ? 1 : 0.7,
            }}
            onMouseEnter={e => { if (!slot.recommended) e.currentTarget.style.borderColor = '#4A515A'; }}
            onMouseLeave={e => { if (!slot.recommended) e.currentTarget.style.borderColor = '#262B31'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 600, color: '#EDEFF1' }}>
                SLOT {slot.id}
              </span>
              {slot.recommended && <span style={{ fontSize: 10, color: '#33C481', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>● ACTIVE</span>}
            </div>
            <div style={{ marginBottom: 12 }}>
              <Badge label={slot.status} size="md" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: slot.sensorOk ? '#8A929C' : '#E8A33D' }}>
              <span>{slot.sensorOk ? '◉' : '◌'}</span>
              <span style={{ fontFamily: 'JetBrains Mono' }}>{slot.sensorOk ? 'SENSOR OK' : 'SENSOR FAULT'}</span>
            </div>
            {!slot.sensorOk && (
              <InlineAlert color="#E8A33D" text="Sensor fault — last confirmed state used." />
            )}
          </div>
        ))}
      </div>

      {/* Secondary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Peer Strip */}
        <Card>
          <CardTitle right={
            <span style={{ fontSize: 11, color: '#8A929C' }}>{onlinePeers}/{peers.length} online</span>
          }>Peer Network</CardTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {peers.map(peer => (
              <PeerNodeIndicator key={peer.id} node={peer} onClick={onNavigateTelemetry} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#8A929C' }}>
            {onlinePeers}/{peers.length} peers online
            {rejectedPeers > 0 && (
              <span style={{ color: '#E8A33D' }}> — {rejectedPeers} evidence rejected/mismatched</span>
            )}
          </div>
        </Card>

        {/* Live Event Log */}
        <Card>
          <CardTitle right={
            <button onClick={() => setLogPaused(p => !p)} style={{
              background: 'none', border: '1px solid #262B31', color: '#8A929C',
              borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {logPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          }>Live Events</CardTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {headlineEvents.map((evt, i) => (
              <div key={evt.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 0',
                borderBottom: i < headlineEvents.length - 1 ? '1px solid #1E2328' : 'none',
                borderLeft: evt.accent ? '3px solid #E8A33D' : '3px solid transparent',
                paddingLeft: evt.accent ? 8 : 0,
              }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#4A515A', minWidth: 60 }}>
                  {formatTimestamp(evt.timestamp).split(' ')[0]}
                </span>
                <span style={{ fontSize: 12, color: evt.accent ? '#EDEFF1' : '#8A929C', flex: 1 }}>{evt.text}</span>
                <Badge label={evt.category} size="sm" />
              </div>
            ))}
          </div>
          <button onClick={() => onNavigateHistory()} style={{
            marginTop: 10, background: 'none', border: 'none', color: '#3FB6D6',
            fontSize: 12, cursor: 'pointer', padding: 0,
          }}>
            View full log →
          </button>
        </Card>
      </div>
    </div>
  );
}
