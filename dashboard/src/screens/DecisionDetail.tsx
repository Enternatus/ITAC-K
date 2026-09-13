import React, { useState } from 'react';
import { Card, CardTitle, Badge, ActionBadge, ConfidenceBar, EvidenceChip, Tooltip } from '../components';
import type { DecisionState } from '../data';
import { formatTimestamp } from '../data';

interface Props {
  current: DecisionState;
  previous: DecisionState | null;
  onNavigateTelemetry: (nodeId?: string) => void;
}

const CAUSAL_NODES = [
  { key: 'observation', label: 'Observation', tooltip: 'Raw sensor reading from the parking slot sensor array' },
  { key: 'volatilityState', label: 'Volatility State', tooltip: 'How rapidly the environment is changing — governs evidence decay rate' },
  { key: 'predictiveReliability', label: 'Predictive Reliability', tooltip: 'Estimated accuracy of cached peer predictions for this context' },
  { key: 'policyBoundary', label: 'Policy Boundary', tooltip: 'Confidence gap between competing policies A and B' },
  { key: 'evidenceAcquired', label: 'Evidence Acquired', tooltip: 'The evidence collection strategy chosen to resolve ambiguity' },
  { key: 'decision', label: 'Decision', tooltip: 'Final slot recommendation output by the controller' },
] as const;

function CausalFlowNode({ label, value, tooltip, active, onClick }: {
  label: string; value: string; tooltip: string; active: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
        background: active ? '#1E2328' : '#161A1E',
        border: `1px solid ${active ? '#3FB6D6' : '#262B31'}`,
        minWidth: 100, transition: 'border-color 0.2s, background 0.2s',
        flex: 1,
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#4A515A'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#262B31'; } }}
    >
      <Tooltip text={tooltip}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8A929C', fontWeight: 600, borderBottom: '1px dotted #4A515A', cursor: 'help' }}>
          {label}
        </span>
      </Tooltip>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600, color: active ? '#3FB6D6' : '#EDEFF1' }}>
        {value}
      </span>
    </div>
  );
}

export default function DecisionDetail({ current, previous, onNavigateTelemetry }: Props) {
  const [viewMode, setViewMode] = useState<'current' | 'previous'>('current');
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const decision = viewMode === 'current' ? current : (previous || current);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ActionBadge action={decision.action} size="md" />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#8A929C' }}>
            {formatTimestamp(decision.timestamp)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 0, border: '1px solid #262B31', borderRadius: 6, overflow: 'hidden' }}>
          {(['current', 'previous'] as const).map(mode => (
            <button key={mode} onClick={() => mode === 'previous' && !previous ? null : setViewMode(mode)}
              disabled={mode === 'previous' && !previous}
              style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.05em', background: viewMode === mode ? '#1E2328' : 'transparent',
                border: 'none', color: viewMode === mode ? '#EDEFF1' : mode === 'previous' && !previous ? '#4A515A' : '#8A929C',
                cursor: mode === 'previous' && !previous ? 'not-allowed' : 'pointer',
              }}
              title={mode === 'previous' && !previous ? 'No prior decision yet' : undefined}
            >
              {mode} decision
            </button>
          ))}
        </div>
      </div>

      {/* Causal Flow Strip */}
      <div style={{ background: '#161A1E', border: '1px solid #262B31', borderRadius: 8, padding: '16px 20px' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A929C', fontWeight: 600, marginBottom: 12 }}>
          Causal Chain — ITAC-K Decision Path
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
          {CAUSAL_NODES.map((node, i) => (
            <React.Fragment key={node.key}>
              <CausalFlowNode
                label={node.label}
                value={decision.causal[node.key]}
                tooltip={node.tooltip}
                active={activeNode === node.key}
                onClick={() => setActiveNode(activeNode === node.key ? null : node.key)}
              />
              {i < CAUSAL_NODES.length - 1 && (
                <div style={{ width: 24, height: 1, background: 'linear-gradient(90deg, #262B31, #3FB6D640, #262B31)', flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
        {activeNode && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#0E1114', borderRadius: 6, fontSize: 12, color: '#8A929C' }}>
            <span style={{ color: '#3FB6D6', fontWeight: 600 }}>{CAUSAL_NODES.find(n => n.key === activeNode)?.label}: </span>
            {CAUSAL_NODES.find(n => n.key === activeNode)?.tooltip}
          </div>
        )}
      </div>

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left — What */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Selected Policy */}
          <Card>
            <CardTitle>Policy Relationship</CardTitle>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#EDEFF1' }}>{decision.policyA}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 600, color: '#EDEFF1' }}>{decision.confidence}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#8A929C' }}>{decision.policyB} (competing)</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#4A515A' }}>{decision.competingConfidence}%</span>
              </div>
              <ConfidenceBar
                confidence={decision.confidence}
                competing={decision.competingConfidence}
                boundary={decision.boundaryState}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 11, color: '#8A929C' }}>Ambiguity band: </span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#E8A33D' }}>
                {Math.abs(decision.confidence - decision.competingConfidence)}pp gap
              </span>
              <span style={{ fontSize: 11, color: '#8A929C' }}> between policies</span>
            </div>
          </Card>

          {/* Evidence Card */}
          <Card>
            <CardTitle>Evidence</CardTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <EvidenceChip source={decision.evidenceSource} peer={decision.evidencePeer} />
                <Badge label="ACCEPTED" size="sm" />
              </div>
              {decision.evidencePeer && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#8A929C' }}>Supplying node</span>
                  <button onClick={() => onNavigateTelemetry(decision.evidencePeer)} style={{
                    background: 'none', border: 'none', color: '#9A7FE0', cursor: 'pointer',
                    fontSize: 12, fontFamily: 'JetBrains Mono', padding: 0,
                  }}>
                    {decision.evidencePeer} →
                  </button>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A929C', marginBottom: 2 }}>Freshness</div>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: '#EDEFF1' }}>
                    {Math.floor(Math.random() * 400 + 100)}ms
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A929C', marginBottom: 2 }}>Context Match</div>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: '#33C481' }}>0.91</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right — Why Panel */}
        <Card>
          <CardTitle>Why did it decide this?</CardTitle>
          <div style={{ fontSize: 15, lineHeight: 1.75, color: '#EDEFF1', marginBottom: 20 }}>
            {decision.whyPanel}
          </div>
          <div style={{ borderTop: '1px solid #262B31', paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Decision Cost', value: decision.cost.toFixed(3), tooltip: 'Expected cost of this decision under the selected policy' },
              { label: 'Kinematic Urgency', value: decision.kinematicUrgency.toFixed(2), tooltip: 'How time-sensitive the current parking context is — higher = faster response required' },
              { label: 'Uncertainty Debt', value: decision.uncertaintyDebt.toFixed(3), tooltip: 'Accumulated unresolved ambiguity across recent decisions — high values trigger probes' },
            ].map(stat => (
              <div key={stat.label}>
                <Tooltip text={stat.tooltip}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A929C', marginBottom: 4, borderBottom: '1px dotted #4A515A', cursor: 'help', display: 'inline-block' }}>
                    {stat.label}
                  </div>
                </Tooltip>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 600, color: '#EDEFF1' }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
