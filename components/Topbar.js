'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Clock, Timer, Sun, Moon, Play, Square, Menu, X } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

const STATIC_BREADCRUMBS = {
  '/': 'Overview',
  '/lamps': 'Lamp Grid',
  '/map': 'Network Map',
  '/alerts': 'Alert Log',
  '/logs': 'All Logs',
  '/energy': 'Energy Analytics',
  '/settings': 'Settings',
};

/**
 * Resolve a human-readable breadcrumb from the URL.
 * The dynamic /lamp/[id] case looks up the lamp from context so we can
 * say "Lamp #3 — Library Front" instead of just the route segment.
 */
function useBreadcrumb(lamps) {
  const pathname = usePathname();
  if (STATIC_BREADCRUMBS[pathname]) return STATIC_BREADCRUMBS[pathname];

  if (pathname?.startsWith('/lamp/')) {
    const id = parseInt(pathname.split('/')[2], 10);
    const lamp = Number.isFinite(id) ? lamps.find(l => l.id === id) : null;
    return lamp ? `Lamp #${lamp.id} — ${lamp.label}` : `Lamp #${id}`;
  }

  return 'Street Eye';
}

/**
 * Topbar — global header. Mounted once by the root layout. Reads everything
 * from SimulationContext so individual pages don't need to pass props.
 */
export default function Topbar() {
  const {
    isOnline, uptime, simulating, toggleSimulate, toggleTheme, lamps,
    sidebarOpen, toggleSidebar,
  } = useSimulation();
  const breadcrumb = useBreadcrumb(lamps);
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
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <header className="topbar">
      {/* Hamburger — only visible at narrow viewports via CSS. */}
      <button
        type="button"
        className="topbar-hamburger"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>

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
          <Clock size={13} className="icon-inline" aria-hidden="true" /> {time}
        </div>

        {uptime !== undefined && (
          <div className="time-chip" title="System uptime">
            <Timer size={13} className="icon-inline" aria-hidden="true" /> {formatUptime(uptime)}
          </div>
        )}

        {/*
          Both icons render every time; CSS picks one based on [data-theme].
          Avoids the SSR/client divergence that comes from a JS branch on
          isDark (server has no localStorage so it'd always pick Moon).
        */}
        <button className="icon-btn theme-toggle" onClick={toggleTheme} title="Toggle Dark Mode" aria-label="Toggle dark mode">
          <Moon size={16} aria-hidden="true" className="theme-toggle-icon-light" />
          <Sun size={16} aria-hidden="true" className="theme-toggle-icon-dark" />
        </button>

        <button
          className={`sim-btn ${simulating ? 'stop' : ''}`}
          onClick={toggleSimulate}
          title={simulating ? 'Stop simulation' : 'Start simulation'}
        >
          {simulating ? (
            <>
              <Square size={12} aria-hidden="true" />
              Stop Sim
            </>
          ) : (
            <>
              <Play size={12} aria-hidden="true" />
              Simulate
            </>
          )}
        </button>
      </div>
    </header>
  );
}
