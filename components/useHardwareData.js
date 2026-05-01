'use client';
/**
 * useHardwareData.js
 * ─────────────────────────────────────────────────────────────────────────
 * Delegates to SimulationContext so all pages share one global state.
 *
 * useLampHistory — UPDATED:
 *   Previously maintained local useState per page-mount, meaning the chart
 *   always reset to zeros when navigating to a lamp detail page.
 *
 *   Now reads lampHistories[lampId] directly from the global context.
 *   The SimulationContext appends to every lamp's history on each tick,
 *   so each lamp's chart is continuously built regardless of which page
 *   is currently visible. Navigating to any lamp shows its full history.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { useSimulation } from '../context/SimulationContext';

/**
 * useHardwareData — thin delegate to the global SimulationContext.
 * All pages share the same lamps, simulation state, and alert log.
 */
export function useHardwareData() {
  return useSimulation();
}

/**
 * useLampHistory(lampId)
 *
 * Returns the 30-sample rolling current history for a specific lamp.
 * The history is stored in the global SimulationContext and accumulates
 * from when the simulation (or hardware poll) starts — NOT from when
 * this hook mounts. So navigating away and back never resets the chart.
 *
 * @param {number} lampId - The lamp ID to retrieve history for
 * @returns {number[]} Array of 30 current readings (most recent last)
 */
export function useLampHistory(lampId) {
  const { lampHistories } = useSimulation();
  // Return global history for this lamp, or a peaceful baseline if not yet tracked
  return lampHistories[lampId] ?? Array(30).fill(0);
}
