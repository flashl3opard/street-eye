/**
 * Street Eye — Lamp Data Store
 * Replace DATA_URL with your ESP32/NodeMCU endpoint.
 *
 * Expected JSON from hardware:
 * {
 *   "lamps": [
 *     {
 *       "id": 1,
 *       "current": 1.84,   <- ACS712 current sensor reading (amperes)
 *       "ldr": 85,         <- LDR reading (% brightness of the BULB, NOT sky)
 *       "pir": false,      <- PIR motion sensor
 *       "temp": 28.4       <- DS18B20 temperature sensor
 *     }, ...
 *   ],
 *   "uptime": 16033        <- ESP32 uptime in seconds
 * }
 *
 * NOTE: LDR is aimed at the lamp bulb, not the sky.
 *   HIGH LDR (>30%) = bulb is emitting light.
 *   LOW  LDR (<30%) = bulb is dark / off.
 */

// Default hardware endpoint. Overridable per-deployment via NEXT_PUBLIC_HARDWARE_URL,
// and per-user at runtime via the /settings page (persisted to localStorage).
export const DEFAULT_DATA_URL = process.env.NEXT_PUBLIC_HARDWARE_URL || '/api/hardware';
export const DATA_URL = DEFAULT_DATA_URL; // kept for backwards compatibility
export const POLL_INTERVAL_MS = 3000;

/** LDR threshold: above this % means the bulb is detected as ON */
export const LDR_BULB_THRESHOLD = 10;
/** ACS712 threshold: above this amperage means the relay is energised */
export const CURRENT_ON_THRESHOLD = 0.1;

/** Block coordinates — adjust to your campus */
const BLOCK_A_BASE_LAT = 19.0760;
const BLOCK_A_BASE_LNG = 72.8777;

/** Static lamp definitions with GPS positions along a street */
export const LAMP_DEFINITIONS = [
  { id: 1, label: 'Gate Entrance', lat: BLOCK_A_BASE_LAT + 0.0000, lng: BLOCK_A_BASE_LNG + 0.0000 },
  { id: 2, label: 'East Pathway', lat: BLOCK_A_BASE_LAT + 0.0002, lng: BLOCK_A_BASE_LNG + 0.0003 },
  { id: 3, label: 'Library Front', lat: BLOCK_A_BASE_LAT + 0.0004, lng: BLOCK_A_BASE_LNG + 0.0006 },
  { id: 4, label: 'Parking Lot A', lat: BLOCK_A_BASE_LAT + 0.0006, lng: BLOCK_A_BASE_LNG + 0.0009 },
  { id: 5, label: 'Sports Complex', lat: BLOCK_A_BASE_LAT + 0.0008, lng: BLOCK_A_BASE_LNG + 0.0012 },
  { id: 6, label: 'Admin Block', lat: BLOCK_A_BASE_LAT + 0.0010, lng: BLOCK_A_BASE_LNG + 0.0015 },
  { id: 7, label: 'Canteen Walk', lat: BLOCK_A_BASE_LAT + 0.0012, lng: BLOCK_A_BASE_LNG + 0.0018 },
  { id: 8, label: 'Back Gate', lat: BLOCK_A_BASE_LAT + 0.0014, lng: BLOCK_A_BASE_LNG + 0.0021 },
];

/**
 * Fallback simulation data (when hardware is offline).
 * LDR values are HIGH (70-90%) for working lamps because the bulb is ON.
 * LDR near 0 for fused/off lamps.
 */
export const SIMULATED_READINGS = [
  { id: 1, current: 1.92, ldr: 85, pir: false, temp: 28.4, status: 'ok' },
  { id: 2, current: 1.87, ldr: 78, pir: true, temp: 29.1, status: 'ok' },
  { id: 3, current: 1.84, ldr: 2, pir: false, temp: 28.4, status: 'fault' },
  { id: 4, current: 0.00, ldr: 3, pir: false, temp: 34.2, status: 'standby' },
  { id: 5, current: 1.90, ldr: 82, pir: false, temp: 28.9, status: 'ok' },
  { id: 6, current: 1.83, ldr: 79, pir: true, temp: 29.3, status: 'ok' },
  { id: 7, current: 1.88, ldr: 88, pir: false, temp: 28.7, status: 'ok' },
  { id: 8, current: 0.00, ldr: 4, pir: false, temp: 33.1, status: 'standby' },
];

/**
 * Determine status from raw sensor values.
 *
 * HOW THE LDR WORKS IN THIS PROJECT:
 *   The LDR is pointed at the lamp's bulb — NOT the sky.
 *   HIGH LDR (> LDR_BULB_THRESHOLD) = bulb is emitting light (bulb ON).
 *   LOW  LDR (< LDR_BULB_THRESHOLD) = no light detected from bulb (fused/off).
 *
 * FAULT DETECTION RULES (from project report):
 *   Current ON  + LDR HIGH  → Working          (relay energised, bulb glowing ✓)
 *   Current ON  + LDR LOW   → Fused Bulb FAULT (power flowing but no light emitted)
 *   Current OFF + LDR HIGH  → Wastage/Alert    (bulb lit without relay — abnormal)
 *   Current OFF + LDR LOW   → Standby / OFF    (lamp correctly switched off)
 */
export function inferStatus(current, ldr) {
  const bulbLit = ldr >= LDR_BULB_THRESHOLD;

  return bulbLit ? 'ok' : 'fault';
}

/** Merge hardware readings with static definitions */
export function mergeLampData(readings) {
  if (!Array.isArray(readings)) return [];
  return readings.map(r => {
    const def = LAMP_DEFINITIONS.find(d => d.id === r.id) || { label: `Lamp #${r.id}` };
    const status = r.status || inferStatus(r.current ?? 0, r.ldr ?? 0);
    return { ...def, ...r, status };
  });
}

export const ALERT_LOG_INITIAL = [
  { id: 1, time: '22:14:03', title: 'FUSED BULB — Lamp #3', msg: 'Current ON (I=1.84A) but LDR=2% — bulb not emitting light. Fused bulb detected.', type: 'fault' },
  { id: 2, time: '18:30:45', title: 'FUSED BULB — Lamp #6', msg: 'Current ON (I=1.83A) but LDR=3% — bulb dark. Maintenance required.', type: 'fault' },
  { id: 3, time: '14:32:17', title: 'WASTAGE ALERT — Lamp #4', msg: 'LDR=91% (bulb light detected) but Current=0.00A — possible external/ghost illumination.', type: 'warn' },
  { id: 4, time: '06:01:45', title: 'RESOLVED — Lamp #3', msg: 'Bulb replaced. Current=1.90A, LDR=82%. Lamp operating normally.', type: 'ok' },
  { id: 5, time: 'Yesterday', title: 'FUSED BULB — Lamp #2', msg: 'Current ON but LDR reading near zero. Bulb fused.', type: 'fault' },
  { id: 6, time: 'Yesterday', title: 'SYSTEM ONLINE', msg: 'ESP32 connected. 8/8 lamps responding. All sensors active.', type: 'info' },
];

export const ENERGY_DATA = [
  { label: 'L01', ok: 90, fault: 8, warn: 0, standby: 0 },
  { label: 'L02', ok: 88, fault: 5, warn: 5, standby: 0 },
  { label: 'L03', ok: 35, fault: 60, warn: 0, standby: 0 },
  { label: 'L04', ok: 40, fault: 0, warn: 58, standby: 0 },
  { label: 'L05', ok: 92, fault: 3, warn: 0, standby: 0 },
  { label: 'L06', ok: 78, fault: 18, warn: 0, standby: 0 },
  { label: 'L07', ok: 95, fault: 2, warn: 0, standby: 0 },
  { label: 'L08', ok: 38, fault: 0, warn: 0, standby: 60 },
];

export const STATUS_COLORS = {
  ok: 'var(--green)',
  fault: 'var(--red)',
  warn: 'var(--amber)',
  standby: 'var(--ink4)',
  info: 'var(--blue)',
};

export const STATUS_LABELS = {
  ok: 'Working',
  fault: 'Fused',
  warn: 'Wastage',
  standby: 'Standby',
};

/**
 * Per-status Lucide icon refs. Pages render <STATUS_ICONS[lamp.status] />.
 * Importing icons lazily here keeps a single source of truth so swapping
 * an icon updates every page at once.
 */
import { Lightbulb, AlertTriangle, Zap, CircleOff } from 'lucide-react';

export const STATUS_ICONS = {
  ok: Lightbulb,
  fault: AlertTriangle,
  warn: Zap,
  standby: CircleOff,
};
