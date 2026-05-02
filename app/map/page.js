'use client';
/**
 * app/map/page.js — Network Map page
 * ─────────────────────────────────────────────────────────────────────────
 * MODIFIED:
 *  1. Uses global simulation context via useHardwareData (no more per-page
 *     simulation — state persists across navigation).
 *  2. Passes onLampSelect callback to LampMap so clicking any lamp marker
 *     on the map updates the coordinate / detail panel below in real-time.
 *  3. Removed the key={selected} remount trick — LampMap now stays mounted
 *     and just re-centres; the info panel updates via state.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { useState, useCallback } from 'react';
import { Lightbulb, AlertTriangle, Zap, CircleOff, MapPin, CheckCircle2 } from 'lucide-react';
import { useHardwareData } from '../../components/useHardwareData';
import { STATUS_COLORS, STATUS_LABELS, STATUS_ICONS } from '../../lib/lampData';
import dynamic from 'next/dynamic';

/* LampMap is browser-only (Leaflet cannot SSR) */
const LampMap = dynamic(() => import('../../components/LampMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cream2)', borderRadius: 'var(--radius)', fontSize: '14px', color: 'var(--ink3)',
    }}>
      Loading map…
    </div>
  ),
});

export default function NetworkMapPage() {
  const { lamps, simulating, arduinoConnected } = useHardwareData();
  const showLive = arduinoConnected || simulating;
  /* selectedId — ID of whichever lamp is currently highlighted.
     Updated both by clicking a lamp card (below map) AND by clicking
     a map marker icon. */
  const [selectedId, setSelectedId] = useState(null);

  const statusCounts = {
    ok: lamps.filter(l => l.status === 'ok').length,
    fault: lamps.filter(l => l.status === 'fault').length,
    warn: lamps.filter(l => l.status === 'warn').length,
    standby: lamps.filter(l => l.status === 'standby').length,
  };

  /* The lamp object for whichever marker/card is currently selected */
  const selectedLamp = lamps.find(l => l.id === selectedId);

  /**
   * handleLampSelect — fired when a map marker OR a lamp card is clicked.
   * Updates selectedId which drives both the info panel and the map focus.
   */
  const handleLampSelect = useCallback((lampId) => {
    setSelectedId(lampId);
  }, []);

  // (Theme effect lives in SimulationContext.)

  return (
    <main className="content">
          {/* Page header */}
          <div className="page-header">
            <div>
              <div className="page-eyebrow">Campus Block A</div>
              <h1 className="page-title">Network <em>Map</em></h1>
            </div>
            {/* Status legend — single iconography from lib/lampData */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { k: 'ok', color: 'var(--green)', label: 'Working', Icon: Lightbulb },
                { k: 'fault', color: 'var(--red)', label: 'Faults', Icon: AlertTriangle },
                { k: 'warn', color: 'var(--amber)', label: 'Wastage', Icon: Zap },
                { k: 'standby', color: 'var(--ink4)', label: 'Standby', Icon: CircleOff },
              ].map(({ k, color, label, Icon }) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--ink2)' }}>
                  <Icon size={14} color={color} aria-hidden="true" />
                  {label}: <strong style={{ color }}>{statusCounts[k]}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Map card */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">All Lamps — Live Location View</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="card-badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
                  {lamps.length} UNITS
                </span>
                {selectedLamp && (
                  <span style={{ fontSize: '12px', color: 'var(--ink2)' }}>
                    Viewing:{' '}
                    <strong style={{ color: STATUS_COLORS[selectedLamp.status] }}>
                      Lamp #{selectedLamp.id} — {selectedLamp.label}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            {/*
              Map container — LampMap stays mounted (no key remount).
              focusedLampId drives re-centering + highlight.
              onLampSelect fires each time a marker is clicked → updates selectedId.
            */}
            <div style={{ height: 'calc(100vh - 340px)', minHeight: '420px' }}>
              <LampMap
                lamps={lamps}
                focusedLampId={selectedId}
                onLampSelect={handleLampSelect}
              />
            </div>

            {/*
              Info panel — 5-column grid that updates whenever selectedLamp changes.
              Clicking a map marker OR a lamp card below will update these values.
            */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '1px',
              background: 'var(--border)',
              borderTop: '1px solid var(--border)',
            }}>
              {[
                { k: 'Lamp', v: selectedLamp ? `#${selectedLamp.id} — ${selectedLamp.label}` : 'Click a marker' },
                { k: 'Status', v: selectedLamp ? STATUS_LABELS[selectedLamp.status] || selectedLamp.status : '—' },
                { k: 'Latitude', v: selectedLamp ? `${selectedLamp.lat?.toFixed(6)}° N` : '—' },
                { k: 'Longitude', v: selectedLamp ? `${selectedLamp.lng?.toFixed(6)}° E` : '—' },
                {
                  k: 'Current',
                  v: selectedLamp
                    ? (showLive
                      ? `${(selectedLamp.current || 0).toFixed(2)}A · LDR ${selectedLamp.ldr}%`
                      : '-- · LDR --')
                    : '—',
                },
              ].map(row => (
                <div key={row.k} style={{ background: 'var(--white)', padding: '12px 16px', transition: 'background 0.2s' }}>
                  <div style={{
                    fontSize: '9px', color: 'var(--ink3)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px',
                  }}>
                    {row.k}
                  </div>
                  <div style={{
                    fontSize: '13px', fontWeight: '600',
                    color: row.k === 'Status' && selectedLamp
                      ? STATUS_COLORS[selectedLamp.status]
                      : 'var(--blue)',
                    fontFamily: 'var(--font-display)',
                    transition: 'color 0.3s',
                  }}>
                    {row.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/*
            Lamp cards below the map — clicking these also selects a lamp
            and triggers map re-centre + info panel update.
          */}
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {lamps.map(lamp => {
              const StatusIcon = STATUS_ICONS[lamp.status] || Lightbulb;
              const iconColor = STATUS_COLORS[lamp.status] || 'var(--ink2)';
              const isSelected = selectedId === lamp.id;
              return (
                <div
                  key={lamp.id}
                  className={`lamp-card ${lamp.status}`}
                  onClick={() => handleLampSelect(lamp.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') handleLampSelect(lamp.id); }}
                  style={{
                    cursor: 'pointer',
                    outline: isSelected ? `2.5px solid ${STATUS_COLORS[lamp.status]}` : 'none',
                    outlineOffset: '3px',
                    transition: 'outline 0.2s',
                  }}
                >
                  <span className="lamp-bulb" aria-hidden="true">
                    <StatusIcon size={26} color={iconColor} strokeWidth={1.8} />
                  </span>
                  <div className="lamp-card-body">
                    <div className="lamp-num">LAMP {String(lamp.id).padStart(2, '0')}</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--ink)', marginBottom: '2px' }}>
                      {lamp.label}
                    </div>
                    <div className="lamp-stat" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={11} className="icon-inline" aria-hidden="true" />
                      {lamp.lat?.toFixed(5)}°
                    </div>
                    <div className="lamp-stat">
                      <span style={{ color: STATUS_COLORS[lamp.status] }}>
                        {STATUS_LABELS[lamp.status]}
                      </span>
                    </div>
                    <div className="lamp-click-hint" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {isSelected
                        ? (<><CheckCircle2 size={11} aria-hidden="true" /> Selected</>)
                        : 'Click to focus →'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
  );
}
