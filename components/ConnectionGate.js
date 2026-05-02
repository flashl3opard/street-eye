'use client';
import { useEffect, useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import ArduinoNotConnectedDialog from './ArduinoNotConnectedDialog';

/**
 * ConnectionGate — single global mount that decides whether to surface the
 * "Arduino Not Connected" dialog.
 *
 * Rules:
 *  • bootState === 'connecting' → never show (initial poll hasn't finished)
 *  • bootState === 'simulating' → never show (sim is intentional)
 *  • bootState === 'disconnected' → show, until the user dismisses
 *  • once dismissed, only re-open after a successful reconnect → fresh disconnect
 */
export default function ConnectionGate() {
    const { bootState, toggleSimulate, simulating } = useSimulation();
    const [dismissed, setDismissed] = useState(false);

    // Reset the dismissal whenever we transition INTO 'connected' so the
    // next disconnect cycle gets to surface again.
    useEffect(() => {
        if (bootState === 'connected') setDismissed(false);
    }, [bootState]);

    const open = bootState === 'disconnected' && !dismissed;

    return (
        <ArduinoNotConnectedDialog
            open={open}
            onClose={() => setDismissed(true)}
            onSimulate={toggleSimulate}
            simulating={simulating}
        />
    );
}
