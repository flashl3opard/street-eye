'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar({ isOnline = true, alertCount = 0 }) {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      <div className="logo-area">
        <div className="logo-lockup">
          <div className="logo-icon">🔦</div>
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
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" />
            </svg>
            Overview
          </Link>
          <Link href="/lamps" className={`nav-item ${isActive('/lamps') ? 'active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-4.472 10.09A3 3 0 007 15v1h6v-1a3 3 0 001.472-2.91A6 6 0 0010 2zm0 2a4 4 0 110 8 4 4 0 010-8z" />
            </svg>
            Lamp Grid
          </Link>
          <Link href="/map" className={`nav-item ${isActive('/map') ? 'active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Network Map
          </Link>
        </div>

        <div className="nav-group">
          <div className="nav-group-label">Analysis</div>
          <Link href="/alerts" className={`nav-item ${isActive('/alerts') ? 'active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Alert Log
            <span className="nav-badge">{alertCount}</span>
          </Link>
          <Link href="/logs" className={`nav-item ${isActive('/logs') ? 'active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 3h14a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zm2 3v2h4V6H5zm0 4v2h10v-2H5zm6-4v2h4V6h-4z" />
            </svg>
            All Logs
          </Link>
          <Link href="/energy" className={`nav-item ${isActive('/energy') ? 'active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 17l5-10 4 6 3-4 4 8H2z" />
            </svg>
            Energy
          </Link>
        </div>

        <div className="nav-group">
          <div className="nav-group-label">System</div>
          <Link href="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
            <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Settings
          </Link>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="node-row">
          <div className={`pulse-dot ${isOnline ? '' : 'offline'}`}></div>
          {isOnline ? 'ESP32 Connected' : 'Hardware Offline'}
        </div>
        <div className="node-ip">172.20.10.2 · ESP32-WROOM</div>
      </div>
    </aside>
  );
}
