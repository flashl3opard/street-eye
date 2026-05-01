'use client';
/**
 * CurrentChart.js — Canvas-based sparkline chart for ACS712 current data.
 *
 * FIX: Canvas was not being cleared before redraw, causing ghost paint
 * artifacts on every data update. Added ctx.clearRect() at the start
 * of the effect. Also fixed the Catmull-Rom path to correctly clear
 * and restate the gradient each time data changes.
 */
import { useEffect, useRef } from 'react';

export default function CurrentChart({ data, color = 'rgb(29,101,184)', maxVal = 3.0, yUnit = 'A', yDecimals = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;

    // Always resize canvas to match parent (avoids stale dimensions)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // ── CLEAR before every redraw ──────────────────────────────────────
    // Without this, older chart frames bleed through on each data tick.
    ctx.clearRect(0, 0, rect.width, rect.height);

    const W = rect.width;
    const H = rect.height;
    const pad = { top: 10, right: 8, bottom: 20, left: 36 };
    const w = W - pad.left - pad.right;
    const h = H - pad.top - pad.bottom;

    // ── Grid lines + Y-axis labels ─────────────────────────────────────
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (h / gridLines) * i;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(26,20,16,0.07)';
      ctx.lineWidth = 1;
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(26,20,16,0.35)';
      ctx.font = '10px "DM Sans", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        (maxVal - (maxVal / gridLines) * i).toFixed(yDecimals) + yUnit,
        pad.left - 4,
        y + 4,
      );
    }

    // ── Map data points to canvas coords ──────────────────────────────
    const pts = data.map((v, i) => ({
      x: pad.left + i * (w / Math.max(data.length - 1, 1)),
      y: pad.top + h - Math.min((v || 0) / maxVal, 1) * h,
    }));

    // ── Catmull-Rom spline helper ──────────────────────────────────────
    function cm(p0, p1, p2, p3, t) {
      const t2 = t * t, t3 = t2 * t;
      return {
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      };
    }

    // ── Gradient fill ─────────────────────────────────────────────────
    // Parse "rgb(r,g,b)" → "r,g,b" for rgba() usage
    const colorPart = color.replace('rgb(', '').replace(')', '').trim();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + h);
    grad.addColorStop(0, `rgba(${colorPart}, 0.22)`);
    grad.addColorStop(1, `rgba(${colorPart}, 0.02)`);

    // Build the closed fill path
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      for (let t = 0; t <= 1; t += 0.08) {
        const p = cm(p0, p1, p2, p3, t);
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.lineTo(pts[pts.length - 1].x, pad.top + h);
    ctx.lineTo(pts[0].x, pad.top + h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // ── Stroke line ───────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      for (let t = 0; t <= 1; t += 0.08) {
        const p = cm(p0, p1, p2, p3, t);
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // ── Live dot at the end of the line ───────────────────────────────
    const last = pts[pts.length - 1];
    // Outer glow
    ctx.beginPath();
    ctx.arc(last.x, last.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${colorPart}, 0.2)`;
    ctx.fill();
    // Inner solid dot
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [data, color, maxVal, yUnit, yDecimals]); // re-runs every time data array reference changes

  return <canvas ref={canvasRef} className="chart-canvas" />;
}
