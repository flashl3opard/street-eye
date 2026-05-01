/**
 * layout.js — Root layout (server component)
 * ─────────────────────────────────────────────────────────────────────────
 * MODIFIED: Wraps children with <SimulationProvider> so all pages share
 * one global simulation/hardware state. The provider is a client component
 * so we split the wrapper into a separate Client Component below.
 * ─────────────────────────────────────────────────────────────────────────
 */
import './globals.css';
import { SimulationProvider } from '../context/SimulationContext';

export const metadata = {
  title: 'Street Eye — Smart Streetlamp Monitoring',
  description: 'Real-time ESP32/NodeMCU Smart Streetlamp Monitoring Dashboard with GPS tracking, fault detection, and energy analytics.',
  keywords: 'ESP32, NodeMCU, streetlamp, IoT, monitoring, smart city',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/*
        SimulationProvider is a 'use client' component. Next.js allows
        client components to be children of server components — the
        provider renders once on mount and persists across navigation.
      */}
      <body>
        <SimulationProvider>
          {children}
        </SimulationProvider>
      </body>
    </html>
  );
}
