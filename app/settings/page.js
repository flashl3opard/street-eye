'use client';
import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Sun, Moon, Play, Square, Zap } from 'lucide-react';
import { useHardwareData } from '../../components/useHardwareData';

export default function SettingsPage() {
  const {
    isOnline, simulating, toggleSimulate,
    isDark, setIsDark,
    settings, updateSettings,
  } = useHardwareData();

  // Local form state — committed to context (and localStorage) on Save.
  // Keeping a draft step lets the user edit without firing a poll on every
  // keystroke, and gives us a clear "unsaved changes" UX target.
  const [draftUrl, setDraftUrl] = useState(settings.hardwareUrl);
  const [draftIntervalSecs, setDraftIntervalSecs] = useState(settings.pollIntervalMs / 1000);
  const [saved, setSaved] = useState(false);

  const dirty = draftUrl !== settings.hardwareUrl
    || Number(draftIntervalSecs) * 1000 !== settings.pollIntervalMs;

  const handleSave = () => {
    const seconds = Math.max(1, Math.min(60, Number(draftIntervalSecs) || 3));
    updateSettings({
      hardwareUrl: draftUrl.trim() || settings.hardwareUrl,
      pollIntervalMs: seconds * 1000,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setDraftUrl(settings.hardwareUrl);
    setDraftIntervalSecs(settings.pollIntervalMs / 1000);
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
    <main className="content">
          <div className="page-header">
            <div>
              <div className="page-eyebrow">System Configuration</div>
              <h1 className="page-title">Dashboard <em>Settings</em></h1>
            </div>
          </div>

          <div style={{ maxWidth: '600px' }}>
            <Section title="Hardware Connection">
              <Field
                label="ESP32 / NodeMCU Endpoint URL"
                hint="The HTTP endpoint your hardware serves data on. Defaults to NEXT_PUBLIC_HARDWARE_URL; this override is saved per-browser."
              >
                <input
                  type="text"
                  style={inputStyle}
                  value={draftUrl}
                  placeholder="http://192.168.x.x/data"
                  onChange={e => setDraftUrl(e.target.value)}
                />
              </Field>
              <Field label="Poll Interval (seconds)" hint="How often to fetch fresh data from the hardware. Range 1–60 seconds.">
                <input
                  type="number"
                  style={{ ...inputStyle, width: '120px' }}
                  min="1"
                  max="60"
                  value={draftIntervalSecs}
                  onChange={e => setDraftIntervalSecs(e.target.value)}
                />
              </Field>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', fontSize: '12px' }}>
                <div className={`pulse-dot ${isOnline ? '' : 'offline'}`}></div>
                {isOnline
                  ? <><CheckCircle2 size={14} color="var(--green)" aria-hidden="true" /> <span>Hardware connected at current URL</span></>
                  : <><AlertTriangle size={14} color="var(--amber)" aria-hidden="true" /> <span>Hardware not reachable at current URL</span></>}
              </div>
            </Section>

            <Section title="Display">
              <Field label="Theme">
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { key: 'light', label: 'Light', dark: false, Icon: Sun },
                    { key: 'dark', label: 'Dark', dark: true, Icon: Moon },
                  ].map(({ key, label, dark, Icon }) => {
                    const active = isDark === dark;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setIsDark(dark)}
                        style={{
                          padding: '10px 20px', borderRadius: 'var(--radius-xs)', cursor: 'pointer',
                          border: `1.5px solid ${active ? 'var(--amber)' : 'var(--border)'}`,
                          background: active ? 'var(--amber-light)' : 'var(--cream2)',
                          fontWeight: active ? 600 : 400,
                          fontSize: '13px', color: 'var(--ink)', transition: 'all 0.18s',
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                        }}
                      >
                        <Icon size={14} aria-hidden="true" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </Section>

            <Section title="Simulation">
              <Field label="Hardware Simulation Mode" hint="Enable simulation to demo the dashboard without physical hardware connected.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    className={`sim-btn ${simulating ? 'stop' : ''}`}
                    onClick={toggleSimulate}
                    style={{ padding: '10px 20px' }}
                  >
                    {simulating
                      ? <><Square size={12} aria-hidden="true" /> Stop Simulation</>
                      : <><Play size={12} aria-hidden="true" /> Start Simulation</>}
                  </button>
                  <span style={{ fontSize: '12px', color: simulating ? 'var(--amber)' : 'var(--ink3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {simulating
                      ? <><Zap size={12} aria-hidden="true" /> Simulation active — cycles through fault states every 3s</>
                      : 'Simulation inactive'}
                  </span>
                </div>
              </Field>
            </Section>

            <div style={{ display: 'flex', gap: '8px' }}>
              {dirty && !saved && (
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--cream2)', color: 'var(--ink2)',
                    border: '1px solid var(--border)', fontFamily: 'var(--font-body)',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.18s',
                  }}
                >
                  Discard
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty && !saved}
                style={{
                  flex: 1, padding: '12px', borderRadius: 'var(--radius-sm)',
                  background: saved ? 'var(--green)' : (dirty ? 'var(--ink)' : 'var(--ink4)'),
                  color: '#fff', border: 'none', fontFamily: 'var(--font-body)',
                  fontSize: '14px', fontWeight: 600,
                  cursor: dirty || saved ? 'pointer' : 'default',
                  transition: 'background 0.3s',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {saved
                  ? <><CheckCircle2 size={14} aria-hidden="true" /> Saved</>
                  : dirty ? 'Save Settings' : 'No changes'}
              </button>
            </div>
          </div>
        </main>
  );
}
