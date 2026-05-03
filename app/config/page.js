'use client';
import { useMemo } from 'react';
import {
  Cpu,
  CircleDot,
  Activity,
  Sun,
  Thermometer,
  Satellite,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useHardwareData } from '../../components/useHardwareData';

const COMPONENTS = [
  {
    key: 'pir',
    label: 'PIR Motion Sensor',
    hint: 'Digital motion detection (HIGH/LOW).',
    icon: CircleDot,
  },
  {
    key: 'current',
    label: 'ACS712 Current Sensor',
    hint: 'AC current draw in amperes.',
    icon: Activity,
  },
  {
    key: 'ldr',
    label: 'LDR Light Sensor',
    hint: 'Bulb light intensity percentage.',
    icon: Sun,
  },
  {
    key: 'temp',
    label: 'DS18B20 Temperature',
    hint: 'Temperature in °C.',
    icon: Thermometer,
  },
  {
    key: 'gps',
    label: 'NEO-6M GPS Module',
    hint: 'Location, satellites, and fix status.',
    icon: Satellite,
  },
];

function formatTimestamp(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-IN', { hour12: false });
}

export default function ConfigPage() {
  const {
    settings,
    componentConfig,
    updateComponentConfig,
    arduinoConnected,
    simulating,
    hardwareMeta,
    lamps,
    espId,
  } = useHardwareData();

  const sampleLamp = lamps?.[0];

  const dataStatus = useMemo(() => ({
    pir: typeof sampleLamp?.pir === 'boolean',
    current: typeof sampleLamp?.current === 'number',
    ldr: typeof sampleLamp?.ldr === 'number',
    temp: typeof sampleLamp?.temp === 'number',
    gps: Boolean(hardwareMeta?.gps),
  }), [sampleLamp, hardwareMeta]);

  const liveLabel = arduinoConnected ? 'Live' : simulating ? 'Simulated' : 'Offline';

  const toggleComponent = (key) => {
    updateComponentConfig({ [key]: !componentConfig?.[key] });
  };

  const restoreDefaults = () => {
    updateComponentConfig({
      pir: true,
      current: true,
      ldr: true,
      temp: true,
      gps: true,
    });
  };

  return (
    <main className="content">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Hardware Configuration</div>
          <h1 className="page-title">Component <em>Config</em></h1>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-head">
          <span className="card-title">Current Hardware Snapshot</span>
          <span className="card-badge" style={{
            background: arduinoConnected ? 'var(--green-light)' : simulating ? 'var(--amber-light)' : 'var(--cream2)',
            color: arduinoConnected ? 'var(--green)' : simulating ? 'var(--amber)' : 'var(--ink3)',
          }}>
            {liveLabel}
          </span>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
          {[
            { label: 'ESP32 ID', value: espId || '--' },
            { label: 'Device Number', value: hardwareMeta?.deviceNumber || '--' },
            { label: 'Last Reading', value: formatTimestamp(hardwareMeta?.lastReadingAt) },
            { label: 'Endpoint', value: settings?.hardwareUrl || '--' },
          ].map(item => (
            <div key={item.label} className="config-tile">
              <div className="config-label">{item.label}</div>
              <div className="config-value" title={String(item.value)}>{String(item.value)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-head">
          <span className="card-title">Active Components</span>
          <button type="button" className="config-reset" onClick={restoreDefaults}>
            Restore Defaults
          </button>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          {COMPONENTS.map(item => {
            const Icon = item.icon;
            const enabled = componentConfig?.[item.key] !== false;
            const detected = dataStatus[item.key];
            return (
              <div key={item.key} className="config-card">
                <div className="config-card-head">
                  <div className="config-icon" aria-hidden="true"><Icon size={16} /></div>
                  <div>
                    <div className="config-title">{item.label}</div>
                    <div className="config-hint">{item.hint}</div>
                  </div>
                  <button
                    type="button"
                    className={`config-switch ${enabled ? 'active' : ''}`}
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => toggleComponent(item.key)}
                  >
                    <span className="config-switch-dot"></span>
                  </button>
                </div>

                <div className="config-status">
                  <span className={`config-pill ${detected ? 'ok' : 'warn'}`}>
                    {detected ? 'Detected' : 'No Data'}
                  </span>
                  <span className={`config-pill ${enabled ? 'ok' : 'off'}`}>
                    {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">GPS Details</span>
          <span className="card-badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
            NEO-6M
          </span>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
          {[
            { label: 'Fix', value: hardwareMeta?.gps?.valid ? 'Valid' : 'No Fix' },
            { label: 'Latitude', value: hardwareMeta?.gps?.lat ?? '--' },
            { label: 'Longitude', value: hardwareMeta?.gps?.lng ?? '--' },
            { label: 'Satellites', value: hardwareMeta?.gps?.sat ?? '--' },
          ].map(item => (
            <div key={item.label} className="config-tile">
              <div className="config-label">{item.label}</div>
              <div className="config-value">{String(item.value)}</div>
            </div>
          ))}
        </div>
        {!arduinoConnected && !simulating && (
          <div className="config-note">
            <AlertTriangle size={14} aria-hidden="true" />
            GPS data appears only when the hardware endpoint sends a gps object.
          </div>
        )}
        {(arduinoConnected || simulating) && hardwareMeta?.gps?.valid && (
          <div className="config-note ok">
            <CheckCircle2 size={14} aria-hidden="true" />
            GPS fix is valid and streaming.
          </div>
        )}
      </div>
    </main>
  );
}
