export type SlotStatus = 'AVAILABLE' | 'OCCUPIED';
export type ActionType = 'EXPLOIT' | 'REMOTE SUBSTITUTE' | 'LOCAL PROBE';
export type BoundaryState = 'CLEAR' | 'NARROW' | 'UNRESOLVED';
export type Verdict = 'ACCEPTED' | 'REJECTED' | 'STALE' | 'CONTEXT-MISMATCH';
export type VolatilityLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type EventCategory = 'DECISION' | 'EVIDENCE' | 'SYSTEM';
export type DataSourceState = 'LOCAL_MOCK' | 'SIMULATED_GATEWAY' | 'LIVE_HARDWARE';

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
  confidence: number;
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

export interface ITACDashboardState {
  slots: SlotData[];
  peers: PeerNode[];
  decision: DecisionState;
  prevDecision: DecisionState | null;
  events: EventEntry[];
  volatilitySpark: SparkPoint[];
  debtSpark: SparkPoint[];
  boundaryHistory: BoundaryState[];
  perfData: PerformancePoint[];
  connected: boolean;
  lastUpdate: number;
  dataSource: DataSourceState;
}