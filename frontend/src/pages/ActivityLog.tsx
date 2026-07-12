import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Filter, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getBoardActivities } from '../api/activityApi';
import { useBoardStore } from '../store/boardStore';
import NotificationBell from '../components/ui/NotificationBell';

const FILTERS = [
    { key: '', label: 'All Activities' },
    { key: 'created', label: 'Task Created' },
    { key: 'moved', label: 'Moved' },
    { key: 'priority', label: 'Priority Changed' },
];

export default function ActivityLog() {
    const { id: boardId } = useParams<{ id: string }>();
    const board = useBoardStore(s => s.board);
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(1);
    const [activities, setActivities] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(true);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['activities', boardId, filter, page],
        queryFn: () => getBoardActivities(boardId!, page, filter),
        enabled: !!boardId,
    });

    useEffect(() => {
        if (data) {
            if (page === 1) {
                setActivities(data.results || []);
            } else {
                setActivities(prev => [...prev, ...(data.results || [])]);
            }
            setHasMore(!!data.next);
        }
    }, [data, page]);

    const handleFilterChange = (f: string) => {
        setFilter(f);
        setPage(1);
        setActivities([]);
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--tf-bg)', color: 'var(--tf-text)', padding: '2rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link to={`/board/${boardId}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', textDecoration: 'none', fontSize: '14px' }}>
                            <ChevronLeft size={18} />
                            Back to Board
                        </Link>
                        <h1 style={{ fontSize: '24px', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>Activity Log</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <NotificationBell />
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => handleFilterChange(f.key)}
                            style={{
                                padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                                padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                                background: filter === f.key ? 'var(--tf-accent)' : 'var(--tf-surface)',
                                border: '1px solid ' + (filter === f.key ? 'var(--tf-accent)' : 'var(--tf-border)'),
                                color: filter === f.key ? '#fff' : 'var(--tf-text-secondary)',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div style={{ background: 'var(--tf-surface)', borderRadius: '16px', border: '1px solid var(--tf-border)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--tf-border)', background: 'var(--tf-surface2)' }}>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</th>
                                    <th style={{ padding: '16px 20px', fontSize: '11px', color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activities.map((act) => (
                                    <tr key={act.id} style={{ borderBottom: '1px solid var(--tf-border)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--tf-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff' }}>
                                                    {act.actor?.display_name?.[0].toUpperCase()}
                                                </div>
                                                <span style={{ fontSize: '13px', fontWeight: 500 }}>{act.actor?.display_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--tf-text-secondary)' }}>{act.verb}</td>
                                        <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                                            {act.detail?.from_column ? (
                                                <span style={{ color: 'var(--tf-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                    from{' '}
                                                    <span style={{
                                                        background: 'var(--tf-surface2)', padding: '2px 8px',
                                                        borderRadius: '5px', color: 'var(--tf-text-secondary)', fontSize: '12px',
                                                    }}>
                                                        {act.detail.from_column_name || act.detail.from_column}
                                                    </span>
                                                    to{' '}
                                                    <span style={{
                                                        background: 'var(--tf-accent-glow)', padding: '2px 8px',
                                                        borderRadius: '5px', color: 'var(--tf-accent)', fontSize: '12px',
                                                        border: '1px solid var(--tf-accent)',
                                                    }}>
                                                        {act.detail.to_column_name || act.detail.to_column}
                                                    </span>
                                                </span>
                                            ) : (
                                                act.task_title ? (
                                                    <span style={{
                                                        color: 'var(--tf-text-secondary)', fontStyle: 'italic',
                                                        fontSize: '12px', maxWidth: '260px', display: 'block',
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {act.task_title}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--tf-text-tertiary)' }}>—</span>
                                                )
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--tf-text-tertiary)' }}>
                                          {formatDistanceToNow(new Date(act.created_at), { addSuffix: true })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {isLoading && activities.length === 0 && (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--tf-text-tertiary)' }}>Loading activities...</div>
                    )}

                    {!isLoading && activities.length === 0 && (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--tf-text-tertiary)' }}>No activities found.</div>
                    )}

                    {hasMore && (
                        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={isFetching}
                                style={{
                                    background: 'var(--tf-surface2)', border: '1px solid var(--tf-border)',
                                    color: 'var(--tf-text)', padding: '8px 24px', borderRadius: '8px', cursor: 'pointer',
                                    fontSize: '13px', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-border)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'var(--tf-surface2)')}
                            >
                                {isFetching ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
