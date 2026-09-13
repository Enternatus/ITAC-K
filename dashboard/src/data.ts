// Simulated live data for ITAC-K dashboard prototype

export type SlotStatus = 'AVAILABLE' | 'OCCUPIED';
export type ActionType = 'EXPLOIT' | 'REMOTE SUBSTITUTE' | 'LOCAL PROBE';
export type BoundaryState = 'CLEAR' | 'NARROW' | 'UNRESOLVED';
export type Verdict = 'ACCEPTED' | 'REJECTED' | 'STALE' | 'CONTEXT-MISMATCH';
export type VolatilityState = 'LOW' | 'MODERATE' | 'HIGH';
export type EventCategory = 'DECISION' | 'EVIDENCE' | 'SYSTEM';

export interface SlotData {
  id: number;
  status: SlotStatus;
  sensorOk: boolean;
  recommended: boolean;
}

export interface PeerNode {
  id: string;
  online: boolean;
  lastSeen: number; // ms ago
  verdict: Verdict;
  contextScore: number;
  freshness: number; // ms
  lastEvidence: string;
}

export interface DecisionState {
  recommendedSlot: number;
  action: ActionType;
  confidence: number; // 0-100
  competingConfidence: number;
  boundaryState: BoundaryState;
  timestamp: number;
  policyA: string;
  policyB: string;
  evidenceSource: 'LOCAL PROBE' | 'PEER';
  evidencePeer?: string;
  reason: string;
  whyPanel: string;
  causal: {
    observation: string;
    volatilityState: string;
    predictiveReliability: string;
    policyBoundary: string;
    evidenceAcquired: string;
    decision: string;
  };
  cost: number;
  regret: number;
  kinematicUrgency: number;
  uncertaintyDebt: number;
}

export interface EventEntry {
  id: string;
  timestamp: number;
  category: EventCategory;
  text: string;
  slotId?: number;
  accent?: boolean;
  detail?: string;
}

export interface SparkPoint {
  t: number;
  v: number;
}

export interface PerformancePoint {
  label: string;
  cost: number;
  probesTriggered: number;
  probesAvoided: number;
  recoveryDelay: number;
  badDecisions: number;
  localEvidence: number;
  peerEvidence: number;
}

// --- Live state generator ---

let tick = 0;

function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSlots(): SlotData[] {
  const rec = choice([1, 2, 3]);
  return [1, 2, 3].map(id => ({
    id,
    status: Math.random() > 0.4 ? 'AVAILABLE' : 'OCCUPIED',
    sensorOk: Math.random() > 0.08,
    recommended: id === rec,
  }));
}

export function generatePeers(): PeerNode[] {
  const verdicts: Verdict[] = ['ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'REJECTED', 'STALE', 'CONTEXT-MISMATCH'];
  return ['NODE-01', 'NODE-02', 'NODE-03', 'NODE-04'].map((id, i) => ({
    id,
    online: i < 3 || Math.random() > 0.5,
    lastSeen: Math.floor(randBetween(200, 8000)),
    verdict: choice(verdicts),
    contextScore: parseFloat(randBetween(0.55, 0.98).toFixed(2)),
    freshness: Math.floor(randBetween(80, 900)),
    lastEvidence: new Date(Date.now() - Math.floor(randBetween(500, 12000))).toISOString(),
  }));
}

export function generateDecision(): DecisionState {
  const slot = choice([1, 2, 3]);
  const confidence = Math.floor(randBetween(52, 94));
  const actions: ActionType[] = ['EXPLOIT', 'EXPLOIT', 'REMOTE SUBSTITUTE', 'LOCAL PROBE'];
  const action = choice(actions);
  const boundary: BoundaryState = confidence > 75 ? 'CLEAR' : confidence > 60 ? 'NARROW' : 'UNRESOLVED';
  const vol: VolatilityState[] = ['LOW', 'MODERATE', 'HIGH'];
  const v = choice(vol);
  return {
    recommendedSlot: slot,
    action,
    confidence,
    competingConfidence: Math.floor(randBetween(20, confidence - 8)),
    boundaryState: boundary,
    timestamp: Date.now(),
    policyA: 'Policy A',
    policyB: 'Policy B',
    evidenceSource: action === 'LOCAL PROBE' ? 'LOCAL PROBE' : 'PEER',
    evidencePeer: action === 'REMOTE SUBSTITUTE' ? 'NODE-02' : undefined,
    reason: `Policy A currently more suitable — ${action === 'LOCAL PROBE' ? 'probe triggered to resolve boundary.' : 'no probe was needed.'}`,
    whyPanel: `Slot ${slot} was selected because Policy A currently has higher expected suitability (${confidence}% vs ${Math.floor(randBetween(20, 50))}%). The A/B decision boundary was ${boundary === 'CLEAR' ? 'sufficiently clear, so no physical probe was required' : boundary === 'NARROW' ? 'narrow, prompting peer evidence acquisition' : 'unresolved, triggering a local sensor probe'}. Evidence was sourced ${action === 'LOCAL PROBE' ? 'from the local sensor directly' : 'from peer NODE-02 via ESP-NOW'}, and accepted after context verification.`,
    causal: {
      observation: `S${slot}: ${Math.random() > 0.5 ? 'VACANT' : 'OCCUPANCY'}`,
      volatilityState: v,
      predictiveReliability: confidence > 75 ? 'HIGH' : 'MEDIUM',
      policyBoundary: boundary,
      evidenceAcquired: action === 'LOCAL PROBE' ? 'LOCAL' : 'PEER',
      decision: `SLOT ${slot}`,
    },
    cost: parseFloat(randBetween(0.08, 0.45).toFixed(3)),
    regret: parseFloat(randBetween(0.01, 0.22).toFixed(3)),
    kinematicUrgency: parseFloat(randBetween(0.3, 0.9).toFixed(2)),
    uncertaintyDebt: parseFloat(randBetween(0.05, 0.6).toFixed(3)),
  };
}

let eventIdCounter = 1000;
const eventTexts: Array<{ text: string; category: EventCategory; accent: boolean; slotId?: number }> = [
  { text: 'Slot recommendation changed: Slot 2 → Slot 1', category: 'DECISION', accent: true, slotId: 1 },
  { text: 'Peer evidence received from NODE-02 (ACCEPTED)', category: 'EVIDENCE', accent: false },
  { text: 'Policy boundary resolved — CLEAR state', category: 'DECISION', accent: true },
  { text: 'Sensor ping OK on Slot 3', category: 'SYSTEM', accent: false, slotId: 3 },
  { text: 'Local probe triggered — boundary too narrow', category: 'EVIDENCE', accent: false },
  { text: 'NODE-03 evidence rejected — context mismatch', category: 'EVIDENCE', accent: false },
  { text: 'Recovery completed after environment change', category: 'SYSTEM', accent: true },
  { text: 'Volatility state transition: LOW → MODERATE', category: 'SYSTEM', accent: false },
  { text: 'Peer evidence from NODE-01 marked STALE', category: 'EVIDENCE', accent: false },
  { text: 'Uncertainty debt threshold exceeded', category: 'DECISION', accent: false },
  { text: 'Slot 2 sensor fault detected — using last confirmed state', category: 'SYSTEM', accent: true, slotId: 2 },
  { text: 'Decision cost 0.041 — below regret threshold', category: 'DECISION', accent: false },
  { text: 'NODE-04 reconnected after 14s offline', category: 'SYSTEM', accent: true },
  { text: 'Policy A confidence: 78% — boundary clear, exploit selected', category: 'DECISION', accent: false },
  { text: 'Kinematic urgency elevated — immediate decision required', category: 'DECISION', accent: false },
];

export function generateInitialEvents(): EventEntry[] {
  const now = Date.now();
  return Array.from({ length: 40 }, (_, i) => {
    const template = eventTexts[i % eventTexts.length];
    return {
      id: `evt-${eventIdCounter++}`,
      timestamp: now - (40 - i) * 8000 - Math.floor(Math.random() * 3000),
      category: template.category,
      text: template.text,
      slotId: template.slotId,
      accent: template.accent,
    };
  });
}

export function generateNewEvent(): EventEntry {
  const template = choice(eventTexts);
  return {
    id: `evt-${eventIdCounter++}`,
    timestamp: Date.now(),
    category: template.category,
    text: template.text,
    slotId: template.slotId,
    accent: template.accent,
  };
}

export function generateSparkline(n = 20): SparkPoint[] {
  let v = randBetween(0.3, 0.7);
  return Array.from({ length: n }, (_, i) => {
    v = Math.max(0.05, Math.min(0.95, v + randBetween(-0.08, 0.08)));
    return { t: i, v: parseFloat(v.toFixed(3)) };
  });
}

export function generatePerformanceData(n = 12): PerformancePoint[] {
  let probeRate = 0.45;
  return Array.from({ length: n }, (_, i) => {
    probeRate = Math.max(0.05, probeRate - randBetween(0, 0.04));
    const total = Math.floor(randBetween(8, 18));
    const triggered = Math.floor(total * probeRate);
    return {
      label: `T-${n - i}h`,
      cost: parseFloat(randBetween(0.05, 0.5).toFixed(3)),
      probesTriggered: triggered,
      probesAvoided: total - triggered,
      recoveryDelay: parseFloat(randBetween(100, 800).toFixed(0)),
      badDecisions: Math.floor(randBetween(0, 3)),
      localEvidence: Math.floor(randBetween(3, 10)),
      peerEvidence: Math.floor(randBetween(5, 15)),
    };
  });
}

export function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
