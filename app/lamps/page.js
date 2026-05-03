'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Lightbulb } from 'lucide-react';
import SensorValue from '../../components/SensorValue';
import { useHardwareData } from '../../components/useHardwareData';
import { STATUS_LABELS, STATUS_ICONS, STATUS_COLORS } from '../../lib/lampData';

const FILTER_OPTIONS = ['All', 'Working', 'Faults', 'Warnings', 'Standby'];

export default function LampsPage() {
  const router = useRouter();
  const { lamps, simulating, arduinoConnected, componentConfig } = useHardwareData();
  const showLive = arduinoConnected || simulating;
  const pirEnabled = componentConfig?.pir !== false;
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('id');

  const filtered = lamps
    .filter(l => {
      const f = filter === 'All' ||
        (filter === 'Working' && l.status === 'ok') ||
        (filter === 'Faults' && l.status === 'fault') ||
        (filter === 'Warnings' && l.status === 'warn') ||
        (filter === 'Standby' && l.status === 'standby');
      const s = !search || l.label?.toLowerCase().includes(search.toLowerCase()) || String(l.id).includes(search);
      return f && s;
    })
    .sort((a, b) => {
      if (sortBy === 'id') return a.id - b.id;
      if (sortBy === 'current') return (b.current || 0) - (a.current || 0);
      if (sortBy === 'ldr') return (b.ldr || 0) - (a.ldr || 0);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

  return (
    <main className="content">
          <div className="page-header">
            <div>
              <div className="page-eyebrow">Campus Network · Block A</div>
              <h1 className="page-title">Lamp <em>Grid</em></h1>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div className="search-bar">
              <Search size={14} className="icon-inline" aria-hidden="true" />
              <input type="text" placeholder="Search by name or ID…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="filter-pills">
              {FILTER_OPTIONS.map(f => (
                <div key={f} className={`pill ${filter === f ? 'active-pill' : ''}`} onClick={() => setFilter(f)}>{f}</div>
              ))}
            </div>
            <select
              value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)', background: 'var(--cream2)', color: 'var(--ink)', fontSize: '12px', cursor: 'pointer' }}
              aria-label="Sort lamps"
            >
              <option value="id">Sort: ID</option>
              <option value="current">Sort: Current ↓</option>
              <option value="ldr">Sort: LDR ↓</option>
              <option value="status">Sort: Status</option>
            </select>
            <span style={{ fontSize: '12px', color: 'var(--ink3)', marginLeft: 'auto' }}>{filtered.length} of {lamps.length} lamps</span>
          </div>

          {/* Table view */}
          <div className="card">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--cream2)', borderBottom: '1px solid var(--border)' }}>
                  {['Lamp', 'Location', 'Status', 'Current (A)', 'LDR %', 'Temp °C', 'PIR', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lamp, i) => {
                  const color = STATUS_COLORS[lamp.status];
                  const Icon = STATUS_ICONS[lamp.status] || Lightbulb;
                  return (
                    <tr
                      key={lamp.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: i % 2 ? 'var(--cream)' : 'var(--white)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onClick={() => router.push(`/lamp/${lamp.id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--amber-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 ? 'var(--cream)' : 'var(--white)'}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                        <span style={{ marginRight: '8px', display: 'inline-flex', verticalAlign: 'middle' }}>
                          <Icon size={16} color={color} aria-hidden="true" />
                        </span>
                        #{String(lamp.id).padStart(2, '0')}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink2)' }}>{lamp.label}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: `${color}18`, color, fontWeight: '700',
                          fontSize: '10px', padding: '3px 8px', borderRadius: '4px',
                          textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>{STATUS_LABELS[lamp.status]}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color }}>
                        <SensorValue value={lamp.current} connected={showLive} format={v => v.toFixed(2)} />
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--blue)', fontWeight: '600' }}>
                        <SensorValue value={lamp.ldr} connected={showLive} unit="%" />
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink2)' }}>
                        <SensorValue value={lamp.temp} connected={showLive} unit="°C" />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: lamp.pir ? 'var(--amber)' : 'var(--green)', fontWeight: '600', fontSize: '11px' }}>
                          {pirEnabled
                            ? (showLive ? (lamp.pir ? '● MOTION' : '○ STABLE') : '--')
                            : 'DISABLED'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/lamp/${lamp.id}`); }}
                          style={{ padding: '5px 12px', background: 'var(--amber-light)', color: 'var(--amber-dark)', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: '600', fontSize: '11px', cursor: 'pointer' }}
                        >Inspect →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ink3)' }}>No lamps found</div>
            )}
          </div>
        </main>
  );
}
