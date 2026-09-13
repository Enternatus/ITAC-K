import React, { useState, useRef, useEffect } from 'react';
import { Badge, Tabs } from '../components';
import type { EventEntry, EventCategory } from '../data';
import { formatTimestamp } from '../data';

interface Props {
  events: EventEntry[];
  initialSlotFilter?: number;
  connected: boolean;
}

const CATEGORIES = ['ALL', 'DECISION', 'EVIDENCE', 'SYSTEM'] as const;
type CategoryFilter = typeof CATEGORIES[number];

function groupByDay(events: EventEntry[]): Array<{ date: string; events: EventEntry[] }> {
  const groups: Record<string, EventEntry[]> = {};
  for (const e of events) {
    const key = new Date(e.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return Object.entries(groups).map(([date, events]) => ({ date, events }));
}

export default function EventHistory({ events, initialSlotFilter, connected }: Props) {
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [slotFilter, setSlotFilter] = useState<number | undefined>(initialSlotFilter);
  const [search, setSearch] = useState('');
  const [atLiveEdge, setAtLiveEdge] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSlotFilter) setSlotFilter(initialSlotFilter);
  }, [initialSlotFilter]);

  const filtered = events.filter(e => {
    if (category !== 'ALL') {
      if (e.category !== category) return false;
    }
    if (slotFilter && e.slotId !== slotFilter) return false;
    if (search && !e.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const groups = groupByDay(filtered);
  const hasFilters = category !== 'ALL' || slotFilter !== undefined || search !== '';

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtLiveEdge(nearBottom);
  }

  function jumpToNow() {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setAtLiveEdge(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Tabs tabs={[...CATEGORIES]} active={category} onChange={t => setCategory(t as CategoryFilter)} />

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[1, 2, 3].map(id => (
            <button key={id} onClick={() => setSlotFilter(slotFilter === id ? undefined : id)}
              style={{
                padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                background: slotFilter === id ? '#1E2328' : 'transparent',
                border: `1px solid ${slotFilter === id ? '#3FB6D6' : '#262B31'}`,
                color: slotFilter === id ? '#3FB6D6' : '#8A929C',
              }}>
              Slot {id}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events…"
          style={{
            background: '#161A1E', border: '1px solid #262B31', borderRadius: 4,
            color: '#EDEFF1', fontSize: 12, padding: '5px 10px', outline: 'none',
            fontFamily: 'Inter', width: 180,
          }}
        />

        {hasFilters && (
          <button onClick={() => { setCategory('ALL'); setSlotFilter(undefined); setSearch(''); }}
            style={{ background: 'none', border: '1px solid #262B31', color: '#8A929C', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
            Clear filters ×
          </button>
        )}
      </div>

      {/* Connection warning */}
      {!connected && (
        <div style={{
          padding: '6px 12px', background: '#E5533D11', borderLeft: '4px solid #E5533D',
          borderRadius: '0 4px 4px 0', fontSize: 12, color: '#E5533D',
        }}>
          ⚡ Log ingestion paused — reconnecting…
        </div>
      )}

      {/* Timeline */}
      <div ref={containerRef} onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', position: 'relative', minHeight: 400 }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
            <div style={{ fontSize: 14, color: '#4A515A' }}>No events match these filters</div>
            <button onClick={() => { setCategory('ALL'); setSlotFilter(undefined); setSearch(''); }}
              style={{ background: 'none', border: '1px solid #262B31', color: '#8A929C', borderRadius: 4, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
              Clear filters
            </button>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.date}>
              {/* Sticky date divider */}
              <div style={{
                position: 'sticky', top: 0, zIndex: 10, padding: '6px 0',
                background: '#0E1114', borderBottom: '1px solid #262B31',
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: '#4A515A',
              }}>
                {group.date}
              </div>
              {group.events.map((evt, i) => (
                <div key={evt.id}>
                  <div
                    onClick={() => setExpandedId(expandedId === evt.id ? null : evt.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 0 8px 10px', height: 36, cursor: 'pointer',
                      borderBottom: '1px solid #1A1F24',
                      borderLeft: evt.accent ? '3px solid #E8A33D' : '3px solid transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#161A1E')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#4A515A', minWidth: 64, flexShrink: 0 }}>
                      {formatTimestamp(evt.timestamp)}
                    </span>
                    <span style={{ fontSize: 12, color: evt.accent ? '#EDEFF1' : '#8A929C', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {evt.text}
                    </span>
                    <Badge label={evt.category} size="sm" />
                    {evt.accent && <span style={{ fontSize: 10, color: '#E8A33D' }}>▼</span>}
                  </div>

                  {/* Inline expansion for decision-change rows */}
                  {expandedId === evt.id && evt.accent && (
                    <div style={{
                      background: '#161A1E', borderLeft: '3px solid #E8A33D',
                      padding: '12px 16px', marginLeft: 10, borderBottom: '1px solid #262B31',
                    }}>
                      <div style={{ fontSize: 12, color: '#EDEFF1', lineHeight: 1.6, marginBottom: 8 }}>
                        <span style={{ color: '#8A929C' }}>Decision snapshot: </span>
                        {evt.text}. The boundary state at this moment was NARROW, prompting evidence acquisition.
                        Policy A had 68% confidence vs Policy B at 51% — gap insufficient for exploitation.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {evt.slotId && <Badge label={`SLOT ${evt.slotId}`} size="sm" />}
                        <Badge label="DECISION" size="sm" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Jump to now */}
      {!atLiveEdge && (
        <button onClick={jumpToNow} style={{
          position: 'fixed', bottom: 24, right: 24,
          background: '#1E2328', border: '1px solid #3FB6D6', color: '#3FB6D6',
          borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, zIndex: 20,
        }}>
          ↑ Jump to now
        </button>
      )}
    </div>
  );
}
