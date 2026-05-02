'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { useHardwareData } from '../../components/useHardwareData';
import { STATUS_COLORS } from '../../lib/lampData';

export default function AlertsPage() {
  const { alertLog, simulating, arduinoConnected } = useHardwareData();
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = alertLog.filter(a => typeFilter === 'all' || a.type === typeFilter);
  const exportLog = () => {
    const csv = ['Time,Title,Message,Type', ...filtered.map(a => `"${a.time}","${a.title}","${a.msg}","${a.type}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'alert-log.csv'; a.click();
  };

  return (
    <main className="content">
          <div className="page-header">
            <div>
              <div className="page-eyebrow">Campus Network · Event Monitor</div>
              <h1 className="page-title">Alert <em>Log</em></h1>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button className="export-btn" onClick={exportLog}>
                <Download size={14} aria-hidden="true" /> Export CSV
              </button>
            </div>
          </div>

          {/* Summary chips */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[['all', 'All Events', 'var(--ink)'], ['fault', 'Faults', 'var(--red)'], ['warn', 'Warnings', 'var(--amber)'], ['ok', 'Resolved', 'var(--green)'], ['info', 'Info', 'var(--blue)']].map(([t, label, c]) => {
              const count = t === 'all' ? alertLog.length : alertLog.filter(a => a.type === t).length;
              return (
                <div
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    border: `1.5px solid ${typeFilter === t ? c : 'var(--border)'}`,
                    background: typeFilter === t ? `${c}18` : 'var(--white)',
                    display: 'flex', gap: '8px', alignItems: 'center', transition: 'all 0.18s',
                  }}
                >
                  <span style={{ fontWeight: '700', color: c, fontSize: '18px', fontFamily: 'var(--font-display)' }}>{count}</span>
                  <span style={{ fontSize: '12px', color: 'var(--ink2)' }}>{label}</span>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: '0' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--ink3)' }}>
                  {arduinoConnected || simulating
                    ? 'No events found'
                    : 'Connect your Arduino to see live events.'}
                </div>
              ) : filtered.map((a, i) => {
                const color = STATUS_COLORS[a.type] || 'var(--blue)';
                return (
                  <div key={a.id || i} style={{
                    display: 'flex', gap: '16px', padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: `3px solid ${color}`,
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, marginTop: '5px', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', color, fontSize: '13px' }}>{a.title}</span>
                        <span style={{
                          background: `${color}18`, color, fontSize: '9px', fontWeight: '700',
                          padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>{a.type}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink2)' }}>{a.msg}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink4)', flexShrink: 0, marginTop: '2px' }}>{a.time}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
  );
}
