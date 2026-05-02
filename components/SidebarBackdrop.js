'use client';
import { useSimulation } from '../context/SimulationContext';

/**
 * SidebarBackdrop — semi-transparent overlay shown only when the mobile
 * sidebar is open. Tapping it closes the sidebar. Hidden via CSS at
 * desktop widths so it never interferes with normal layout.
 */
export default function SidebarBackdrop() {
    const { sidebarOpen, closeSidebar } = useSimulation();
    if (!sidebarOpen) return null;
    return (
        <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close menu"
            onClick={closeSidebar}
        />
    );
}
