'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import CurrentChart from '../../../components/CurrentChart';
import { useHardwareData, useLampHistory } from '../../../components/useHardwareData';
import { STATUS_COLORS, STATUS_LABELS, STATUS_BULBS } from '../../../lib/lampData';

/* Leaflet is browser-only — we dynamic-import the map component */
import dynamic from 'next/dynamic';
const LampMap = dynamic(() => import('../../../components/LampMap'), {
  ssr: false, loading: () => (
    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream2)', borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--ink3)' }}>
      Loading map…
    </div>
  )
});

export default function LampDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lampId = parseInt(params.id, 10);

  const { lamps, isOnline, uptime, alertLog, simulating, toggleSimulate } = useHardwareData();
  const [isDark, setIsDark] = useState(false);

  const lamp = lamps.find(l => l.id === lampId);
  // useLampHistory now reads from global context — no currentValue arg needed
  const history = useLampHistory(lampId);

  // Dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  if (!lamp) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '48px' }}>🔍</div>
        <div style={{ fontSize: '18px', color: 'var(--ink2)' }}>Lamp #{lampId} not found</div>
        <Link href="/" className="back-btn">← Back to Dashboard</Link>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[lamp.status] || 'var(--ink)';
  const statusLabel = STATUS_LABELS[lamp.status] || lamp.status;
  const bulb = STATUS_BULBS[lamp.status] || '💡';
  const lampAlerts = alertLog.filter(a => a.title?.includes(`#${lampId}`));
  const allLampsForMap = lamps; // Pass all for network view on map

  return (
    <div className="app">
      <Sidebar isOnline={isOnline} alertCount={alertLog.length} />
      <div className="main">
        <Topbar
          breadcrumb={`Lamp #${lamp.id} — ${lamp.label}`}
          isOnline={isOnline}
          uptime={uptime}
          isDark={isDark}
          onThemeToggle={() => setIsDark(d => !d)}
          onSimulate={toggleSimulate}
          simulating={simulating}
        />

        <main className="content">
          {/* Header */}
          <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link href="/" className="back-btn">← Back</Link>
              <div>
                <div className="page-eyebrow">Block A · Unit {String(lamp.id).padStart(2, '0')}</div>
                <h1 className="page-title">{lamp.label} <em>Detail</em></h1>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Prev / Next lamp nav */}
              {lampId > 1 && (
                <button className="back-btn" onClick={() => router.push(`/lamp/${lampId - 1}`)}>← Lamp {lampId - 1}</button>
              )}
              {lampId < lamps.length && (
                <button className="back-btn" onClick={() => router.push(`/lamp/${lampId + 1}`)}>Lamp {lampId + 1} →</button>
              )}
            </div>
          </div>

          {/* Status hero */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* Big status card */}
            <div className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px', lineHeight: 1 }}>{bulb}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '6px' }}>
                LAMP {String(lamp.id).padStart(2, '0')}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '600', color: statusColor, marginBottom: '4px' }}>
                {statusLabel}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink3)', marginBottom: '20px' }}>{lamp.label}</div>

              <div style={{
                background: `${statusColor}15`,
                border: `1px solid ${statusColor}30`,
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                fontSize: '11px', color: statusColor, fontWeight: '600', letterSpacing: '0.04em'
              }}>
                {lamp.status === 'ok' ? '✓ Operating normally' :
                  lamp.status === 'fault' ? '✗ Requires maintenance' :
                    lamp.status === 'warn' ? '⚡ Energy wastage active' :
                      '◦ Standby mode'}
              </div>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="logic-row" style={{ padding: '6px 0' }}>
                  <span className="logic-key" style={{ fontSize: '11px' }}>Current</span>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: statusColor }}>{(lamp.current || 0).toFixed(2)}A</span>
                </div>
                <div className="logic-row" style={{ padding: '6px 0' }}>
                  <span className="logic-key" style={{ fontSize: '11px' }}>LDR (Bulb Light)</span>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: lamp.ldr > 30 ? 'var(--green)' : 'var(--red)' }}>
                    {lamp.ldr}% — {lamp.ldr > 30 ? 'EMITTING' : 'DARK'}
                  </span>
                </div>
                <div className="logic-row" style={{ padding: '6px 0' }}>
                  <span className="logic-key" style={{ fontSize: '11px' }}>Temp</span>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--ink)' }}>{lamp.temp || '--'}°C</span>
                </div>
                <div className="logic-row" style={{ padding: '6px 0', border: 'none' }}>
                  <span className="logic-key" style={{ fontSize: '11px' }}>PIR</span>
                  <span style={{ fontWeight: '700', fontSize: '12px', color: lamp.pir ? 'var(--amber)' : 'var(--green)' }}>{lamp.pir ? 'DETECTED' : 'CLEAR'}</span>
                </div>
              </div>
            </div>

            {/* Current history chart */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">Current History — ACS712 Sensor</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="card-badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>LIVE</span>
                  <span style={{ fontSize: '11px', color: 'var(--ink3)' }}>Updates every 3s</span>
                </div>
              </div>
              <div className="card-body">
                <div style={{ height: '180px', position: 'relative' }}>
                  <CurrentChart
                    data={history}
                    color={lamp.status === 'fault' ? 'rgb(214,49,49)' : lamp.status === 'warn' ? 'rgb(232,130,12)' : 'rgb(29,101,184)'}
                  />
                </div>
                <div className="chart-meta" style={{ marginTop: '8px' }}><span>← 90s ago</span><span>now →</span></div>

                {/* Inline analytics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginTop: '12px' }}>
                  {[
                    { label: 'Latest', val: `${(lamp.current || 0).toFixed(2)}A`, color: statusColor },
                    { label: 'Min', val: `${Math.min(...history).toFixed(2)}A`, color: 'var(--ink3)' },
                    { label: 'Max', val: `${Math.max(...history).toFixed(2)}A`, color: 'var(--ink3)' },
                    { label: 'Avg', val: `${(history.reduce((a, v) => a + v, 0) / history.length).toFixed(2)}A`, color: 'var(--ink3)' },
                  ].map(s => (
                    <div className="reading-card" key={s.label}>
                      <div className="reading-label">{s.label}</div>
                      <div className="reading-val" style={{ color: s.color, fontSize: '18px' }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* MAP */}
          <div className="section-label">Location & Network Map</div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-head">
              <span className="card-title">GPS Location — Lamp #{lamp.id}: {lamp.label}</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="card-badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>NEO-6M GPS</span>
                <a
                  href={`https://www.google.com/maps?q=${lamp.lat},${lamp.lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="gps-maps-link"
                  style={{ padding: '4px 10px', marginTop: 0, fontSize: '11px' }}
                >🗺 Google Maps ↗</a>
              </div>
            </div>
            <div className="card-body" style={{ padding: '0' }}>
              {/* Fixed height wrapper — LampMap uses height:100% internally */}
              <div style={{ height: '320px' }}>
                <LampMap lamps={allLampsForMap} focusedLampId={lampId} />
              </div>
            </div>

            {/* Coordinate row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'var(--border)', borderTop: '1px solid var(--border)' }}>
              {[
                { k: 'Latitude', v: `${lamp.lat?.toFixed(6)}° N` },
                { k: 'Longitude', v: `${lamp.lng?.toFixed(6)}° E` },
                { k: 'Altitude', v: '14.2 m' },
                { k: 'Satellites', v: '9 locked' },
              ].map(row => (
                <div key={row.k} style={{ background: 'var(--white)', padding: '12px 16px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{row.k}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--blue)', fontFamily: 'var(--font-display)' }}>{row.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Fault logic explanation and lamp alerts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Logic card */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">Fault Detection Logic</span>
                <span className="card-badge" style={{ background: 'var(--purple-light)', color: 'var(--purple)' }}>RULE ENGINE</span>
              </div>
              <div className="card-body">
                <FaultLogicExplainer lamp={lamp} />
              </div>
            </div>

            {/* Lamp-specific alerts */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">Lamp #{lampId} Alert History</span>
                <span className="card-badge" style={{ background: 'var(--cream2)', color: 'var(--ink2)' }}>{lampAlerts.length} EVENTS</span>
              </div>
              <div className="card-body" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                {lampAlerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--ink3)', fontSize: '13px' }}>
                    ✅ No alerts for this lamp
                  </div>
                ) : lampAlerts.map((a, i) => (
                  <div className="log-item" key={i}>
                    <div className="log-indicator">
                      <div className="log-dot" style={{ background: STATUS_COLORS[a.type] || 'var(--blue)' }}></div>
                      <div className="log-line"></div>
                    </div>
                    <div className="log-body">
                      <div className="log-time">{a.time}</div>
                      <div className="log-title" style={{ color: STATUS_COLORS[a.type] }}>{a.title}</div>
                      <div className="log-msg">{a.msg}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function FaultLogicExplainer({ lamp }) {
  // LDR is aimed at the BULB — HIGH reading = bulb is emitting light
  const bulbLit = (lamp.ldr || 0) > 30;    // bulb emitting light
  const hasCurrent = (lamp.current || 0) > 0.1; // relay energised (ACS712)

  const rules = [
    {
      condition: 'Current ON + Bulb Lit (LDR HIGH)',
      result: 'Working ✓',
      detail: 'Relay energised, bulb glowing normally.',
      active: hasCurrent && bulbLit,
      color: 'var(--green)',
    },
    {
      condition: 'Current ON + Bulb Dark (LDR LOW)',
      result: 'Fused Bulb ✗',
      detail: 'Power is flowing but the bulb emits no light → bulb is fused.',
      active: hasCurrent && !bulbLit,
      color: 'var(--red)',
    },
    {
      condition: 'Current OFF + Bulb Lit (LDR HIGH)',
      result: 'Wastage / Ghost ⚡',
      detail: 'No relay current but LDR detects light → abnormal or external source.',
      active: !hasCurrent && bulbLit,
      color: 'var(--amber)',
    },
    {
      condition: 'Current OFF + Bulb Dark (LDR LOW)',
      result: 'Standby / OFF ○',
      detail: 'No power, no light → lamp is correctly switched off.',
      active: !hasCurrent && !bulbLit,
      color: 'var(--ink3)',
    },
  ];

  return (
    <div>
      {/* Sensor inputs */}
      <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--cream)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', color: 'var(--ink3)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>Live Sensor Inputs</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ padding: '8px 10px', background: 'var(--white)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--ink3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACS712 — Current</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: hasCurrent ? 'var(--green)' : 'var(--red)' }}>
              {(lamp.current || 0).toFixed(2)} A
            </div>
            <div style={{ fontSize: '10px', color: hasCurrent ? 'var(--green)' : 'var(--red)', marginTop: '2px', fontWeight: '600' }}>
              → Relay {hasCurrent ? 'ENERGISED' : 'OFF'}
            </div>
          </div>
          <div style={{ padding: '8px 10px', background: 'var(--white)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', color: 'var(--ink3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LDR — Bulb Light</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: bulbLit ? 'var(--green)' : 'var(--red)' }}>
              {lamp.ldr || 0} %
            </div>
            <div style={{ fontSize: '10px', color: bulbLit ? 'var(--green)' : 'var(--red)', marginTop: '2px', fontWeight: '600' }}>
              → Bulb {bulbLit ? 'EMITTING LIGHT' : 'DARK / FUSED'}
            </div>
          </div>
        </div>
      </div>

      {/* Decision rules */}
      {rules.map(r => (
        <div key={r.condition} style={{
          padding: '10px 12px', marginBottom: '6px',
          borderRadius: 'var(--radius-xs)',
          background: r.active ? `${r.color}12` : 'var(--cream)',
          border: `1.5px solid ${r.active ? r.color + '40' : 'var(--border)'}`,
          transition: 'all 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: r.active ? '4px' : '0' }}>
            <div style={{ fontSize: '12px', color: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {r.active && <span style={{ fontSize: '14px' }}>▶</span>}
              {r.condition}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: r.active ? r.color : 'var(--ink4)', flexShrink: 0, marginLeft: '8px' }}>{r.result}</div>
          </div>
          {r.active && (
            <div style={{ fontSize: '11px', color: 'var(--ink3)', marginTop: '2px' }}>{r.detail}</div>
          )}
        </div>
      ))}

      <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--ink3)', lineHeight: 1.6, padding: '8px 10px', background: 'var(--blue-light)', borderRadius: 'var(--radius-xs)' }}>
        ℹ <strong>How LDR works here:</strong> The LDR sensor is pointed directly at the lamp bulb. A HIGH reading (&gt;30%) means the bulb is glowing. A LOW reading means the bulb is dark — even if current is flowing (= fused bulb fault).
      </div>
    </div>
  );
}
