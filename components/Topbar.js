'use client';
import { useState, useEffect } from 'react';

export default function Topbar({ breadcrumb, isOnline, uptime, onThemeToggle, isDark, onSimulate, simulating }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const formatUptime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <span>Street Eye</span>
        <span className="sep">/</span>
        <span className="current">{breadcrumb}</span>
      </div>

      <div className="topbar-right">
        <div className={`live-pill ${isOnline ? '' : 'offline'}`}>
          <div className="live-dot"></div>
          {isOnline ? 'Live' : 'Offline'}
        </div>

        <div className="time-chip" title="Current time">
          🕐 {time}
        </div>

        {uptime !== undefined && (
          <div className="time-chip" title="System uptime">
            ⏱ {formatUptime(uptime)}
          </div>
        )}

        <button className="icon-btn" onClick={onThemeToggle} title="Toggle Dark Mode" style={{fontSize:'18px'}}>
          {isDark ? '☀️' : '🌙'}
        </button>

        {onSimulate && (
          <button
            className={`sim-btn ${simulating ? 'stop' : ''}`}
            onClick={onSimulate}
          >
            {simulating ? (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <rect x="2" y="2" width="3" height="8"/><rect x="7" y="2" width="3" height="8"/>
                </svg>
                Stop Sim
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M2 2l8 4-8 4V2z"/>
                </svg>
                Simulate
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
