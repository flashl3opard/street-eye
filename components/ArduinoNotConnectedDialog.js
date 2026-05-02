'use client';
import { Plug } from 'lucide-react';
import Dialog from './Dialog';

/**
 * Pre-configured "Arduino Not Connected" dialog.
 *
 * Pure UI — the open/close state is owned by the caller (typically
 * <ConnectionGate>) so it can decide *when* to surface this prompt
 * (e.g. only after the boot has actually attempted a fetch).
 */
export default function ArduinoNotConnectedDialog({ open, onClose, onSimulate, simulating }) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            accent="var(--amber)"
            icon={<Plug size={24} aria-hidden="true" />}
            title="Arduino Not Connected"
            actions={
                <>
                    {onSimulate && !simulating && (
                        <button
                            type="button"
                            className="dialog-btn dialog-btn-ghost"
                            onClick={() => { onSimulate(); onClose?.(); }}
                        >
                            Use simulated data
                        </button>
                    )}
                    <button
                        type="button"
                        className="dialog-btn dialog-btn-primary"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </>
            }
        >
            <p>Please connect your Arduino device to view live data.</p>
            <p className="dialog-hint">
                Sensor readings will display as <strong>--</strong> until a hardware connection is established.
            </p>
        </Dialog>
    );
}
