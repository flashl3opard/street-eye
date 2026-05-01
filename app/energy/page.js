'use client';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { useHardwareData } from '../../components/useHardwareData';
import { ENERGY_DATA } from '../../lib/lampData';

export default function EnergyPage() {
  const { lamps, isOnline, uptime, alertLog, simulating, toggleSimulate } = useHardwareData();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const totalCurrent = lamps.reduce((a, l) => a + (l.current || 0), 0);
  const wasteCurrent = lamps.filter(l => l.status === 'warn').reduce((a, l) => a + (l.current || 0), 0);
  const efficiency = totalCurrent > 0 ? (((totalCurrent - wasteCurrent) / totalCurrent) * 100).toFixed(1) : 100;

  return (
    <div className="app">
      <Sidebar isOnline={isOnline} alertCount={alertLog.length} />
      <div className="main">
        <Topbar breadcrumb="Energy Analytics" isOnline={isOnline} uptime={uptime} isDark={isDark}
          onThemeToggle={() => setIsDark(d => !d)} onSimulate={toggleSimulate} simulating={simulating} />
        <main className="content">
          <div className="page-header">
            <div>
              <div className="page-eyebrow">Campus Network · Energy Monitor</div>
              <h1 className="page-title">Energy <em>Analytics</em></h1>
            </div>
          </div>

          {/* KPIs */}
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '24px' }}>
            <div className="kpi-card">
              <div className="bg-shape" style={{ background: 'var(--blue)' }}></div>
              <div className="kpi-top"><span className="kpi-label">Total Current Draw</span><div className="kpi-icon" style={{ background: 'var(--blue-light)' }}>⚡</div></div>
              <div className="kpi-val" style={{ color: 'var(--blue)' }}>{totalCurrent.toFixed(2)}</div>
              <div className="kpi-sub">amperes across {lamps.length} lamps</div>
            </div>
            <div className="kpi-card">
              <div className="bg-shape" style={{ background: 'var(--amber)' }}></div>
              <div className="kpi-top"><span className="kpi-label">Wasted Current</span><div className="kpi-icon" style={{ background: 'var(--amber-light)' }}>🔋</div></div>
              <div className="kpi-val" style={{ color: 'var(--amber)' }}>{wasteCurrent.toFixed(2)}</div>
              <div className="kpi-sub">amperes during daytime</div>
            </div>
            <div className="kpi-card">
              <div className="bg-shape" style={{ background: 'var(--green)' }}></div>
              <div className="kpi-top"><span className="kpi-label">System Efficiency</span><div className="kpi-icon" style={{ background: 'var(--green-light)' }}>📊</div></div>
              <div className="kpi-val" style={{ color: 'var(--green)' }}>{efficiency}%</div>
              <div className="kpi-sub">of current used appropriately</div>
            </div>
          </div>

          {/* Per-lamp energy breakdown */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">Per-Lamp Status Distribution — Today</span>
              <span className="card-badge" style={{ background: 'var(--amber-light)', color: 'var(--amber-dark)' }}>24H</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: '8px', marginBottom: '16px' }}>
                {ENERGY_DATA.map(d => {
                  const t = d.ok + d.fault + d.warn + d.standby;
                  const H = 160;
                  return (
                    <div key={d.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column-reverse', height: `${H}px`, width: '100%', gap: '0', justifyContent: 'flex-start', borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
                        {d.standby > 0 && <div style={{ height: `${Math.round(d.standby / t * H)}px`, background: 'var(--ink4)', opacity: 0.4, flexShrink: 0 }}></div>}
                        {d.warn > 0 && <div style={{ height: `${Math.round(d.warn / t * H)}px`, background: 'var(--amber)', flexShrink: 0 }}></div>}
                        {d.fault > 0 && <div style={{ height: `${Math.round(d.fault / t * H)}px`, background: 'var(--red)', flexShrink: 0 }}></div>}
                        {d.ok > 0 && <div style={{ height: `${Math.round(d.ok / t * H)}px`, background: 'var(--green)', flexShrink: 0 }}></div>}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--ink4)', marginTop: '6px', fontWeight: '600' }}>{d.label}</div>
                      <div style={{ fontSize: '8px', color: 'var(--ink4)' }}>{d.ok}% OK</div>
                    </div>
                  );
                })}
              </div>
              <div className="e-legend">
                <div className="e-leg"><div className="e-leg-dot" style={{ background: 'var(--green)' }}></div>Working</div>
                <div className="e-leg"><div className="e-leg-dot" style={{ background: 'var(--red)' }}></div>Faulted</div>
                <div className="e-leg"><div className="e-leg-dot" style={{ background: 'var(--amber)' }}></div>Wastage</div>
                <div className="e-leg"><div className="e-leg-dot" style={{ background: 'var(--ink4)', opacity: 0.4 }}></div>Standby</div>
              </div>
            </div>
          </div>

          {/* Live per-lamp currents */}
          <div style={{ marginTop: '16px' }} className="card">
            <div className="card-head">
              <span className="card-title">Live Current per Lamp</span>
              <span className="card-badge" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>LIVE</span>
            </div>
            <div className="card-body">
              {lamps.map(lamp => {
                const pct = Math.min((lamp.current || 0) / 2.5 * 100, 100);
                const color = lamp.status === 'fault' ? 'var(--red)' : lamp.status === 'warn' ? 'var(--amber)' : lamp.status === 'ok' ? 'var(--green)' : 'var(--ink4)';
                return (
                  <div key={lamp.id} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--ink2)', fontWeight: '500' }}>Lamp #{lamp.id} — {lamp.label}</span>
                      <span style={{ color, fontWeight: '700' }}>{(lamp.current || 0).toFixed(2)}A</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--cream2)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, background: color,
                        borderRadius: '4px', transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
