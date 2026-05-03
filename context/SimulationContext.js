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
  DEFAULT_DATA_URL, POLL_INTERVAL_MS,
  SIMULATED_READINGS, mergeLampData,
} from '../lib/lampData';
import { appendLog, makeLogEntry, subscribeToLogs } from '../lib/firebase';

const SimulationContext = createContext(null);

const SETTINGS_STORAGE_KEY = 'street-eye:settings';
const COMPONENTS_STORAGE_KEY = 'street-eye:components';
const SETTINGS_DEFAULTS = {
  hardwareUrl: DEFAULT_DATA_URL,
  pollIntervalMs: POLL_INTERVAL_MS,
};
const COMPONENT_DEFAULTS = {
  current: true,
  ldr: true,
  pir: true,
  temp: true,
  gps: true,
};

/**
 * Load the user's persisted settings, falling back to defaults for any
 * field that isn't present (or if localStorage is unavailable).
 */
function loadSettings() {
  if (typeof window === 'undefined') return SETTINGS_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return SETTINGS_DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...SETTINGS_DEFAULTS, ...parsed };
  } catch {
    return SETTINGS_DEFAULTS;
  }
}

function loadComponentConfig() {
  if (typeof window === 'undefined') return COMPONENT_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(COMPONENTS_STORAGE_KEY);
    if (!raw) return COMPONENT_DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...COMPONENT_DEFAULTS, ...parsed };
  } catch {
    return COMPONENT_DEFAULTS;
  }
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
  const [hardwareMeta, setHardwareMeta] = useState({
    deviceNumber: null,
    gps: null,
    lastReadingAt: null,
  });
  /**
   * bootState — high-level connection lifecycle the UI can render against.
   *   'connecting'   : initial mount, no fetch attempt has resolved yet
   *   'connected'    : real hardware responded successfully
   *   'disconnected' : a fetch attempt failed (and we're not simulating)
   *   'simulating'   : user toggled simulation; data is synthetic but flowing
   * The dialog/dashes UX keys off this rather than `isOnline` directly so
   * we don't flash a "not connected" dialog on the first paint.
   */
  const [bootState, setBootState] = useState('connecting');

  /**
   * settings — user-tunable runtime config (persisted to localStorage).
   * Hydrated lazily on the client; SSR sees the env-var defaults.
   */
  const [settings, setSettings] = useState(SETTINGS_DEFAULTS);
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore — settings still apply for the current session
      }
      return next;
    });
  }, []);

  const [componentConfig, setComponentConfig] = useState(COMPONENT_DEFAULTS);
  useEffect(() => {
    setComponentConfig(loadComponentConfig());
  }, []);

  const updateComponentConfig = useCallback((patch) => {
    setComponentConfig(prev => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(COMPONENTS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore — config still applies for the current session
      }
      return next;
    });
  }, []);

  /**
   * Theme state — lives at the provider level so it survives navigation.
   * Local-only `useState` in each page reset to `false` on every route
   * change, which is why the app appeared to "default" on every nav.
   *
   * Initial value is read inline (lazy initializer) on the client. Default
   * 'light' is also what the inline <script> in layout.js sets pre-hydrate
   * (when no localStorage entry exists), so the two stay in sync.
   */
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false; // SSR-safe
    return window.localStorage.getItem('theme') === 'dark';
  });

  // Push the chosen theme to <html data-theme=…> AND persist it.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    try {
      window.localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
      // localStorage can throw in private mode; ignore — runtime state still works.
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark(d => !d), []);

  /**
   * Mobile sidebar state — at narrow viewports the sidebar slides in/out.
   * Lives in context so the Topbar's hamburger button and the Sidebar can
   * coordinate without prop drilling.
   */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen(o => !o), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

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
      const res = await fetch(settings.hardwareUrl, { signal: AbortSignal.timeout(2500) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (json.unique_id) {
        setEspId(json.unique_id);
      }
      setHardwareMeta(prev => ({
        deviceNumber: json.device_number ?? prev.deviceNumber ?? null,
        gps: json.gps ?? prev.gps ?? null,
        lastReadingAt: Date.now(),
      }));
      const incoming = json.lamps || json;
      const merged = mergeLampData(incoming);

      setLamps(merged);
      setIsOnline(true);
      setBootState('connected');
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
      // Only flip to 'disconnected' if we're not running the simulation —
      // otherwise the user is intentionally driving fake data and the
      // "Arduino not connected" UI would be wrong.
      setBootState(prev => (prev === 'simulating' ? prev : 'disconnected'));
      prevOnlineRef.current = false;
    }
  }, [simulating, appendToHistories, recordEvent, settings.hardwareUrl]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, settings.pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchData, settings.pollIntervalMs]);

  /* ── Simulation toggle ── */
  const toggleSimulate = useCallback(() => {
    if (simulating) {
      clearInterval(simIntervalRef.current);
      setSimulating(false);
      setIsOnline(false);
      // After stopping sim, fall back to 'disconnected' until the next real
      // hardware response moves us back to 'connected'.
      setBootState('disconnected');
      prevOnlineRef.current = false;
    } else {
      setSimulating(true);
      setIsOnline(true);
      setBootState('simulating');
      setEspId('SIM_ESP32_01');
      setHardwareMeta({
        deviceNumber: 'SIM',
        gps: null,
        lastReadingAt: Date.now(),
      });
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

  /**
   * arduinoConnected — single source of truth the UI keys off when deciding
   * whether to render live values or "--" placeholders. Simulation mode
   * deliberately keeps this `false`: simulated values are not "real" Arduino
   * data, so the spec's "show dashes when not connected" rule still holds
   * unless the user is on a screen that explicitly opts into sim values.
   */
  const arduinoConnected = bootState === 'connected';

  const value = {
    lamps, espId, isOnline, uptime, alertLog,
    simulating, toggleSimulate,
    kpi,
    eventLog,
    recordEvent,
    lampHistories, // per-lamp rolling history (30 samples each)
    lampLdrHistories, // per-lamp rolling LDR history (30 samples each)
    tick,
    bootState,
    arduinoConnected,
    isDark,
    setIsDark,
    toggleTheme,
    settings,
    updateSettings,
    componentConfig,
    updateComponentConfig,
    hardwareMeta,
    sidebarOpen,
    toggleSidebar,
    closeSidebar,
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
