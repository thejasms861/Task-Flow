import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicBoard } from '../api/tasksApi';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Eye, AlertTriangle, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Task = {
    id: string;
    title: string;
    description?: string;
    priority: 'P0' | 'P1' | 'P2' | 'P3';
    column: string;
    column_name?: string;
    assignees: { id: number; display_name: string; avatar_url?: string }[];
    labels: { id: number; name: string; color: string }[];
    due_date?: string;
    subtask_count?: number;
    subtask_done_count?: number;
};

const PRIORITY: Record<string, { color: string; bg: string }> = {
    P0: { color: '#ff4444', bg: 'rgba(255,68,68,0.15)' },
    P1: { color: '#ffd166', bg: 'rgba(255,209,102,0.15)' },
    P2: { color: '#43e8a0', bg: 'rgba(67,232,160,0.15)' },
    P3: { color: '#888',    bg: 'rgba(255,255,255,0.07)' },
};

// ─── Read-only task card ───────────────────────────────────────────────────────

function ReadOnlyTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
    const p = PRIORITY[task.priority] || PRIORITY['P3'];
    const isOverdue = task.due_date && new Date() > new Date(task.due_date);

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ borderColor: 'rgba(108,99,255,0.4)', boxShadow: '0 4px 16px rgba(108,99,255,0.12)' }}
            onClick={onClick}
            style={{
                background: '#18181f',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px', padding: '10px 12px',
                cursor: 'pointer', userSelect: 'none',
            }}
        >
            {task.labels?.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {task.labels.map(l => (
                        <div key={l.id} title={l.name} style={{ width: '16px', height: '4px', borderRadius: '2px', background: l.color }} />
                    ))}
                </div>
            )}

            <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '10px', lineHeight: 1.4, color: '#fff' }}>
                {task.title}
            </p>

            {(task.subtask_count || 0) > 0 && (
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                    {task.subtask_done_count}/{task.subtask_count} subtasks
                </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 6px',
                        borderRadius: '4px', background: p.bg, color: p.color,
                    }}>
                        {task.priority}
                    </span>
                    {task.due_date && (
                        <span style={{ fontSize: '10px', color: isOverdue ? '#ff6584' : 'rgba(255,255,255,0.35)' }}>
                            {new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex' }}>
                    {(task.assignees || []).slice(0, 3).map((a, i) => (
                        <div key={a.id} title={a.display_name} style={{
                            width: '18px', height: '18px', borderRadius: '50%', background: '#444',
                            border: '1.5px solid #18181f',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '9px', fontWeight: 700, marginLeft: i > 0 ? '-5px' : '0', color: '#ddd',
                        }}>
                            {(a.display_name || '?')[0].toUpperCase()}
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Read-only task detail drawer ─────────────────────────────────────────────

function ReadOnlyTaskDrawer({ task, onClose }: { task: Task; onClose: () => void }) {
    const p = PRIORITY[task.priority] || PRIORITY['P3'];
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(2px)' }}
            />
            <motion.div
                initial={{ x: 440 }} animate={{ x: 0 }} exit={{ x: 440 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px',
                    background: 'var(--surface)', borderLeft: '1px solid var(--border)',
                    zIndex: 50, display: 'flex', flexDirection: 'column', overflowY: 'auto',
                }}
            >
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h2 style={{ fontSize: '17px', fontFamily: 'Syne, sans-serif', fontWeight: 700, lineHeight: 1.3, flex: 1, paddingRight: '12px' }}>
                            {task.title}
                        </h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <X size={20} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px',
                            background: p.bg, color: p.color,
                        }}>
                            {task.priority}
                        </span>
                        {task.labels?.map(l => (
                            <span key={l.id} style={{
                                fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '5px',
                                background: l.color + '22', color: l.color, border: '1px solid ' + l.color + '44',
                            }}>
                                {l.name}
                            </span>
                        ))}
                    </div>
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Assignees */}
                    {(task.assignees || []).length > 0 && (
                        <div>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                                Assignees
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {task.assignees.map(a => (
                                    <div key={a.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '7px',
                                        background: 'var(--surface2)', padding: '5px 12px', borderRadius: '20px', fontSize: '12px',
                                    }}>
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700,
                                        }}>
                                            {(a.display_name || '?')[0].toUpperCase()}
                                        </div>
                                        {a.display_name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Due date */}
                    {task.due_date && (
                        <div>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                                Due Date
                            </div>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                                {new Date(task.due_date).toLocaleDateString('en', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    )}

                    {/* Description */}
                    {task.description && (
                        <div>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                                Description
                            </div>
                            <p style={{
                                fontSize: '13px', color: 'rgba(255,255,255,0.7)',
                                lineHeight: 1.7, background: 'var(--surface2)',
                                border: '1px solid var(--border)', borderRadius: '8px',
                                padding: '12px',
                                whiteSpace: 'pre-wrap',
                            }}>
                                {task.description}
                            </p>
                        </div>
                    )}
                </div>

                <div style={{ padding: '1.5rem', marginTop: 'auto' }}>
                    <div style={{
                        padding: '10px 14px', borderRadius: '8px',
                        background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.15)',
                        fontSize: '11px', color: 'rgba(255,255,255,0.35)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <Eye size={13} color="rgba(108,99,255,0.6)" />
                        View-only — this is a shared board
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Public Board Page ────────────────────────────────────────────────────────

export default function PublicBoard() {
    const { token } = useParams<{ token: string }>();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['public-board', token],
        queryFn: () => getPublicBoard(token!),
        enabled: !!token,
        retry: false,
    });

    // ── Loading ──────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh', background: 'var(--bg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '16px',
            }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        border: '3px solid rgba(108,99,255,0.2)',
                        borderTopColor: 'var(--accent)',
                    }}
                />
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Loading shared board…</span>
            </div>
        );
    }

    // ── Error / disabled / expired ───────────────────────────────────
    if (isError || !data) {
        return (
            <div style={{
                minHeight: '100vh', background: 'var(--bg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '16px',
            }}>
                <div style={{
                    width: '64px', height: '64px', borderRadius: '20px',
                    background: 'rgba(255,101,132,0.1)', border: '1px solid rgba(255,101,132,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <AlertTriangle size={28} color="#ff6584" />
                </div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px' }}>Link unavailable</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', maxWidth: '340px' }}>
                    This share link is disabled, expired, or doesn't exist.
                </p>
                <Link to="/boards" style={{
                    marginTop: '8px', background: 'var(--accent)', color: '#fff',
                    padding: '10px 24px', borderRadius: '10px', textDecoration: 'none',
                    fontSize: '14px', fontWeight: 600,
                }}>
                    Go to TaskFlow
                </Link>
            </div>
        );
    }

    const { board, tasks } = data;
    const ownerName = board.owner?.display_name || board.owner?.email || 'a team member';
    const sortedCols = [...(board.columns || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    // Group tasks by column
    const tasksByCol: Record<string, Task[]> = {};
    (tasks || []).forEach((t: Task) => {
        const colId = String(t.column);
        if (!tasksByCol[colId]) tasksByCol[colId] = [];
        tasksByCol[colId].push(t);
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
            {/* ── Navbar ───────────────────────────────────────────── */}
            <nav style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '0 2rem', height: '52px', flexShrink: 0,
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                background: 'var(--surface)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Layers size={20} color="var(--accent)" />
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                        TaskFlow
                    </span>
                </div>
                <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
                <span style={{
                    fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '6px',
                    background: 'rgba(67,232,160,0.1)', color: '#43e8a0',
                    border: '1px solid rgba(67,232,160,0.2)',
                    display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                    <Eye size={11} />
                    View Only
                </span>
                <div style={{ flex: 1 }} />
                <Link to="/" style={{
                    fontSize: '12px', color: 'var(--accent)', textDecoration: 'none',
                    fontWeight: 600, padding: '5px 14px', borderRadius: '8px',
                    border: '1px solid rgba(108,99,255,0.3)',
                    background: 'rgba(108,99,255,0.08)',
                }}>
                    Sign in to TaskFlow →
                </Link>
            </nav>

            {/* ── Banner ───────────────────────────────────────────── */}
            <div style={{
                background: 'rgba(108,99,255,0.07)',
                borderBottom: '1px solid rgba(108,99,255,0.15)',
                padding: '10px 2rem',
                display: 'flex', alignItems: 'center', gap: '10px',
                fontSize: '13px', color: 'rgba(255,255,255,0.55)',
            }}>
                <Eye size={14} color="rgba(108,99,255,0.7)" />
                This is a <strong style={{ color: 'rgba(255,255,255,0.8)', margin: '0 3px' }}>read-only</strong> view
                shared by <strong style={{ color: 'var(--accent)', margin: '0 3px' }}>{ownerName}</strong>
                <span style={{ marginLeft: '4px' }}>—</span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#fff', marginLeft: '4px' }}>{board.name}</span>
            </div>

            {/* ── Board ────────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '1.5rem 2rem' }}>
                <div style={{ display: 'flex', gap: '16px', height: '100%', alignItems: 'flex-start', minHeight: '70vh' }}>
                    {sortedCols.map((col: any) => {
                        const colTasks = tasksByCol[String(col.id)] || [];
                        return (
                            <motion.div
                                key={col.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}
                            >
                                {/* Column header */}
                                <div style={{
                                    background: 'var(--surface)',
                                    borderTop: `3px solid ${col.color || '#6c63ff'}`,
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderBottom: 'none',
                                    borderRadius: '10px 10px 0 0',
                                    padding: '12px 14px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                }}>
                                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px' }}>
                                        {col.name}
                                    </span>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)',
                                    }}>
                                        {colTasks.length}
                                    </span>
                                </div>

                                {/* Column body */}
                                <div style={{
                                    flex: 1, minHeight: '60vh', padding: '10px',
                                    background: 'rgba(255,255,255,0.015)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderTop: 'none', borderRadius: '0 0 10px 10px',
                                    display: 'flex', flexDirection: 'column', gap: '8px',
                                }}>
                                    {colTasks.map((task) => (
                                        <ReadOnlyTaskCard
                                            key={task.id}
                                            task={task}
                                            onClick={() => setSelectedTask(task)}
                                        />
                                    ))}
                                    {colTasks.length === 0 && (
                                        <div style={{
                                            flex: 1, border: '1px dashed rgba(255,255,255,0.06)',
                                            borderRadius: '8px', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', color: 'rgba(255,255,255,0.12)',
                                            fontSize: '11px', minHeight: '60px', fontStyle: 'italic',
                                        }}>
                                            No tasks
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ── Footer ───────────────────────────────────────────── */}
            <div style={{
                padding: '14px 2rem', borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '12px', color: 'rgba(255,255,255,0.2)',
            }}>
                <Layers size={12} color="rgba(108,99,255,0.5)" />
                Powered by <strong style={{ color: 'rgba(108,99,255,0.6)', marginLeft: '3px' }}>TaskFlow</strong>
                <span style={{ marginLeft: 'auto' }}>
                    <Eye size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Read-only view
                </span>
            </div>

            {/* ── Read-only task drawer ─────────────────────────────── */}
            <AnimatePresence>
                {selectedTask && (
                    <ReadOnlyTaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
