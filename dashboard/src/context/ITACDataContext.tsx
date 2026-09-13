import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type {
  SlotData,
  PeerNode,
  DecisionState,
  EventEntry,
  SparkPoint,
  BoundaryState,
  PerformancePoint,
  DataSourceState,
} from '../types/itac';
import {
  generateSlots,
  generatePeers,
  generateDecision,
  generateInitialEvents,
  generateNewEvent,
  generateSparkline,
  generatePerformanceData,
} from '../data';

export type ProviderMode = 'mock' | 'live';

export interface ITACDataContextType {
  mode: ProviderMode;
  setMode: (mode: ProviderMode) => void;
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
  logPaused: boolean;
  setLogPaused: (paused: boolean) => void;
}

const ITACDataContext = createContext<ITACDataContextType | null>(null);

export function useITACData(): ITACDataContextType {
  const ctx = useContext(ITACDataContext);
  if (!ctx) {
    throw new Error('useITACData must be used within an ITACDataProvider');
  }
  return ctx;
}

interface ProviderProps {
  children: React.ReactNode;
}

// ==========================================
// 1. MOCK PROVIDER (LOCAL_MOCK)
// ==========================================
export function MockProvider({ children }: ProviderProps) {
  const [slots, setSlots] = useState<SlotData[]>(() => generateSlots());
  const [peers, setPeers] = useState<PeerNode[]>(() => generatePeers());
  const [decision, setDecision] = useState<DecisionState>(() => generateDecision());
  const [prevDecision, setPrevDecision] = useState<DecisionState | null>(null);
  const [events, setEvents] = useState<EventEntry[]>(() => generateInitialEvents());
  const [volatilitySpark, setVolatilitySpark] = useState<SparkPoint[]>(() => generateSparkline());
  const [debtSpark, setDebtSpark] = useState<SparkPoint[]>(() => generateSparkline());
  const [boundaryHistory, setBoundaryHistory] = useState<BoundaryState[]>(() =>
    Array.from({ length: 10 }, () => ['CLEAR', 'NARROW', 'UNRESOLVED', 'CLEAR', 'CLEAR'][Math.floor(Math.random() * 5)] as BoundaryState)
  );
  const [perfData] = useState<PerformancePoint[]>(() => generatePerformanceData(12));
  const [connected, setConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [logPaused, setLogPaused] = useState(false);
  const logPausedRef = useRef(logPaused);
  logPausedRef.current = logPaused;

  useEffect(() => {
    const decisionInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        setDecision(prev => {
          setPrevDecision(prev);
          return generateDecision();
        });
        setSlots(generateSlots());
        setLastUpdate(Date.now());
      }
    }, 3500);

    const peerInterval = setInterval(() => {
      setPeers(generatePeers());
    }, 5000);

    const eventInterval = setInterval(() => {
      if (!logPausedRef.current) {
        setEvents(prev => [generateNewEvent(), ...prev].slice(0, 200));
      }
    }, 2800);

    const sparkInterval = setInterval(() => {
      setVolatilitySpark(generateSparkline());
      setDebtSpark(generateSparkline());
    }, 4000);

    const connInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        setConnected(false);
        setTimeout(() => setConnected(true), 3000);
      }
    }, 8000);

    return () => {
      clearInterval(decisionInterval);
      clearInterval(peerInterval);
      clearInterval(eventInterval);
      clearInterval(sparkInterval);
      clearInterval(connInterval);
    };
  }, []);

  const value: ITACDataContextType = {
    mode: 'mock',
    setMode: () => {},
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
    dataSource: 'LOCAL_MOCK',
    logPaused,
    setLogPaused,
  };

  return <ITACDataContext.Provider value={value}>{children}</ITACDataContext.Provider>;
}

// ==========================================
// 2. LIVE WEBSOCKET PROVIDER
// ==========================================
export function LiveWebSocketProvider({ children, wsUrl = 'ws://localhost:8000/ws/telemetry' }: ProviderProps & { wsUrl?: string }) {
  const [slots, setSlots] = useState<SlotData[]>(() => generateSlots());
  const [peers, setPeers] = useState<PeerNode[]>([]);
  const [decision, setDecision] = useState<DecisionState>(() => generateDecision());
  const [prevDecision, setPrevDecision] = useState<DecisionState | null>(null);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [volatilitySpark, setVolatilitySpark] = useState<SparkPoint[]>(() => generateSparkline());
  const [debtSpark, setDebtSpark] = useState<SparkPoint[]>(() => generateSparkline());
  const [boundaryHistory, setBoundaryHistory] = useState<BoundaryState[]>([]);
  const [perfData] = useState<PerformancePoint[]>(() => generatePerformanceData(12));
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [dataSource, setDataSource] = useState<DataSourceState>('SIMULATED_GATEWAY');
  const [logPaused, setLogPaused] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isUnmounted = false;

    function connect() {
      if (isUnmounted) return;
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          setConnected(true);
        };
        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data.decision) {
              setDecision(prev => {
                setPrevDecision(prev);
                return data.decision;
              });
            }
            if (data.slots) setSlots(data.slots);
            if (data.peers) setPeers(data.peers);
            if (data.event) setEvents(prev => [data.event, ...prev].slice(0, 200));
            if (data.volatilitySpark) setVolatilitySpark(data.volatilitySpark);
            if (data.debtSpark) setDebtSpark(data.debtSpark);
            if (data.boundaryHistory) setBoundaryHistory(data.boundaryHistory);
            if (data.dataSource) setDataSource(data.dataSource);
            setLastUpdate(Date.now());
          } catch (err) {
            console.error('Failed to parse incoming ITAC live payload:', err);
          }
        };
        ws.onclose = () => {
          setConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };
        ws.onerror = () => {
          setConnected(false);
          ws?.close();
        };
      } catch {
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      isUnmounted = true;
      ws?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [wsUrl]);

  const value: ITACDataContextType = {
    mode: 'live',
    setMode: () => {},
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
    logPaused,
    setLogPaused,
  };

  return <ITACDataContext.Provider value={value}>{children}</ITACDataContext.Provider>;
}

// ==========================================
// 3. ROOT ITACDataProvider
// ==========================================
export function ITACDataProvider({ children }: { children: React.ReactNode }) {
  // Read mode from URL if provided (e.g. ?source=live or ?source=mock), default to 'mock'
  const [mode, setMode] = useState<ProviderMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const src = params.get('source');
      if (src === 'live' || src === 'gateway') return 'live';
    }
    return 'mock';
  });

  if (mode === 'live') {
    return <LiveWebSocketProvider>{children}</LiveWebSocketProvider>;
  }

  return <MockProvider>{children}</MockProvider>;
}