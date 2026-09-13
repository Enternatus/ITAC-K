import React, { useState } from 'react';
import { Card, CardTitle, Badge, ConfidenceBar, EvidenceChip, PeerNodeIndicator, Sparkline, BoundaryTicks, TelemetryTile, Tooltip } from '../components';
import type { PeerNode, DecisionState, SparkPoint, BoundaryState } from '../data';
import { formatTimestamp, formatMs } from '../data';

interface Props {
  peers: PeerNode[];
  decision: DecisionState;
  volatilitySparkline: SparkPoint[];
  debtSparkline: SparkPoint[];
  boundaryHistory: BoundaryState[];
  onNavigateDecision: (nodeId?: string) => void;
}

type SortKey = 'id' | 'online' | 'freshness' | 'contextScore' | 'verdict';

export default function Telemetry({ peers, decision, volatilitySparkline, debtSparkline, boundaryHistory, onNavigateDecision }: Props) {
  const [density, setDensity] = useState<'compact' | 'detailed'>('compact');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const sortedPeers = [...peers].sort((a, b) => {
    let av: string | number = a[sortKey] as string | number;
    let bv: string | number = b[sortKey] as string | number;
    if (typeof av === 'boolean') av = av ? 0 : 1;
    if (typeof bv === 'boolean') bv = bv ? 0 : 1;
    return av < bv ? -sortDir : av > bv ? sortDir : 0;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortKey(key); setSortDir(1); }
  }

  const onlinePeers = peers.filter(p => p.online).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 14, color: '#8A929C', fontWeight: 500, margin: 0 }}>Technical Telemetry</h2>
        <div style={{ display: 'flex', gap: 0, border: '1px solid #262B31', borderRadius: 6, overflow: 'hidden' }}>
          {(['compact', 'detailed'] as const).map(d => (
            <button key={d} onClick={() => setDensity(d)} style={{
              padding: '5px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.05em', background: density === d ? '#1E2328' : 'transparent',
              border: 'none', color: density === d ? '#EDEFF1' : '#8A929C', cursor: 'pointer',
            }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Top telemetry tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div style={{ background: '#161A1E', border: '1px solid #262B31', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A929C', marginBottom: 8 }}>
            <Tooltip text="Rate of environmental change affecting parking slot occupancy patterns">
              <span style={{ borderBottom: '1px dotted #4A515A', cursor: 'help' }}>Environmental Volatility</span>
            </Tooltip>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 20, fontWeight: 600, color: '#EDEFF1', marginBottom: 2 }}>
                {decision.causal.volatilityState}
              </div>
              {density === 'detailed' && (
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#8A929C' }}>
                  δ = {(Math.random() * 0.12).toFixed(4)}/s
                </div>
              )}
            </div>
            <Sparkline data={volatilitySparkline} color="#E8A33D" width={80} height={28} />
          </div>
        </div>

        <TelemetryTile
          label="Uncertainty Debt"
          value={decision.uncertaintyDebt.toFixed(3)}
          trend="down"
          tooltip="Accumulated unresolved ambiguity — high values force the controller to trigger a physical probe"
        />

        <TelemetryTile
          label="Kinematic Urgency"
          value={decision.kinematicUrgency.toFixed(2)}
          trend="flat"
          tooltip="Time pressure of the current parking decision — scales evidence gathering aggressiveness"
        />
      </div>

      {/* Policy Relationship Card */}
      <Card>
        <CardTitle right={<span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#8A929C' }}>{formatTimestamp(decision.timestamp)}</span>}>
          Policy Relationship — {decision.policyA} vs {decision.policyB}
        </CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#EDEFF1' }}>{decision.policyA}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 600, color: '#EDEFF1' }}>{decision.confidence}%</span>
            </div>
            <ConfidenceBar confidence={decision.confidence} competing={decision.competingConfidence} boundary={decision.boundaryState} />
            {density === 'detailed' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
                {[
                  { label: 'Leading Policy', value: decision.policyA },
                  { label: 'Gap', value: `${decision.confidence - decision.competingConfidence}pp` },
                  { label: 'Boundary', value: decision.boundaryState },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A929C', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#EDEFF1' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A929C', marginBottom: 6 }}>Last 10 decisions</div>
            <BoundaryTicks states={boundaryHistory} />
          </div>
        </div>
      </Card>

      {/* Peer Table */}
      <Card>
        <CardTitle right={<span style={{ fontSize: 11, color: onlinePeers === 0 ? '#E5533D' : '#8A929C' }}>{onlinePeers}/{peers.length} online</span>}>
          Peer / Swarm Table
        </CardTitle>
        {peers.length === 0 || onlinePeers === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#4A515A', fontSize: 13 }}>
            No peers currently reachable — running on local evidence only
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #262B31' }}>
                  {[
                    { key: 'id', label: 'Node ID' },
                    { key: 'online', label: 'Status' },
                    { key: 'verdict', label: 'Last Verdict' },
                    { key: 'contextScore', label: 'Context Score' },
                    { key: 'freshness', label: 'Freshness' },
                    ...(density === 'detailed' ? [{ key: 'lastEvidence', label: 'Last Evidence' }] : []),
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key as SortKey)}
                      style={{
                        textAlign: col.key === 'contextScore' || col.key === 'freshness' ? 'right' : 'left',
                        padding: '8px 10px', fontSize: 10, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: sortKey === col.key ? '#EDEFF1' : '#8A929C',
                        cursor: 'pointer', userSelect: 'none', fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                      {col.label} {sortKey === col.key ? (sortDir === 1 ? '↑' : '↓') : ''}
                    </th>
                  ))}
                  <th style={{ width: 32 }} />
                </tr>
              </thead>
              <tbody>
                {sortedPeers.map(peer => (
                  <React.Fragment key={peer.id}>
                    <tr
                      style={{ borderBottom: '1px solid #1E2328', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => setExpandedRow(expandedRow === peer.id ? null : peer.id)}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1A1F24')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 10px', fontFamily: 'JetBrains Mono', fontSize: 13, color: '#EDEFF1', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PeerNodeIndicator node={peer} />
                        {peer.id}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <Badge label={peer.online ? 'ONLINE' : 'OFFLINE'} size="sm" />
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <Badge label={peer.verdict} size="sm" />
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 13, color: peer.contextScore > 0.8 ? '#33C481' : peer.contextScore > 0.6 ? '#E8A33D' : '#E5533D' }}>
                        {peer.contextScore.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 13, color: peer.freshness < 300 ? '#33C481' : '#E8A33D' }}>
                        {formatMs(peer.freshness)}
                      </td>
                      {density === 'detailed' && (
                        <td style={{ padding: '10px 10px', fontFamily: 'JetBrains Mono', fontSize: 11, color: '#4A515A' }}>
                          {new Date(peer.lastEvidence).toLocaleTimeString()}
                        </td>
                      )}
                      <td style={{ padding: '10px 10px', color: '#4A515A', fontSize: 12 }}>
                        {expandedRow === peer.id ? '▲' : '▼'}
                      </td>
                    </tr>
                    {expandedRow === peer.id && (
                      <tr style={{ background: '#0E1114' }}>
                        <td colSpan={density === 'detailed' ? 7 : 6} style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#8A929C', marginBottom: 6 }}>
                                Most recent evidence contribution from <span style={{ fontFamily: 'JetBrains Mono', color: '#9A7FE0' }}>{peer.id}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <EvidenceChip source="PEER" peer={peer.id} />
                                <Badge label={peer.verdict} size="sm" />
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#8A929C', marginBottom: 6 }}>Evidence details</div>
                              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#EDEFF1' }}>
                                Context score: {peer.contextScore.toFixed(2)} · Freshness: {formatMs(peer.freshness)}
                              </div>
                              {peer.verdict === 'CONTEXT-MISMATCH' && (
                                <div style={{ fontSize: 11, color: '#E8A33D', marginTop: 4 }}>
                                  Evidence rejected: operating context diverged too far from current conditions
                                </div>
                              )}
                            </div>
                          </div>
                          <button onClick={() => onNavigateDecision(peer.id)} style={{
                            marginTop: 10, background: 'none', border: 'none',
                            color: '#3FB6D6', cursor: 'pointer', fontSize: 12, padding: 0,
                          }}>
                            View full decision detail →
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Node Map schematic */}
      <Card>
        <CardTitle>Node Map — Physical Layout</CardTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 400 }}>
          {peers.map((peer, i) => {
            const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
            return (
              <div key={peer.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <PeerNodeIndicator node={peer} onClick={() => setExpandedRow(peer.id)} />
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#8A929C' }}>{peer.id}</span>
                <span style={{ fontSize: 9, color: '#4A515A', textTransform: 'uppercase' }}>{positions[i]}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: '#4A515A' }}>
          Schematic only — positions match demo hardware layout
        </div>
      </Card>
    </div>
  );
}
