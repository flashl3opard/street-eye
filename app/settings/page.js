'use client';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { useHardwareData } from '../../components/useHardwareData';
import { DATA_URL, POLL_INTERVAL_MS } from '../../lib/lampData';

export default function SettingsPage() {
  const { lamps, isOnline, uptime, alertLog, simulating, toggleSimulate } = useHardwareData();
  const [isDark, setIsDark] = useState(false);
  const [hardwareUrl, setHardwareUrl] = useState(DATA_URL);
  const [pollInterval, setPollInterval] = useState(POLL_INTERVAL_MS / 1000);
  const [nightThreshold, setNightThreshold] = useState(20);
  const [faultThreshold, setFaultThreshold] = useState(0.1);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Section = ({ title, children }) => (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div className="card-head"><span className="card-title">{title}</span></div>
      <div className="card-body">{children}</div>
    </div>
  );

  const Field = ({ label, hint, children }) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--ink)', marginBottom: '4px' }}>{label}</label>
      {hint && <div style={{ fontSize: '11px', color: 'var(--ink3)', marginBottom: '6px' }}>{hint}</div>}
      {children}
    </div>
  );

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
    background: 'var(--cream2)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none',
  };

  return (
    <div className="app">
      <Sidebar isOnline={isOnline} alertCount={alertLog.length} />
      <div className="main">
        <Topbar breadcrumb="Settings" isOnline={isOnline} uptime={uptime} isDark={isDark}
          onThemeToggle={() => setIsDark(d => !d)} />
        <main className="content">
          <div className="page-header">
            <div>
              <div className="page-eyebrow">System Configuration</div>
              <h1 className="page-title">Dashboard <em>Settings</em></h1>
            </div>
          </div>

          <div style={{ maxWidth: '600px' }}>
            <Section title="Hardware Connection">
              <Field label="ESP32 / NodeMCU Endpoint URL" hint="The HTTP endpoint your hardware serves data on. Ensure the device is on the same network.">
                <input type="text" style={inputStyle} value={hardwareUrl} onChange={e => setHardwareUrl(e.target.value)} />
              </Field>
              <Field label="Poll Interval (seconds)" hint="How often to fetch fresh data from the hardware.">
                <input type="number" style={{ ...inputStyle, width: '120px' }} min="1" max="60" value={pollInterval} onChange={e => setPollInterval(e.target.value)} />
              </Field>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', fontSize: '12px' }}>
                <div className={`pulse-dot ${isOnline ? '' : 'offline'}`}></div>
                <span>{isOnline ? '✅ Hardware connected at current URL' : '⚠️  Hardware not reachable at current URL'}</span>
              </div>
            </Section>

            <Section title="Fault Detection Thresholds">
              <Field label="Night / Day LDR Threshold (%)" hint="LDR% below this value is considered nighttime. Lamps should be ON at night.">
                <input type="range" min="5" max="60" value={nightThreshold} onChange={e => setNightThreshold(e.target.value)}
                  style={{ width: '100%', marginBottom: '6px' }} />
                <div style={{ fontSize: '12px', color: 'var(--ink2)' }}>Current threshold: <strong>{nightThreshold}%</strong> — LDR &lt; {nightThreshold}% = Night</div>
              </Field>
              <Field label="Minimum Current for 'Lamp ON' (A)" hint="Current below this value is treated as lamp OFF / fused.">
                <input type="range" min="0.01" max="1" step="0.01" value={faultThreshold} onChange={e => setFaultThreshold(e.target.value)}
                  style={{ width: '100%', marginBottom: '6px' }} />
                <div style={{ fontSize: '12px', color: 'var(--ink2)' }}>Current threshold: <strong>{faultThreshold}A</strong> — current &lt; {faultThreshold}A = lamp OFF</div>
              </Field>
            </Section>

            <Section title="Display">
              <Field label="Theme">
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[['☀️ Light', false], ['🌙 Dark', true]].map(([l, v]) => (
                    <div key={l}
                      onClick={() => setIsDark(v)}
                      style={{
                        padding: '10px 20px', borderRadius: 'var(--radius-xs)', cursor: 'pointer',
                        border: `1.5px solid ${isDark === v ? 'var(--amber)' : 'var(--border)'}`,
                        background: isDark === v ? 'var(--amber-light)' : 'var(--cream2)',
                        fontWeight: isDark === v ? '600' : '400',
                        fontSize: '13px', color: 'var(--ink)', transition: 'all 0.18s',
                      }}
                    >{l}</div>
                  ))}
                </div>
              </Field>
            </Section>

            <Section title="Simulation">
              <Field label="Hardware Simulation Mode" hint="Enable simulation to demo the dashboard without physical hardware connected.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    className={`sim-btn ${simulating ? 'stop' : ''}`}
                    onClick={toggleSimulate}
                    style={{ padding: '10px 20px' }}
                  >{simulating ? '⏹ Stop Simulation' : '▶ Start Simulation'}</button>
                  <span style={{ fontSize: '12px', color: simulating ? 'var(--amber)' : 'var(--ink3)' }}>
                    {simulating ? '⚡ Simulation active — cycles through fault states every 3s' : 'Simulation inactive'}
                  </span>
                </div>
              </Field>
            </Section>

            <button
              onClick={handleSave}
              style={{
                width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)',
                background: saved ? 'var(--green)' : 'var(--ink)',
                color: '#fff', border: 'none', fontFamily: 'var(--font-body)',
                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                transition: 'background 0.3s',
              }}
            >{saved ? '✓ Saved!' : 'Save Settings'}</button>
          </div>
        </main>
      </div>
    </div>
  );
}
