'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Lightbulb,
  MapPin,
  AlertTriangle,
  Terminal,
  TrendingUp,
  Settings,
  Flashlight,
  Cpu,
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

const NAV_ICON_SIZE = 18;
const NAV_ICON_PROPS = { size: NAV_ICON_SIZE, strokeWidth: 1.8, 'aria-hidden': true };

/**
 * Sidebar — renders the global nav. Reads isOnline + alertCount directly
 * from SimulationContext so it can be mounted once in the root layout
 * rather than re-passed through every page.
 *
 * On narrow viewports the sidebar collapses behind a hamburger toggle
 * (handled in Topbar). The `sidebar-open` modifier slides it back in.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const { isOnline, alertLog, sidebarOpen, closeSidebar } = useSimulation();
  const alertCount = alertLog.length;

  // Auto-close on route change so the panel doesn't persist after navigating.
  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
      <div className="logo-area">
        <div className="logo-lockup">
          <div className="logo-icon" aria-hidden="true">
            <Flashlight size={20} strokeWidth={2} />
          </div>
          <div>
            <div className="logo-name">Street Eye</div>
            <div className="logo-sub">Smart Streetlamp System</div>
          </div>
        </div>
      </div>

      <nav className="nav">
        <div className="nav-group">
          <div className="nav-group-label">Monitor</div>
          <Link href="/" className={`nav-item ${isActive('/') && pathname === '/' ? 'active' : ''}`}>
            <span className="nav-icon icon-inline"><LayoutDashboard {...NAV_ICON_PROPS} /></span>
            Overview
          </Link>
          <Link href="/lamps" className={`nav-item ${isActive('/lamps') ? 'active' : ''}`}>
            <span className="nav-icon icon-inline"><Lightbulb {...NAV_ICON_PROPS} /></span>
            Lamp Grid
          </Link>
          <Link href="/map" className={`nav-item ${isActive('/map') ? 'active' : ''}`}>
            <span className="nav-icon icon-inline"><MapPin {...NAV_ICON_PROPS} /></span>
            Network Map
          </Link>
        </div>

        <div className="nav-group">
          <div className="nav-group-label">Analysis</div>
          <Link href="/alerts" className={`nav-item ${isActive('/alerts') ? 'active' : ''}`}>
            <span className="nav-icon icon-inline"><AlertTriangle {...NAV_ICON_PROPS} /></span>
            Alert Log
            <span className="nav-badge">{alertCount > 99 ? '99+' : alertCount}</span>
          </Link>
          <Link href="/logs" className={`nav-item ${isActive('/logs') ? 'active' : ''}`}>
            <span className="nav-icon icon-inline"><Terminal {...NAV_ICON_PROPS} /></span>
            All Logs
          </Link>
          <Link href="/energy" className={`nav-item ${isActive('/energy') ? 'active' : ''}`}>
            <span className="nav-icon icon-inline"><TrendingUp {...NAV_ICON_PROPS} /></span>
            Energy
          </Link>
        </div>

        <div className="nav-group">
          <div className="nav-group-label">System</div>
          <Link href="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
            <span className="nav-icon icon-inline"><Settings {...NAV_ICON_PROPS} /></span>
            Settings
          </Link>
          <Link href="/config" className={`nav-item ${isActive('/config') ? 'active' : ''}`}>
            <span className="nav-icon icon-inline"><Cpu {...NAV_ICON_PROPS} /></span>
            Hardware Config
          </Link>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="node-row">
          <div className={`pulse-dot ${isOnline ? '' : 'offline'}`}></div>
          {isOnline ? 'ESP32 Connected' : 'Hardware Offline'}
        </div>
        <div className="node-ip">Local API · ESP32-WROOM</div>
      </div>
    </aside>
  );
}
