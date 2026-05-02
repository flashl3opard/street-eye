'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useHardwareData } from '../../components/useHardwareData';

export default function AllLogsPage() {
    const { simulating, eventLog, arduinoConnected } = useHardwareData();
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const viewportRef = useRef(null);

    const filteredLogs = useMemo(() => {
        return eventLog.filter(entry => {
            const matchType = typeFilter === 'all' || entry.type === typeFilter;
            const q = query.trim().toLowerCase();
            const matchQuery = q.length === 0
                || entry.title?.toLowerCase().includes(q)
                || entry.msg?.toLowerCase().includes(q)
                || String(entry.lampId || '').includes(q);
            return matchType && matchQuery;
        });
    }, [eventLog, query, typeFilter]);

    useEffect(() => {
        if (!viewportRef.current) return;
        viewportRef.current.scrollTop = 0;
    }, [filteredLogs.length]);

    return (
                <main className="content">
                    <div className="page-header">
                        <div>
                            <div className="page-eyebrow">Realtime Event Stream</div>
                            <h1 className="page-title">All <em>Logs</em></h1>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: '14px' }}>
                        <div className="card-body" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div className="search-bar">
                                <Search size={14} className="icon-inline" aria-hidden="true" />
                                <input
                                    type="text"
                                    placeholder="Filter by title, message, lamp id..."
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                />
                            </div>

                            <div className="filter-pills">
                                {['all', 'fault', 'warn', 'ok', 'info'].map(t => (
                                    <div
                                        key={t}
                                        className={`pill ${typeFilter === t ? 'active-pill' : ''}`}
                                        onClick={() => setTypeFilter(t)}
                                    >
                                        {t.toUpperCase()}
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--ink3)' }}>
                                {filteredLogs.length} / {eventLog.length} entries
                            </div>
                        </div>
                    </div>

                    <div className="log-cli-card">
                        <div className="log-cli-header">
                            <span className="dot red"></span>
                            <span className="dot amber"></span>
                            <span className="dot green"></span>
                            <span className="log-cli-title">street-eye@runtime:~$ tail -f logs</span>
                        </div>

                        <div className="log-cli-body" ref={viewportRef}>
                            {filteredLogs.length === 0 ? (
                                <div className="log-cli-line dim">
                                    {arduinoConnected || simulating
                                        ? '[waiting] Live link active — no log entries yet.'
                                        : '[waiting] Connect your Arduino to see live events.'}
                                </div>
                            ) : (
                                filteredLogs.map((entry, idx) => (
                                    <div key={entry.id || idx} className="log-cli-line">
                                        <span className="log-time-code">[{entry.time || '--:--:--'}]</span>{' '}
                                        <span className={`log-type-chip ${entry.type || 'info'}`}>{String(entry.type || 'info').toUpperCase()}</span>{' '}
                                        <span className="log-title-code">{entry.title || 'EVENT'}</span>{' '}
                                        {entry.lampId ? <span className="log-lamp-code">(L{entry.lampId})</span> : null}
                                        <span className="log-msg-code"> - {entry.msg || 'No details'}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
    );
}
