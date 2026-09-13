import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { Card, CardTitle, Tabs, Tooltip } from '../components';
import type { PerformancePoint } from '../data';

interface Props {
  data: PerformancePoint[];
}

const TIME_RANGES = ['1H', '1D', '7D', 'ALL'];

const CHART_TOOLTIP_STYLE = {
  background: '#1E2328',
  border: '1px solid #262B31',
  borderRadius: 6,
  fontSize: 12,
  color: '#EDEFF1',
  fontFamily: 'JetBrains Mono',
};

function ChartCard({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {children}
      <p style={{ fontSize: 12, color: '#4A515A', marginTop: 10, lineHeight: 1.5 }}>{caption}</p>
    </Card>
  );
}

const statDefs = [
  { label: 'Total Decisions', key: 'total', tooltip: 'Number of slot-allocation decisions made in selected period', accent: false },
  { label: 'Probes Triggered', key: 'triggered', tooltip: 'Physical sensor reads required to resolve boundary ambiguity', accent: false },
  { label: 'Probes Avoided', key: 'avoided', tooltip: 'Decisions resolved without physical probes — the primary efficiency metric', accent: true },
  { label: 'Avg Recovery Delay', key: 'recovery', tooltip: 'Mean time to stable recommendation after an environment change', accent: false },
];

export default function Performance({ data }: Props) {
  const [range, setRange] = useState('1H');

  const totalDecisions = data.reduce((s, d) => s + d.probesTriggered + d.probesAvoided, 0);
  const totalTriggered = data.reduce((s, d) => s + d.probesTriggered, 0);
  const totalAvoided = data.reduce((s, d) => s + d.probesAvoided, 0);
  const avgRecovery = Math.floor(data.reduce((s, d) => s + d.recoveryDelay, 0) / data.length);

  const stats: Record<string, string> = {
    total: totalDecisions.toString(),
    triggered: totalTriggered.toString(),
    avoided: totalAvoided.toString(),
    recovery: `${avgRecovery}ms`,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Tabs tabs={TIME_RANGES} active={range} onChange={setRange} />
        <button style={{
          background: 'none', border: '1px solid #262B31', color: '#8A929C',
          borderRadius: 4, padding: '5px 10px', fontSize: 11, cursor: 'pointer',
        }}>
          ↓ Export
        </button>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {statDefs.map(def => (
          <div key={def.key} style={{
            background: '#161A1E',
            border: `1px solid ${def.accent ? '#33C48155' : '#262B31'}`,
            borderRadius: 8, padding: 16,
            boxShadow: def.accent ? '0 0 0 1px #33C48122' : 'none',
          }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A929C', marginBottom: 6 }}>
              <Tooltip text={def.tooltip}>
                <span style={{ borderBottom: '1px dotted #4A515A', cursor: 'help' }}>{def.label}</span>
              </Tooltip>
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono', fontSize: 26, fontWeight: 600,
              color: def.accent ? '#33C481' : '#EDEFF1',
            }}>
              {stats[def.key]}
            </div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Physical Probes — FULL WIDTH, most important */}
        <div style={{ gridColumn: '1 / -1' }}>
          <ChartCard
            title="Physical Probes — Triggered vs Avoided"
            caption="Fewer triggered probes over time means the controller is relying more on cheap peer/local evidence and less on expensive direct sensing. This chart most directly proves the system's efficiency thesis."
          >
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2328" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#4A515A' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#4A515A' }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: '#EDEFF108' }} />
                <Bar dataKey="probesAvoided" name="Avoided" stackId="a" fill="#33C481" fillOpacity={0.8} radius={[0, 0, 0, 0]} />
                <Bar dataKey="probesTriggered" name="Triggered" stackId="a" fill="#E5533D" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Decision Cost / Regret */}
        <ChartCard
          title="Decision Cost / Regret"
          caption="Expected cost of each decision. Sustained low regret confirms the controller is consistently selecting the most suitable policy."
        >
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2328" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#4A515A' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#4A515A' }} axisLine={false} tickLine={false} />
              <RTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ stroke: '#3FB6D644' }} />
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3FB6D6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3FB6D6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="cost" name="Decision Cost" stroke="#3FB6D6" strokeWidth={1.5} fill="url(#costGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Bad Decisions */}
        <ChartCard
          title="Bad / Aggressive Decisions"
          caption="Should trend toward zero or remain flat. Any spikes indicate context instability or stale peer evidence accepted in error."
        >
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2328" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#4A515A' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#4A515A' }} axisLine={false} tickLine={false} />
              <RTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ stroke: '#E5533D44' }} />
              <ReferenceLine y={0} stroke="#262B31" />
              <Line type="monotone" dataKey="badDecisions" name="Bad Decisions" stroke="#E5533D" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Recovery Delay */}
        <ChartCard
          title="Recovery Delay after Environment Change"
          caption="Time from volatility-state change to a stable, confident recommendation. Lower is better — reflects ITAC-K's evidence-efficiency at the critical transition moment."
        >
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2328" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#4A515A' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#4A515A' }} axisLine={false} tickLine={false} />
              <RTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: '#EDEFF108' }} />
              <Bar dataKey="recoveryDelay" name="Recovery (ms)" fill="#E8A33D" fillOpacity={0.75} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Local vs Peer Evidence */}
        <ChartCard
          title="Local vs Peer Evidence Usage"
          caption="Cyan = local sensor reads, Violet = peer ESP-NOW evidence. A shift toward violet over time shows increasing reliance on the cheaper distributed evidence channel."
        >
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2328" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#4A515A' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#4A515A' }} axisLine={false} tickLine={false} />
              <RTooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: '#EDEFF108' }} />
              <Bar dataKey="localEvidence" name="Local" stackId="b" fill="#3FB6D6" fillOpacity={0.8} />
              <Bar dataKey="peerEvidence" name="Peer" stackId="b" fill="#9A7FE0" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
