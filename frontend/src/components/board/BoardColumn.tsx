import { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskCard from './TaskCard';

type BoardFilters = { priority?: string; due?: string; assignee?: string };

function taskMatchesFilters(task: any, filters: BoardFilters): boolean {
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.assignee) {
        const ids = (task.assignees || []).map((a: any) => String(a.id));
        if (!ids.includes(filters.assignee)) return false;
    }
    if (filters.due) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = task.due_date ? new Date(task.due_date) : null;
        if (!due) return false;
        if (filters.due === 'today') {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            if (!(due >= today && due < tomorrow)) return false;
        } else if (filters.due === 'overdue') {
            if (due >= today) return false;
        }
    }
    return true;
}

interface BoardColumnProps {
    column: any;
    tasks: any[];
    boardId?: string;
    onTaskClick: (task: any) => void;
    onAddTask: (colId: string, title: string) => void;
    filters?: BoardFilters;
    hasActiveFilters?: boolean;
}

export default function BoardColumn({
    column, tasks, onTaskClick, onAddTask, filters = {}, hasActiveFilters = false
}: BoardColumnProps) {
    const [adding, setAdding] = useState(false);
    const [title, setTitle] = useState('');
    const { setNodeRef, isOver } = useDroppable({ id: String(column.id) });
    const taskIds = (tasks || []).map((t: any) => String(t.id));
    const wip = column.wip_limit;
    const wipExceeded = wip && tasks.length > wip;

    // Count matched tasks when filters are active
    const matchedCount = hasActiveFilters
        ? tasks.filter(t => taskMatchesFilters(t, filters)).length
        : tasks.length;

    const submit = () => {
        if (!title.trim()) return;
        onAddTask(column.id, title.trim());
        setTitle('');
        setAdding(false);
    };

    return (
        <div style={{ minWidth: '320px', flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
                background: 'var(--tf-surface)',
                borderTop: `3px solid ${column.color || 'var(--tf-accent)'}`,
                border: '0.5px solid var(--tf-border)',
                borderBottom: 'none',
                borderRadius: '10px 10px 0 0',
                padding: '12px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '14px', color: 'var(--tf-text)' }}>
                        {column.name}
                    </span>

                    {/* Count badge — shows matched/total when filters active */}
                    <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
                        background: wipExceeded ? 'rgba(226,75,74,0.15)' : 'var(--tf-surface2)',
                        color: wipExceeded ? 'var(--tf-red)' : 'var(--tf-text-secondary)',
                        border: `0.5px solid ${wipExceeded ? 'rgba(226,75,74,0.4)' : 'transparent'}`,
                        fontFamily: 'var(--font-body)'
                    }}>
                        {hasActiveFilters ? `${matchedCount}/${tasks.length}` : tasks.length}
                        {wip ? `/${wip}` : ''}
                    </span>
                </div>

                <button
                    onClick={() => setAdding(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tf-text-tertiary)', display: 'flex', padding: '2px' }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--tf-text)'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--tf-text-tertiary)'}
                >
                    <Plus size={15} />
                </button>
            </div>

            {/* Body */}
            <div ref={setNodeRef} style={{
                flex: 1, padding: '10px',
                background: isOver ? 'rgba(108,99,255,0.05)' : 'transparent',
                border: '0.5px solid var(--tf-border)',
                borderTop: 'none', borderRadius: '0 0 10px 10px',
                display: 'flex', flexDirection: 'column', gap: '8px',
                transition: 'background 0.2s',
                overflowY: 'auto'
            }}>
                <AnimatePresence>
                    {adding && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                            <div style={{ background: 'var(--tf-surface)', border: '0.5px solid var(--tf-accent)', borderRadius: '8px', padding: '8px' }}>
                                <input
                                    autoFocus
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') submit();
                                        if (e.key === 'Escape') { setAdding(false); setTitle(''); }
                                    }}
                                    style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: 'var(--tf-text)', fontSize: '13px', fontFamily: 'var(--font-body)' }}
                                    placeholder='Task title...'
                                />
                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                    <button onClick={submit} style={{ background: 'var(--tf-accent)', border: 'none', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                                        <Check size={12} />
                                    </button>
                                    <button onClick={() => { setAdding(false); setTitle(''); }} style={{ background: 'var(--tf-surface2)', border: '0.5px solid var(--tf-border)', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', color: 'var(--tf-text-secondary)', display: 'flex', alignItems: 'center' }}>
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {(tasks || []).map((task: any) => {
                        const isMatch = !hasActiveFilters || taskMatchesFilters(task, filters);
                        return (
                            <motion.div
                                key={task.id}
                                animate={{
                                    opacity: isMatch ? 1 : 0.2,
                                    scale: isMatch ? 1 : 0.97,
                                    filter: isMatch ? 'none' : 'grayscale(60%)',
                                }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                style={{ pointerEvents: isMatch ? 'auto' : 'none' }}
                            >
                                <TaskCard task={task} onClick={() => onTaskClick(task)} />
                            </motion.div>
                        );
                    })}
                </SortableContext>

                {tasks.length === 0 && !adding && (
                    <div style={{
                        flex: 1, border: '1px dashed var(--tf-border)', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--tf-text-tertiary)', fontSize: '12px', minHeight: '60px',
                        fontStyle: 'italic', fontFamily: 'var(--font-body)'
                    }}>
                        No tasks yet
                    </div>
                )}

                {/* Empty state when filters match nothing */}
                {hasActiveFilters && matchedCount === 0 && tasks.length > 0 && (
                    <div style={{
                        border: '1px dashed rgba(108,99,255,0.2)', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--tf-text-secondary)', fontSize: '11px', minHeight: '40px',
                        fontStyle: 'italic', marginTop: '4px',
                    }}>
                        No matches in this column
                    </div>
                )}
            </div>
        </div>
    );
}
