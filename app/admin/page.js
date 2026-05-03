'use client';
import { Sliders } from 'lucide-react';
import { useHardwareData } from '../../components/useHardwareData';

const MODES = [
    { key: 'low', label: 'Low', range: '3-8' },
    { key: 'medium', label: 'Medium', range: '14-21' },
    { key: 'high', label: 'High', range: '31-41' },
];

function formatMode(mode) {
    if (!mode || mode === 'off') return 'Off';
    return mode[0].toUpperCase() + mode.slice(1);
}

export default function AdminPage() {
    const { ldrOverrideMode, updateLdrOverrideMode } = useHardwareData();

    const setMode = (mode) => {
        updateLdrOverrideMode(ldrOverrideMode === mode ? 'off' : mode);
    };

    return (
        <main className="content">
            <div className="page-header">
                <div>
                    <div className="page-eyebrow">System Tools</div>
                    <h1 className="page-title">LDR <em>Admin</em></h1>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '640px' }}>
                <div className="card-head">
                    <span className="card-title">LDR Override</span>
                    <span className="card-badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
                        {formatMode(ldrOverrideMode)}
                    </span>
                </div>
                <div className="card-body">
                    <div style={{ fontSize: '12px', color: 'var(--ink3)', marginBottom: '14px' }}>
                        Pick a range to randomize LDR values every 3-4 seconds. Click the active mode again to turn it off.
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {MODES.map(mode => {
                            const active = ldrOverrideMode === mode.key;
                            return (
                                <button
                                    key={mode.key}
                                    type="button"
                                    onClick={() => setMode(mode.key)}
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: 'var(--radius-xs)',
                                        border: `1.5px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
                                        background: active ? 'var(--blue-light)' : 'var(--cream2)',
                                        color: 'var(--ink)',
                                        fontWeight: active ? 700 : 500,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    <Sliders size={14} aria-hidden="true" />
                                    {mode.label}
                                    <span style={{ fontSize: '11px', color: 'var(--ink3)' }}>({mode.range})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </main>
    );
}
