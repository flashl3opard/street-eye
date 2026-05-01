'use client';
/**
 * SimulationContext.js
 * ─────────────────────────────────────────────────────────────────────────
 * Global React Context — holds ALL shared hardware/simulation state.
 *
 * KEY ADDITIONS in this version:
 *  - lampHistories: a map of { [lampId]: number[30] } maintained globally.
 *    Every simulation tick (and every hardware poll) appends the latest
 *    current reading to EACH lamp's rolling 30-sample history.
 *    This means when you navigate to any lamp detail page, the chart
 *    already has all the history that accumulated since simulation started —
 *    it never resets to zero on navigation.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DATA_URL, POLL_INTERVAL_MS,
  SIMULATED_READINGS, mergeLampData,
} from '../lib/lampData';
import { appendLog, makeLogEntry, subscribeToLogs } from '../lib/firebase';

const SimulationContext = createContext(null);

/**
 * Build the initial lamp histories using the simulated baseline readings.
 * Each lamp starts with a pre-filled 30-sample history at its steady-state
 * current so the chart isn't flat-zero on first open.
 */
function buildInitialHistories() {
  const histories = {};
  SIMULATED_READINGS.forEach(r => {
    // Pre-populate with natural-looking values around the baseline current
    const base = r.current || 0;
    histories[r.id] = Array.from({ length: 30 }, (_, i) => {
      // Gentle sine wave so the chart looks alive even before simulation
      return Math.max(0, base + Math.sin(i * 0.4) * 0.05 + (Math.random() - 0.5) * 0.04);
    });
  });
  return histories;
}

function buildInitialLdrHistories() {
  const histories = {};
  SIMULATED_READINGS.forEach(r => {
    const base = r.ldr || 0;
    histories[r.id] = Array.from({ length: 30 }, (_, i) => {
      return Math.max(0, Math.min(100, base + Math.sin(i * 0.35) * 4 + (Math.random() - 0.5) * 3));
    });
  });
  return histories;
}

function isAlertEntry(entry) {
  return entry.type !== 'info';
}

export function SimulationProvider({ children }) {
  /* Core lamp + meta state */
  const [lamps, setLamps] = useState([]);
  const [espId, setEspId] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [eventLog, setEventLog] = useState([]);
  const [simulating, setSimulating] = useState(false);

  /**
   * lampHistories — { [lampId: number]: number[] }
   * Each array is exactly 30 samples (rolling window).
   * Stored globally so ALL pages share the same accumulated history.
   */
  const [lampHistories, setLampHistories] = useState({});
  const [lampLdrHistories, setLampLdrHistories] = useState({});

  /**
   * tick — increments on every data update.
   * This lets consumers (useLampHistory) react to updates even when a
   * lamp's current value numerically repeats across simulation cycles.
   */
  const [tick, setTick] = useState(0);

  /* Internal refs */
  const prevLampsRef = useRef(lamps);
  const prevOnlineRef = useRef(false);
  const hasHardwareConnectionRef = useRef(false);
  const simIntervalRef = useRef(null);
  const simIdxRef = useRef(0);

  /** Four simulation scenario states rotated every 3 s */
  const simStates = [
    SIMULATED_READINGS,
    SIMULATED_READINGS.map(l => l.id === 2 ? { ...l, ldr: 85, status: 'warn', current: 1.80 } : l),
    SIMULATED_READINGS.map(l => l.id === 3 ? { ...l, current: 1.90, status: 'ok', ldr: 5 } : l),
    SIMULATED_READINGS.map(l => l.id === 5 ? { ...l, current: 0.00, status: 'fault', ldr: 3 } : l),
  ];

  /* ── Uptime ticker (1 s) ── */
  useEffect(() => {
    const id = setInterval(() => setUptime(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Firebase log subscription ── */
  useEffect(() => {
    return subscribeToLogs(entries => {
      setEventLog(entries);
    });
  }, []);

  const recordEvent = useCallback(async (entry) => {
    if (!hasHardwareConnectionRef.current) {
      return null;
    }

    const payload = makeLogEntry(entry);
    setEventLog(prev => [payload, ...prev].slice(0, 250));

    try {
      await appendLog(payload);
    } catch {
      // Keep the local copy if Firebase is unavailable or rejects the write.
    }

    return payload;
  }, []);

  /**
   * appendToHistories — takes the current merged lamp array and appends
   * each lamp's current reading to its rolling history.
   * Called both from simulation ticks AND hardware poll results.
   */
  const appendToHistories = useCallback((mergedLamps) => {
    setLampHistories(prev => {
      const next = { ...prev };
      mergedLamps.forEach(lamp => {
        const history = prev[lamp.id] || Array(30).fill(0);
        next[lamp.id] = [...history.slice(1), Math.max(0, lamp.current || 0)];
      });
      return next;
    });

    setLampLdrHistories(prev => {
      const next = { ...prev };
      mergedLamps.forEach(lamp => {
        const history = prev[lamp.id] || Array(30).fill(0);
        const nextValue = Math.max(0, Math.min(100, lamp.ldr || 0));
        next[lamp.id] = [...history.slice(1), nextValue];
      });
      return next;
    });
  }, []);

  /* ── ESP32 hardware poll ── */
  const fetchData = useCallback(async () => {
    if (simulating) return;
    try {
      const res = await fetch(DATA_URL, { signal: AbortSignal.timeout(2500) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (json.unique_id) {
        setEspId(json.unique_id);
      }
      const incoming = json.lamps || json;
      const merged = mergeLampData(incoming);

      setLamps(merged);
      setIsOnline(true);
      hasHardwareConnectionRef.current = true;
      if (!prevOnlineRef.current) {
        recordEvent({
          type: 'info',
          title: 'SYSTEM ONLINE',
          msg: 'Hardware endpoint responded successfully and live data is active.',
          category: 'system',
          source: 'hardware',
        });
      }
      prevOnlineRef.current = true;
      appendToHistories(merged); // update all lamp charts
      setTick(t => t + 1);

      /* Alert log — detect status changes */
      merged.forEach(lamp => {
        const prev = prevLampsRef.current.find(p => p.id === lamp.id);
        if (prev && prev.status !== lamp.status) {
          recordEvent({
            type: lamp.status,
            title: `${lamp.status.toUpperCase()} — Lamp #${lamp.id} (${lamp.label})`,
            msg: `Status changed: ${prev.status} → ${lamp.status}. I=${lamp.current?.toFixed(2)}A, LDR=${lamp.ldr}%`,
            lampId: lamp.id,
            lampLabel: lamp.label,
            category: 'lamp-status',
            source: 'hardware',
          });
        }
      });
      prevLampsRef.current = merged;
      if (json.uptime) setUptime(json.uptime);
    } catch {
      setIsOnline(false);
      prevOnlineRef.current = false;
    }
  }, [simulating, appendToHistories, recordEvent]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  /* ── Simulation toggle ── */
  const toggleSimulate = useCallback(() => {
    if (simulating) {
      clearInterval(simIntervalRef.current);
      setSimulating(false);
      setIsOnline(false);
      prevOnlineRef.current = false;
    } else {
      setSimulating(true);
      setIsOnline(true);
      setEspId('SIM_ESP32_01');
      prevOnlineRef.current = true;
      simIdxRef.current = 0;

      const apply = () => {
        const baseState = simStates[simIdxRef.current % simStates.length];

        /* Add ±0.10A jitter per lamp so EVERY tick produces a different
           current value — this makes each lamp's chart line visibly live */
        const jitteredState = baseState.map(l => ({
          ...l,
          current: Math.max(0, (l.current || 0) + (Math.random() - 0.5) * 0.20),
        }));

        const merged = mergeLampData(jitteredState);
        setLamps(merged);
        appendToHistories(merged); // append to EACH lamp's history in global state
        setTick(t => t + 1);
        simIdxRef.current++;
      };

      apply(); // immediate first tick
      simIntervalRef.current = setInterval(apply, 3000);
    }
  }, [simulating, appendToHistories, recordEvent]);

  /* ── KPI summary ── */
  const kpi = {
    online: lamps.filter(l => l.status === 'ok').length,
    faults: lamps.filter(l => l.status === 'fault').length,
    warns: lamps.filter(l => l.status === 'warn').length,
    avgCurrent: lamps.length ? (lamps.reduce((a, l) => a + (l.current || 0), 0) / lamps.length).toFixed(2) : '0.00',
    wasted: lamps.filter(l => l.status === 'warn').reduce((a, l) => a + (l.current || 0), 0).toFixed(2),
  };

  const alertLog = useMemo(() => eventLog.filter(isAlertEntry), [eventLog]);

  const value = {
    lamps, espId, isOnline, uptime, alertLog,
    simulating, toggleSimulate,
    kpi,
    eventLog,
    recordEvent,
    lampHistories, // per-lamp rolling history (30 samples each)
    lampLdrHistories, // per-lamp rolling LDR history (30 samples each)
    tick,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used inside <SimulationProvider>');
  return ctx;
}
