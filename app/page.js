'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lightbulb, Zap, Activity, BatteryWarning, AlertTriangle, CheckCircle2,
  Search, Download, X, MapPin, Navigation, Hourglass, MapPinOff, Map as MapIcon,
  CircleDot,
} from 'lucide-react';

import CurrentChart from '../components/CurrentChart';
import SensorValue from '../components/SensorValue';
import { useHardwareData } from '../components/useHardwareData';
import { ENERGY_DATA, STATUS_COLORS, STATUS_LABELS, STATUS_ICONS } from '../lib/lampData';

export default function HomePage() {
  const router = useRouter();
  const {
    lamps, espId, isOnline, alertLog, eventLog,
    simulating, kpi, lampHistories, lampLdrHistories,
    bootState, arduinoConnected, componentConfig,
  } = useHardwareData();
  const [filterPill, setFilterPill] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [alertVisible, setAlertVisible] = useState(true);
  const [connBarMsg, setConnBarMsg] = useState('');
  const wasOnlineRef = useRef(isOnline);

  /**
   * avgHistory — element-wise average of all lamps' rolling histories.
   * Recomputes whenever lampHistories changes (i.e. every simulation tick).
   * This is what drives the homepage "Current Monitor" chart.
   */
  const avgHistory = useMemo(() => {
    const ids = Object.keys(lampHistories);
    if (ids.length === 0) return Array(30).fill(0);
    return Array.from({ length: 30 }, (_, i) => {
      const sum = ids.reduce((acc, id) => acc + (lampHistories[id]?.[i] ?? 0), 0);
      return sum / ids.length;
    });
  }, [lampHistories]);

  const avgLdrHistory = useMemo(() => {
    const ids = Object.keys(lampLdrHistories || {});
    if (ids.length === 0) return Array(30).fill(0);
    return Array.from({ length: 30 }, (_, i) => {
      const sum = ids.reduce((acc, id) => acc + (lampLdrHistories[id]?.[i] ?? 0), 0);
      return sum / ids.length;
    });
  }, [lampLdrHistories]);

  // (Theme effect now lives in SimulationContext so it persists across nav.)

  // Connection status bar
  useEffect(() => {
    if (wasOnlineRef.current !== isOnline) {
      setConnBarMsg(isOnline ? 'ESP32 Connected — Live data active' : 'Hardware offline — showing simulation data');
      const t = setTimeout(() => setConnBarMsg(''), 4000);
      wasOnlineRef.current = isOnline;
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  const firstFault = alertLog.find(a => a.type === 'fault');
  const firstWarn = alertLog.find(a => a.type === 'warn');
  const activeAlert = firstFault || firstWarn;

  const filteredLamps = lamps.filter(l => {
    const matchFilter = filterPill === 'All' ||
      (filterPill === 'Working' && l.status === 'ok') ||
      (filterPill === 'Faults' && l.status === 'fault') ||
      (filterPill === 'Warnings' && l.status === 'warn') ||
      (filterPill === 'Standby' && l.status === 'standby');
    const matchSearch = searchQuery === '' ||
      String(l.id).includes(searchQuery) ||
      l.label?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  const exportLog = () => {
    const csv = ['Time,Title,Message,Type', ...eventLog.map(a => `"${a.time}","${a.title}","${a.msg}","${a.type}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'street-eye-events.csv'; a.click();
  };

  // Live values are only "real" when arduinoConnected. Sim mode also flows
  // numbers into kpi/lamps but keeps arduinoConnected=false so the UI
  // honours the "show dashes when not connected" spec.
  const showLive = arduinoConnected || simulating;
  const isBooting = bootState === 'connecting' && lamps.length === 0;
  const pirEnabled = componentConfig?.pir !== false;

  // Pre-computed LDR aggregates so the JSX below stays tidy.
  const ldrMin = lamps.length ? Math.min(...lamps.map(l => l.ldr || 0)) : 0;
  const ldrMax = lamps.length ? Math.max(...lamps.map(l => l.ldr || 0)) : 0;
  const avgTemp = lamps.length ? lamps.reduce((a, l) => a + (l.temp || 0), 0) / lamps.length : 0;
  const lastLdr = avgLdrHistory[avgLdrHistory.length - 1] || 0;
  const darkLamps = lamps.filter(l => (l.ldr || 0) <= 30).length;
  const brightLamps = lamps.filter(l => (l.ldr || 0) > 30).length;
  const movingLamps = lamps.filter(l => l.pir);
  const motionActive = movingLamps.length > 0;

  return (
    <>
      <main className="content">
          {/* Page header */}
          <div className="page-header">
            <div>
              <div className="page-eyebrow">
                {espId
                  ? `ESP32 Node: ${espId}`
                  : isBooting ? 'Connecting to ESP32…' : 'Waiting for ESP32...'}
              </div>
              <h1 className="page-title">Streetlamp <em>Overview</em></h1>
            </div>
            <div className="page-header-stats">
              <div className="page-stat">
                <div className="page-stat-val">
                  <SensorValue
                    value={lamps.length ? (kpi.online / lamps.length) * 100 : null}
                    connected={showLive && lamps.length > 0}
                    format={v => v.toFixed(1) + '%'}
                  />
                </div>
                <div className="page-stat-label">Uptime today</div>
              </div>
              <div className="page-stat">
                <div className="page-stat-val" style={{ fontSize: '16px', color: 'var(--ink3)' }}>
                  {arduinoConnected ? 'Just now' : simulating ? 'Simulated' : '--'}
                </div>
                <div className="page-stat-label">Last sync</div>
              </div>
              <div className="page-stat">
                <button className="export-btn" onClick={exportLog}>
                  <Download size={14} aria-hidden="true" /> Export Log
                </button>
              </div>
            </div>
          </div>

          {/* Alert banner */}
          {activeAlert && alertVisible && (
            <div className="alert-banner" style={{
              background: activeAlert.type === 'fault' ? 'linear-gradient(135deg,#fff5f5,#fff0f0)' : 'linear-gradient(135deg,#fffaf4,#fff8ee)',
              borderLeftColor: activeAlert.type === 'fault' ? 'var(--red)' : 'var(--amber)',
            }}>
              <div className="alert-icon-wrap">
                <AlertTriangle size={20} color={activeAlert.type === 'fault' ? 'var(--red)' : 'var(--amber)'} aria-hidden="true" />
              </div>
              <div className="alert-body">
                <div className="alert-title" style={{ color: activeAlert.type === 'fault' ? 'var(--red)' : 'var(--amber-dark)' }}>
                  {activeAlert.title}
                </div>
                <div className="alert-msg">{activeAlert.msg}</div>
              </div>
              <button className="alert-close" onClick={() => setAlertVisible(false)} aria-label="Dismiss alert">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* KPI cards */}
          <div className="section-label">Key Metrics</div>
          <div className="kpi-grid">
            <KpiCard
              label="Lamps Online"
              icon={<Lightbulb size={18} aria-hidden="true" />}
              accent="var(--green)"
              accentLight="var(--green-light)"
              value={kpi.online}
              connected={showLive}
              sub={`of ${lamps.length} lamps active`}
              trend={<><Activity size={12} aria-hidden="true" /> All night</>}
            />
            <KpiCard
              label="Active Faults"
              icon={<AlertTriangle size={18} aria-hidden="true" />}
              accent="var(--red)"
              accentLight="var(--red-light)"
              value={kpi.faults}
              connected={showLive}
              sub="needs attention"
              trend={kpi.faults > 0
                ? <><AlertTriangle size={12} aria-hidden="true" /> {kpi.faults} active</>
                : <><CheckCircle2 size={12} aria-hidden="true" /> None</>}
            />
            <KpiCard
              label="Avg Current"
              icon={<Activity size={18} aria-hidden="true" />}
              accent="var(--blue)"
              accentLight="var(--blue-light)"
              value={kpi.avgCurrent}
              connected={showLive}
              sub="amperes"
              trend={<><Activity size={12} aria-hidden="true" /> Stable</>}
            />
            <KpiCard
              label="Energy Wasted"
              icon={<BatteryWarning size={18} aria-hidden="true" />}
              accent="var(--amber)"
              accentLight="var(--amber-light)"
              value={kpi.wasted}
              connected={showLive}
              sub="A wastage (daytime)"
              trend={kpi.warns > 0
                ? <><Zap size={12} aria-hidden="true" /> {kpi.warns} lamp(s) on</>
                : <><CheckCircle2 size={12} aria-hidden="true" /> No wastage</>}
            />
          </div>

          {/* Sensor grid */}
          <div className="section-label">Live Sensor Data</div>
          <div className="sensor-grid">
            {/* Fault status */}
            <div className="sensor-panel sensor-panel-fault">
              <FaultStatusCard lamps={lamps} connected={showLive} showPir={pirEnabled} />
            </div>

            {/* Current chart */}
            <div className="card sensor-panel sensor-panel-current">
              <div className="card-head">
                <span className="card-title">Current Monitor — ACS712</span>
                <span className="card-badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>REAL-TIME</span>
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <CurrentChart data={avgHistory} yUnit="A" yDecimals={1} />
                </div>
                <div className="chart-meta"><span>← 30s ago</span><span>now →</span></div>
                <div className="sensor-readings">
                  <Reading label="Avg Current" connected={showLive} value={parseFloat(kpi.avgCurrent)} format={v => v.toFixed(2)} unit="amperes" />
                  <Reading label="Faults" connected={showLive} value={kpi.faults} unit="lamps fused" valueColor="var(--red)" />
                  <Reading
                    label="LDR Range"
                    connected={showLive && lamps.length > 0}
                    rawText={`${ldrMin}–${ldrMax}`}
                    unit="% intensity"
                  />
                  <Reading label="Avg Temp" connected={showLive && lamps.length > 0} value={avgTemp} format={v => v.toFixed(1)} unit="°C — DS18B20" />
                </div>
              </div>
            </div>

            {/* LDR chart */}
            <div className="card sensor-panel sensor-panel-ldr">
              <div className="card-head">
                <span className="card-title">Light Intensity — LDR</span>
                <span className="card-badge" style={{ background: 'var(--amber-light)', color: 'var(--amber-dark)' }}>REAL-TIME</span>
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <CurrentChart
                    data={avgLdrHistory}
                    color="rgb(232,130,12)"
                    maxVal={100}
                    yUnit="%"
                    yDecimals={0}
                  />
                </div>
                <div className="chart-meta"><span>← 30s ago</span><span>now →</span></div>
                <div className="sensor-readings">
                  <Reading label="Avg Intensity" connected={showLive} value={lastLdr} format={v => v.toFixed(0)} unit="percent" />
                  <Reading label="Dark Lamps" connected={showLive} value={darkLamps} unit="≤ 30% bulb light" valueColor="var(--red)" />
                  <Reading label="Bright Lamps" connected={showLive} value={brightLamps} unit="> 30% bulb light" valueColor="var(--green)" />
                  <Reading
                    label="Intensity Range"
                    connected={showLive && lamps.length > 0}
                    rawText={`${ldrMin}–${ldrMax}`}
                    unit="percent"
                  />
                </div>
              </div>
            </div>

            {/* Motion */}
            {pirEnabled && (
              <div className="card sensor-panel sensor-panel-motion">
                <MotionCard
                  motionActive={motionActive}
                  movingLamps={movingLamps}
                  connected={showLive}
                  icon={<CircleDot size={18} aria-hidden="true" />}
                />
              </div>
            )}

            {/* GPS */}
            <div className="sensor-panel sensor-panel-gps">
              <GpsCard />
            </div>
          </div>

          {/* Lamp grid */}
          <div className="section-label">Lamp Network</div>
          <div style={{ marginBottom: '24px' }}>
            <div className="lamp-section-head">
              <div className="lamp-section-title">
                Block A — All Lamps{' '}
                <em style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: '300', color: 'var(--ink3)' }}>
                  ({lamps.length} units)
                </em>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="search-bar">
                  <Search size={14} className="icon-inline" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search lamps…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="filter-pills">
                  {['All', 'Working', 'Faults', 'Warnings', 'Standby'].map(f => (
                    <div
                      key={f}
                      className={`pill ${filterPill === f ? 'active-pill' : ''}`}
                      onClick={() => setFilterPill(f)}
                    >{f}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lamp-grid">
              {filteredLamps.map(lamp => {
                const Icon = STATUS_ICONS[lamp.status] || Lightbulb;
                const bc = lamp.status === 'ok' ? 'badge-ok'
                  : lamp.status === 'fault' ? 'badge-fault'
                    : lamp.status === 'warn' ? 'badge-warn'
                      : 'badge-standby';
                const iconColor = STATUS_COLORS[lamp.status] || 'var(--ink2)';
                return (
                  <div
                    key={lamp.id}
                    className={`lamp-card ${lamp.status}`}
                    onClick={() => router.push(`/lamp/${lamp.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') router.push(`/lamp/${lamp.id}`); }}
                    title={`Click to view ${lamp.label}`}
                  >
                    <span className="lamp-bulb" aria-hidden="true">
                      <Icon size={26} color={iconColor} strokeWidth={1.8} />
                    </span>
                    <div className="lamp-card-body">
                      <div className="lamp-num">LAMP {String(lamp.id).padStart(2, '0')}</div>
                      <span className={`lamp-status-badge ${bc}`}>{STATUS_LABELS[lamp.status]}</span>
                      <div className="lamp-stat">
                        I:{' '}
                        <SensorValue
                          value={lamp.current}
                          connected={showLive}
                          format={v => v.toFixed(2)}
                          unit="A"
                          style={{ color: lamp.status === 'fault' ? 'var(--red)' : lamp.status === 'warn' ? 'var(--amber-dark)' : '' }}
                        />
                      </div>
                      <div className="lamp-stat">
                        LDR: <SensorValue value={lamp.ldr} connected={showLive} unit="%" />
                      </div>
                      <div className="lamp-stat">
                        Temp: <SensorValue value={lamp.temp} connected={showLive} unit="°C" />
                      </div>
                      <div className="lamp-click-hint">Click to inspect →</div>
                    </div>
                  </div>
                );
              })}
              {filteredLamps.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '32px', color: 'var(--ink3)', fontSize: '14px' }}>
                  No lamps matching &ldquo;{searchQuery || filterPill}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* Bottom diagnostics */}
          <div className="section-label">Diagnostics</div>
          <div className="bottom-row">
            <div className="card">
              <div className="card-head">
                <span className="card-title">Lamp Status Distribution — Today</span>
                <span className="card-badge" style={{ background: 'var(--amber-light)', color: 'var(--amber-dark)' }}>24H</span>
              </div>
              <div className="card-body">
                <div className="energy-bars">
                  {ENERGY_DATA.map(d => {
                    const t = d.ok + d.fault + d.warn + d.standby, H = 130;
                    const okH = Math.round(d.ok / t * H), fH = Math.round(d.fault / t * H), wH = Math.round(d.warn / t * H), sH = Math.round(d.standby / t * H);
                    return (
                      <div className="e-col" key={d.label}>
                        {sH > 0 && <div className="e-bar" style={{ height: `${sH}px`, background: 'var(--ink4)', opacity: 0.4 }}></div>}
                        {wH > 0 && <div className="e-bar" style={{ height: `${wH}px`, background: 'var(--amber)' }}></div>}
                        {fH > 0 && <div className="e-bar" style={{ height: `${fH}px`, background: 'var(--red)' }}></div>}
                        {okH > 0 && <div className="e-bar" style={{ height: `${okH}px`, background: 'var(--green)' }}></div>}
                        <div className="e-col-label">{d.label}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="e-legend">
                  <div className="e-leg"><div className="e-leg-dot" style={{ background: 'var(--green)' }}></div>Working</div>
                  <div className="e-leg"><div className="e-leg-dot" style={{ background: 'var(--red)' }}></div>Faulted</div>
                  <div className="e-leg"><div className="e-leg-dot" style={{ background: 'var(--amber)' }}></div>Wastage</div>
                  <div className="e-leg"><div className="e-leg-dot" style={{ background: 'var(--ink4)' }}></div>Standby</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <span className="card-title">Alert History</span>
                <span className="card-badge" style={{ background: 'var(--cream2)', color: 'var(--ink2)' }}>{alertLog.length} EVENTS</span>
              </div>
              <div className="card-body" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {alertLog.map((a, i) => (
                  <div className="log-item" key={a.id || i}>
                    <div className="log-indicator">
                      <div className="log-dot" style={{ background: STATUS_COLORS[a.type] || 'var(--blue)' }}></div>
                      <div className="log-line"></div>
                    </div>
                    <div className="log-body">
                      <div className="log-time">{a.time}</div>
                      <div className="log-title" style={{ color: STATUS_COLORS[a.type] || 'var(--blue)' }}>{a.title}</div>
                      <div className="log-msg">{a.msg}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </main>

      {/* Connection bar — global toast, lives outside .content. */}
      {connBarMsg && (
        <div className={`conn-bar ${isOnline ? 'online' : ''}`}>{connBarMsg}</div>
      )}
    </>
  );
}

/* ── Sub-components ── */

/**
 * KpiCard — single metric tile. Centralised so all four KPIs share one
 * implementation, keeping the icon/value/sub/trend layout consistent.
 */
function KpiCard({ label, icon, accent, accentLight, value, connected, sub, trend }) {
  return (
    <div className="kpi-card">
      <div className="bg-shape" style={{ background: accent }}></div>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon" style={{ background: accentLight, color: accent }}>{icon}</div>
      </div>
      <div className="kpi-val" style={{ color: accent }}>
        <SensorValue value={value} connected={connected} />
      </div>
      <div className="kpi-sub">{sub}</div>
      <div className="kpi-trend" style={{ background: accentLight, color: accent, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {trend}
      </div>
    </div>
  );
}

/**
 * Reading — small labeled value tile in the sensor cards.
 * Either pass a numeric `value` (formatted via SensorValue) or a precomputed
 * `rawText` (still gated on `connected`).
 */
function Reading({ label, value, rawText, connected, format, unit, valueColor }) {
  // Two display modes: (a) numeric value formatted via SensorValue, or
  // (b) precomputed `rawText` (e.g. "5–88") shown only when connected.
  return (
    <div className="reading-card">
      <div className="reading-label">{label}</div>
      <div className="reading-val" style={valueColor ? { color: valueColor } : undefined}>
        {rawText !== undefined
          ? (
            <span className={`sensor-value${connected ? '' : ' sensor-value-off'}`}>
              {connected ? rawText : '--'}
            </span>
          )
          : <SensorValue value={value} connected={connected} format={format} />}
      </div>
      {unit && <div className="reading-unit">{unit}</div>}
    </div>
  );
}

function FaultStatusCard({ lamps, connected, showPir }) {
  const faultLamp = lamps.find(l => l.status === 'fault');
  const warnLamp = lamps.find(l => l.status === 'warn');
  const primary = faultLamp || warnLamp;

  const color = faultLamp ? 'var(--red)' : warnLamp ? 'var(--amber)' : 'var(--green)';
  const badgeBg = faultLamp ? 'var(--red-light)' : warnLamp ? 'var(--amber-light)' : 'var(--green-light)';
  const badgeLabel = faultLamp ? 'FAULT' : warnLamp ? 'WASTAGE' : 'NORMAL';
  const arcOffset = faultLamp ? 200 : warnLamp ? 120 : 30;
  const StatusIcon = faultLamp ? AlertTriangle : warnLamp ? Zap : CheckCircle2;
  const label = faultLamp ? 'Fused Bulb' : warnLamp ? 'Ghost / Wastage' : 'All Working';
  const desc = faultLamp
    ? `Current ON (${faultLamp.current?.toFixed(2)}A) but bulb is dark (LDR=${faultLamp.ldr}%).\nLamp #${faultLamp.id} — bulb fused, replace immediately.`
    : warnLamp
      ? `Bulb lit (LDR=${warnLamp.ldr}%) but relay is OFF.\nLamp #${warnLamp.id} — possible ghost illumination.`
      : lamps.length ? 'All lamps operating normally.\nNo faults detected.' : 'No lamps connected yet.';

  const sampleLamp = primary || lamps[0];

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Fault Detection</span>
        <span className="card-badge" style={{ background: badgeBg, color }}>{badgeLabel}</span>
      </div>
      <div className="card-body">
        <div className="status-center">
          <div className="status-ring-wrap">
            <svg className="status-ring-svg" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="44" fill="none" stroke="#f0ece5" strokeWidth="8" />
              <circle cx="55" cy="55" r="44" fill="none" stroke={color} strokeWidth="8"
                strokeLinecap="round" strokeDasharray="276 276" strokeDashoffset={arcOffset}
                transform="rotate(-90 55 55)"
                style={{ transition: 'stroke 0.5s, stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
              />
            </svg>
            <div className="status-ring-inner">
              <StatusIcon size={28} color={color} aria-hidden="true" />
            </div>
          </div>
          <div className="status-label" style={{ color }}>{label}</div>
          <div className="status-desc">
            {desc.split('\n').map((l, i) => <span key={i}>{l}{i < desc.split('\n').length - 1 && <br />}</span>)}
          </div>
        </div>
        <div className="logic-rows">
          <div className="logic-row">
            <span className="logic-key">LDR (Bulb Light)</span>
            <span className={`logic-val ${(sampleLamp?.ldr || 0) > 30 ? 'ok' : 'warn'}`}>
              {connected
                ? `${(sampleLamp?.ldr || 0) > 30 ? 'EMITTING' : 'DARK'} (${sampleLamp?.ldr || 0}%)`
                : '--'}
            </span>
          </div>
          <div className="logic-row">
            <span className="logic-key">Current Draw</span>
            <span className={`logic-val ${faultLamp ? 'bad' : 'ok'}`}>
              <SensorValue value={sampleLamp?.current} connected={connected} format={v => v.toFixed(2)} unit=" A" />
            </span>
          </div>
          {showPir && (
            <div className="logic-row">
              <span className="logic-key">PIR Motion</span>
              <span className={`logic-val ${sampleLamp?.pir ? 'warn' : 'ok'}`}>
                {connected ? (sampleLamp?.pir ? 'IN MOTION' : 'STABLE') : '--'}
              </span>
            </div>
          )}
          <div className="logic-row">
            <span className="logic-key">Temperature</span>
            <span className="logic-val neutral">
              <SensorValue value={sampleLamp?.temp} connected={connected} unit="°C" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MotionCard({ motionActive, movingLamps, connected, icon }) {
  const label = motionActive ? 'Motion Detected' : 'Stable';
  const accent = motionActive ? 'var(--amber)' : 'var(--green)';
  const badgeBg = motionActive ? 'var(--amber-light)' : 'var(--green-light)';
  const badgeLabel = motionActive ? 'IN MOTION' : 'STABLE';

  return (
    <>
      <div className="card-head">
        <span className="card-title">Motion Sensor</span>
        <span className="card-badge" style={{ background: badgeBg, color: accent }}>{badgeLabel}</span>
      </div>
      <div className="card-body">
        <div className="motion-status">
          <div className={`motion-orb ${motionActive && connected ? 'active' : ''}`} style={{ background: accent }}></div>
          <div>
            <div className="motion-label" style={{ color: accent }}>{connected ? label : '--'}</div>
            <div className="motion-sub">
              {connected
                ? `${movingLamps.length} lamp${movingLamps.length === 1 ? '' : 's'} reporting movement`
                : 'Waiting for live data'}
            </div>
          </div>
          <div className="motion-icon" style={{ color: accent }}>{icon}</div>
        </div>

        <div className="motion-list">
          {connected && movingLamps.length > 0 ? (
            movingLamps.slice(0, 6).map(l => (
              <span className="motion-chip" key={l.id}>L{String(l.id).padStart(2, '0')}</span>
            ))
          ) : (
            <span className="motion-empty">No movement right now</span>
          )}
          {connected && movingLamps.length > 6 && (
            <span className="motion-chip">+{movingLamps.length - 6}</span>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * GpsCard — shows the USER'S current device location via browser Geolocation.
 * (This card is independent of the Arduino — geolocation comes from the
 * browser, so it stays live even when hardware is offline.)
 */
function GpsCard() {
  const [geoState, setGeoState] = useState('idle');   // 'idle' | 'success' | 'denied'
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoState('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          altitude: pos.coords.altitude ? pos.coords.altitude.toFixed(1) : null,
        });
        setGeoState('success');
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Your Location</span>
        <span className="card-badge" style={{
          background: geoState === 'success' ? 'var(--green-light)' : geoState === 'denied' ? 'var(--red-light)' : 'var(--blue-light)',
          color: geoState === 'success' ? 'var(--green)' : geoState === 'denied' ? 'var(--red)' : 'var(--blue)',
        }}>
          {geoState === 'success' ? 'LIVE GPS' : geoState === 'denied' ? 'DENIED' : 'ACQUIRING…'}
        </span>
      </div>

      <div className="card-body">
        <div className="gps-map-preview" style={{
          background: geoState === 'success'
            ? 'linear-gradient(135deg, var(--blue-light), var(--cream2))'
            : 'var(--cream2)',
        }}>
          <div className="gps-map-grid"></div>

          {['60px', '100px', '140px'].map((size, i) => (
            <div key={size} className="gps-circle" style={{
              width: size, height: size,
              top: '50%', left: '50%',
              opacity: geoState === 'idle' ? [0.8, 0.5, 0.25][i] : [0.6, 0.35, 0.15][i],
              borderColor: geoState === 'success' ? 'rgba(26,138,82,0.4)' : 'rgba(29,101,184,0.3)',
              animation: geoState === 'idle' ? `gpsRingPulse ${1.2 + i * 0.4}s ease-in-out infinite alternate` : 'none',
            }} />
          ))}

          <div className="gps-pin" style={{
            filter: geoState === 'success'
              ? 'drop-shadow(0 2px 8px rgba(26,138,82,0.5))'
              : geoState === 'denied'
                ? 'grayscale(1) opacity(0.4)'
                : 'drop-shadow(0 2px 8px rgba(29,101,184,0.4))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {geoState === 'denied'
              ? <MapPinOff size={26} aria-hidden="true" />
              : <MapPin size={26} aria-hidden="true" />}
          </div>
        </div>

        {geoState === 'idle' && (
          <div style={{ textAlign: 'center', padding: '8px 0', color: 'var(--ink3)', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
            <Hourglass size={12} className="icon-inline" aria-hidden="true" />
            Requesting location permission…
          </div>
        )}

        {geoState === 'denied' && (
          <div style={{
            background: 'var(--red-light)', border: '1px solid rgba(214,49,49,0.2)',
            borderRadius: 'var(--radius-xs)', padding: '10px 12px',
            fontSize: '12px', color: 'var(--red)', marginBottom: '8px', lineHeight: 1.5,
            display: 'flex', alignItems: 'flex-start', gap: '8px',
          }}>
            <MapPinOff size={14} className="icon-inline" aria-hidden="true" />
            <div>
              Location access was denied.<br />
              <span style={{ color: 'var(--ink2)' }}>
                Enable it in browser settings to see your real coordinates.
              </span>
            </div>
          </div>
        )}

        {geoState === 'success' && position && (<>
          <div className="gps-row">
            <span className="gps-key">Latitude</span>
            <span className="gps-val">{position.lat.toFixed(6)}° N</span>
          </div>
          <div className="gps-row">
            <span className="gps-key">Longitude</span>
            <span className="gps-val">{position.lng.toFixed(6)}° E</span>
          </div>
          <div className="gps-row">
            <span className="gps-key">Accuracy</span>
            <span className="gps-val" style={{ color: 'var(--green)' }}>±{position.accuracy} m</span>
          </div>
          <div className="gps-row">
            <span className="gps-key">Altitude</span>
            <span className="gps-val">{position.altitude ? `${position.altitude} m` : 'N/A'}</span>
          </div>
          <a
            className="gps-maps-link"
            href={`https://www.google.com/maps?q=${position.lat},${position.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <MapIcon size={13} aria-hidden="true" />
            Open My Location in Google Maps
            <Navigation size={12} aria-hidden="true" />
          </a>
        </>)}
      </div>

      <style>{`
        @keyframes gpsRingPulse {
          from { transform: translate(-50%, -50%) scale(0.92); opacity: 0.6; }
          to   { transform: translate(-50%, -50%) scale(1.08); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
