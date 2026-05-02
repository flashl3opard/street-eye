/**
 * layout.js — Root layout (server component)
 * ─────────────────────────────────────────────────────────────────────────
 * MODIFIED: Wraps children with <SimulationProvider> so all pages share
 * one global simulation/hardware state. The provider is a client component
 * so we split the wrapper into a separate Client Component below.
 * ─────────────────────────────────────────────────────────────────────────
 */
import './globals.css';
import Script from 'next/script';
import { SimulationProvider } from '../context/SimulationContext';
import ConnectionGate from '../components/ConnectionGate';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import SidebarBackdrop from '../components/SidebarBackdrop';

export const metadata = {
  title: 'Street Eye — Smart Streetlamp Monitoring',
  description: 'Real-time ESP32/NodeMCU Smart Streetlamp Monitoring Dashboard with GPS tracking, fault detection, and energy analytics.',
  keywords: 'ESP32, NodeMCU, streetlamp, IoT, monitoring, smart city',
};

/**
 * Inline pre-hydrate script — runs before React boots.
 * Reads the saved theme from localStorage and applies the data-theme
 * attribute synchronously. This avoids the "light flash" on reload that
 * happens when the theme is only set inside a useEffect.
 */
const themeBootstrapScript = `
  (function() {
    try {
      var t = localStorage.getItem('theme');
      if (t !== 'light' && t !== 'dark') t = 'light';
      document.documentElement.setAttribute('data-theme', t);
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: the inline themeBootstrapScript below mutates
    // <html data-theme> *before* React hydrates. Without this flag React would
    // complain that the SSR HTML (no data-theme) doesn't match the client DOM
    // (has data-theme). The mismatch is intentional and lives only on this
    // single attribute.
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        {/*
          Use next/script with strategy="beforeInteractive" so the bootstrap
          runs ahead of hydration. A raw <script> rendered as a React child
          triggers Next's "scripts inside React components" warning because
          it isn't tracked by Next's loader.
        */}
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {themeBootstrapScript}
        </Script>
        <SimulationProvider>
          {/*
            App shell — Sidebar + Topbar live at the layout level so they
            don't unmount on route changes. Each page renders only its
            <main className="content"> body inside this wrapper.
          */}
          <div className="app">
            <Sidebar />
            <SidebarBackdrop />
            <div className="main">
              <Topbar />
              {children}
            </div>
          </div>
          {/* Global "Arduino Not Connected" dialog gate — mounted once. */}
          <ConnectionGate />
        </SimulationProvider>
      </body>
    </html>
  );
}
