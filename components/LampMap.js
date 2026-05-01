'use client';
/**
 * LampMap.js
 * ─────────────────────────────────────────────────────────────────────────
 * MODIFIED:
 *  1. CartoDB Positron (light) tiles → minimal, clean map with no clutter
 *  2. User geolocation marker (blue pulsing circle) via Geolocation API
 *  3. onLampSelect callback → clicking a lamp marker fires this so the
 *     parent page (Network Map) can update the info panel below the map
 * ─────────────────────────────────────────────────────────────────────────
 */
import { useEffect, useRef } from 'react';

const STATUS_COLORS_HEX = {
  ok:      '#1a8a52',
  fault:   '#d63131',
  warn:    '#e8820c',
  standby: '#b8aea5',
};

const STATUS_LABELS = {
  ok:      'Working',
  fault:   'Fused Bulb',
  warn:    'Energy Wastage',
  standby: 'Standby',
};

/**
 * LampMap Component
 * @param {Array}    lamps         - Array of lamp objects with lat/lng/status
 * @param {number}   focusedLampId - ID of the lamp to center/highlight
 * @param {Function} onLampSelect  - Callback(lampId) when a marker is clicked
 */
export default function LampMap({ lamps, focusedLampId, onLampSelect }) {
  const mapRef       = useRef(null);
  const mapInstance  = useRef(null);
  const markersRef   = useRef([]);
  const userMarkerRef = useRef(null); // holds the "You are here" marker

  /* ── Initial map setup ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    /* Inject Leaflet CSS once */
    if (!document.getElementById('leaflet-css')) {
      const link   = document.createElement('link');
      link.id      = 'leaflet-css';
      link.rel     = 'stylesheet';
      link.href    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then(L => {
      if (!mapRef.current || mapInstance.current) return;

      const focusedLamp = lamps?.find(l => l.id === focusedLampId) || lamps?.[0];
      const center = focusedLamp
        ? [focusedLamp.lat, focusedLamp.lng]
        : [19.0762, 72.8779];

      const map = L.map(mapRef.current, {
        center,
        zoom: 18,
        zoomControl: true,
        scrollWheelZoom: true,
      });
      mapInstance.current = map;

      /*
       * MINIMAL MAP TILES — CartoDB Positron (light theme)
       * Compared to OpenStreetMap, Positron has:
       *   - No bright colours
       *   - Minimal labelling
       *   - Clean white/light-grey palette
       *   - Much less visual noise at street zoom
       */
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '© <a href="https://carto.com/">CARTO</a>',
          subdomains:  'abcd',
          maxZoom:     20,
        }
      ).addTo(map);

      /* Add lamp markers */
      addMarkers(L, map, lamps, focusedLampId, markersRef, onLampSelect);

      /* Try to get user location and place a marker */
      showUserLocation(L, map, userMarkerRef);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // run once on mount

  /* ── Update markers when lamp data or focused lamp changes ── */
  useEffect(() => {
    if (!mapInstance.current || !lamps) return;
    import('leaflet').then(L => {
      /* Clear existing lamp markers */
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      /* Re-add with latest data */
      addMarkers(L, mapInstance.current, lamps, focusedLampId, markersRef, onLampSelect);

      /* Re-centre on focused lamp */
      const fl = lamps.find(l => l.id === focusedLampId);
      if (fl) mapInstance.current.setView([fl.lat, fl.lng], 18, { animate: true });
    });
  }, [lamps, focusedLampId, onLampSelect]);

  return (
    <div
      ref={mapRef}
      style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-sm)', zIndex: 1 }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * addMarkers — creates styled Leaflet divIcon markers for each lamp.
 * Clicking a marker:
 *   (a) opens its popup
 *   (b) fires onLampSelect(lamp.id) → parent updates the info panel
 * ───────────────────────────────────────────────────────────────────────── */
function addMarkers(L, map, lamps, focusedLampId, markersRef, onLampSelect) {
  lamps?.forEach(lamp => {
    const isFocused = lamp.id === focusedLampId;
    const color     = STATUS_COLORS_HEX[lamp.status] || '#888';
    const size      = isFocused ? 36 : 26;
    const border    = isFocused ? '3px solid white' : '2px solid white';
    const shadow    = isFocused
      ? '0 2px 16px rgba(0,0,0,0.45)'
      : '0 2px 8px rgba(0,0,0,0.25)';

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="
          width:${size}px; height:${size}px;
          background:${color};
          border-radius:50%;
          border:${border};
          box-shadow:${shadow};
          display:flex; align-items:center; justify-content:center;
          font-size:${isFocused ? 17 : 13}px;
          cursor:pointer;
          transition:all 0.2s;
        ">💡</div>
      `,
      iconSize:    [size, size],
      iconAnchor:  [size / 2, size / 2],
      popupAnchor: [0, -(size / 2)],
    });

    const marker = L.marker([lamp.lat, lamp.lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:190px;">
          <div style="font-size:13px;font-weight:700;margin-bottom:4px;">
            Lamp #${lamp.id} — ${lamp.label}
          </div>
          <div style="font-size:11px;color:${color};font-weight:600;text-transform:uppercase;margin-bottom:8px;">
            ${STATUS_LABELS[lamp.status] || lamp.status}
          </div>
          <div style="font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <div>Current: <strong>${(lamp.current || 0).toFixed(2)}A</strong></div>
            <div>LDR: <strong>${lamp.ldr}%</strong></div>
            <div>Temp: <strong>${lamp.temp || '--'}°C</strong></div>
            <div>PIR: <strong>${lamp.pir ? 'DETECTED' : 'CLEAR'}</strong></div>
          </div>
          <div style="margin-top:8px;font-size:10px;color:#888;">
            ${lamp.lat?.toFixed(6)}° N, ${lamp.lng?.toFixed(6)}° E
          </div>
          <a href="/lamp/${lamp.id}"
             style="display:block;margin-top:10px;text-align:center;padding:6px;
                    background:${color};color:white;border-radius:4px;
                    text-decoration:none;font-size:12px;font-weight:600;">
            View Details →
          </a>
        </div>
      `, { maxWidth: 240 });

    /* When this marker is clicked → notify parent to update the info panel */
    marker.on('click', () => {
      if (typeof onLampSelect === 'function') {
        onLampSelect(lamp.id);
      }
    });

    if (isFocused) marker.openPopup();
    markersRef.current.push(marker);
  });
}

/* ─────────────────────────────────────────────────────────────────────────
 * showUserLocation
 * Uses the browser Geolocation API to add a "You are here" pulsing marker.
 *
 * Behaviour:
 *   - Success → blue pulsing circle marker at user's coords
 *   - Denial / error → silently ignored, no UI disruption
 * ───────────────────────────────────────────────────────────────────────── */
function showUserLocation(L, map, userMarkerRef) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    /* SUCCESS */
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;

      /*
       * Custom "You are here" pulsing marker — blue pulsing circle
       * styled to look distinct from the lamp markers.
       */
      const userIcon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:20px;height:20px;">
            <!-- Outer pulse ring -->
            <div style="
              position:absolute;
              top:50%;left:50%;
              transform:translate(-50%,-50%);
              width:36px;height:36px;
              border-radius:50%;
              background:rgba(29,101,184,0.18);
              animation:userPulse 2s ease-out infinite;
            "></div>
            <!-- Inner solid dot -->
            <div style="
              position:absolute;
              top:50%;left:50%;
              transform:translate(-50%,-50%);
              width:14px;height:14px;
              background:#1d65b8;
              border-radius:50%;
              border:2.5px solid white;
              box-shadow:0 2px 8px rgba(29,101,184,0.5);
            "></div>
          </div>
          <style>
            @keyframes userPulse {
              0%   { opacity:0.8; transform:translate(-50%,-50%) scale(1); }
              100% { opacity:0;   transform:translate(-50%,-50%) scale(2.5); }
            }
          </style>
        `,
        iconSize:    [20, 20],
        iconAnchor:  [10, 10],
        popupAnchor: [0, -15],
      });

      /* Remove existing user marker if already placed */
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }

      userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:system-ui,sans-serif;text-align:center;min-width:140px;">
            <div style="font-size:20px;margin-bottom:4px;">📍</div>
            <div style="font-weight:700;font-size:13px;color:#1d65b8;">You are here</div>
            <div style="font-size:10px;color:#888;margin-top:4px;">
              ${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E<br>
              ±${Math.round(accuracy)} m accuracy
            </div>
          </div>
        `, { maxWidth: 200 });

      /* Optionally add an accuracy circle */
      L.circle([latitude, longitude], {
        radius:      accuracy,
        color:       '#1d65b8',
        fillColor:   '#1d65b8',
        fillOpacity: 0.05,
        weight:      1,
        dashArray:   '4 4',
      }).addTo(map);
    },

    /* ERROR / DENIAL — silently ignore, map still works normally */
    (_error) => {
      // geolocation denied or unavailable — no action needed
    },

    /* OPTIONS */
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}
