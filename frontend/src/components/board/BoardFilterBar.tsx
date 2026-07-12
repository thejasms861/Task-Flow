import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Filters {
    priority?: string;
    due?: string;
    assignee?: string;
}

interface BoardFilterBarProps {
    board: any;
    filters: Filters;
    onFilterChange: (key: keyof Filters, value: string | undefined) => void;
    onClearFilters: () => void;
}

const PRIORITY_META: Record<string, { color: string; bg: string; glow: string; border: string }> = {
    P0: { color: 'var(--tf-red)', bg: 'rgba(226,75,74,0.18)',   glow: 'rgba(226,75,74,0.35)',   border: 'rgba(226,75,74,0.5)'   },
    P1: { color: 'var(--tf-yellow)', bg: 'rgba(186,117,23,0.18)', glow: 'rgba(186,117,23,0.35)', border: 'rgba(186,117,23,0.5)' },
    P2: { color: 'var(--tf-green)', bg: 'rgba(29,158,117,0.18)',  glow: 'rgba(29,158,117,0.35)',  border: 'rgba(29,158,117,0.5)'  },
    P3: { color: 'var(--tf-muted)', bg: 'rgba(136,133,168,0.15)', glow: 'rgba(136,133,168,0.3)',  border: 'rgba(136,133,168,0.4)' },
};

const DUE_META: Record<string, { color: string; bg: string; border: string; icon: string }> = {
    today:   { color: 'var(--tf-blue)', bg: 'rgba(55,138,221,0.15)', border: 'rgba(55,138,221,0.4)',  icon: '📅' },
    overdue: { color: 'var(--tf-pink)', bg: 'rgba(212,83,126,0.15)', border: 'rgba(212,83,126,0.4)', icon: '⚠️' },
};

const DIVIDER = () => (
    <div style={{ width: '1px', height: '22px', background: 'var(--tf-border)', flexShrink: 0 }} />
);

export default function BoardFilterBar({ board, filters, onFilterChange, onClearFilters }: BoardFilterBarProps) {
    const hasActiveFilters = !!(filters.priority || filters.due || filters.assignee);

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
            flexWrap: 'wrap', position: 'relative', background: 'var(--tf-surface)',
            border: '0.5px solid var(--tf-border)', borderRadius: '10px', margin: '20px 28px 0'
        }}>
            {/* ── Priority ─────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                    fontSize: '10px', fontWeight: 600, color: 'var(--tf-text-tertiary)',
                    textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
                }}>
                    Priority
                </span>

                <PillButton
                    active={!filters.priority}
                    onClick={() => onFilterChange('priority', undefined)}
                    label="All"
                />

                {(['P0', 'P1', 'P2', 'P3'] as const).map(p => {
                    const m = PRIORITY_META[p];
                    const isActive = filters.priority === p;
                    return (
                        <motion.button
                            key={p}
                            onClick={() => onFilterChange('priority', isActive ? undefined : p)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                                fontWeight: 700, cursor: 'pointer', border: 'none',
                                background: isActive ? m.bg : 'var(--tf-surface2)',
                                color: isActive ? m.color : 'var(--tf-text-secondary)',
                                outline: isActive ? `1.5px solid ${m.border}` : '1.5px solid var(--tf-border)',
                                boxShadow: isActive ? `0 0 10px ${m.glow}` : 'none',
                                transition: 'all 0.2s',
                                letterSpacing: '0.03em',
                            }}
                        >
                            {p}
                        </motion.button>
                    );
                })}
            </div>

            <DIVIDER />

            {/* ── Due ──────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                    fontSize: '10px', fontWeight: 600, color: 'var(--tf-text-tertiary)',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                    Due
                </span>

                <PillButton
                    active={!filters.due}
                    onClick={() => onFilterChange('due', undefined)}
                    label="All"
                />

                {(['today', 'overdue'] as const).map(d => {
                    const m = DUE_META[d];
                    const isActive = filters.due === d;
                    return (
                        <motion.button
                            key={d}
                            onClick={() => onFilterChange('due', isActive ? undefined : d)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                                fontWeight: 600, cursor: 'pointer', border: 'none',
                                background: isActive ? m.bg : 'var(--tf-surface2)',
                                color: isActive ? m.color : 'var(--tf-text-secondary)',
                                outline: isActive ? `1.5px solid ${m.border}` : '1.5px solid var(--tf-border)',
                                boxShadow: isActive ? `0 0 10px ${m.border}` : 'none',
                                transition: 'all 0.2s',
                                textTransform: 'capitalize',
                            }}
                        >
                            {d === 'today' ? '📅 Today' : '⚠️ Overdue'}
                        </motion.button>
                    );
                })}
            </div>

            <DIVIDER />

            {/* ── Assignee ─────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                    fontSize: '10px', fontWeight: 600, color: 'var(--tf-text-tertiary)',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                    Assignee
                </span>

                <PillButton
                    active={!filters.assignee}
                    onClick={() => onFilterChange('assignee', undefined)}
                    label="All"
                />

                <div style={{ display: 'flex', gap: '4px' }}>
                    {(board?.members || []).map((m: any) => {
                        const userId = String(m.user?.id);
                        const isActive = filters.assignee === userId;
                        const name = m.user?.display_name || '?';
                        const initial = name[0].toUpperCase();

                        return (
                            <motion.button
                                key={userId}
                                onClick={() => onFilterChange('assignee', isActive ? undefined : userId)}
                                title={name}
                                whileHover={{ scale: 1.12 }}
                                whileTap={{ scale: 0.92 }}
                                style={{
                                    width: '26px', height: '26px', borderRadius: '50%',
                                    border: 'none', cursor: 'pointer',
                                    background: isActive
                                        ? 'var(--tf-accent)'
                                        : 'var(--tf-surface2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '10px', fontWeight: 700,
                                    color: isActive ? '#fff' : 'var(--tf-text-secondary)',
                                    backgroundImage: m.user?.avatar_url ? `url(${m.user.avatar_url})` : 'none',
                                    backgroundSize: 'cover',
                                    boxShadow: isActive
                                        ? '0 0 0 2px var(--tf-accent), 0 0 12px rgba(108,99,255,0.5)'
                                        : '0 0 0 1px var(--tf-border)',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                }}
                            >
                                {!m.user?.avatar_url && initial}
                                {isActive && (
                                    <motion.div
                                        layoutId="assignee-glow"
                                        style={{
                                            position: 'absolute', inset: '-3px', borderRadius: '50%',
                                            border: '2px solid var(--tf-accent)', pointerEvents: 'none',
                                        }}
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* ── Clear Filters ─────────────────────────── */}
            <AnimatePresence>
                {hasActiveFilters && (
                    <motion.button
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        onClick={onClearFilters}
                        style={{
                            marginLeft: 'auto', background: 'var(--tf-surface2)',
                            border: '0.5px solid var(--tf-border)', borderRadius: '20px',
                            padding: '3px 10px', cursor: 'pointer',
                            color: 'var(--tf-text-secondary)', fontSize: '11px', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '5px',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(226,75,74,0.12)';
                            e.currentTarget.style.color = 'var(--tf-red)';
                            e.currentTarget.style.borderColor = 'rgba(226,75,74,0.3)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'var(--tf-surface2)';
                            e.currentTarget.style.color = 'var(--tf-text-secondary)';
                            e.currentTarget.style.borderColor = 'var(--tf-border)';
                        }}
                    >
                        <X size={11} />
                        Clear filters
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}

// Generic inactive "All" pill button
function PillButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: active ? 'var(--tf-accent)' : 'var(--tf-surface2)',
                color: active ? '#fff' : 'var(--tf-text-secondary)',
                outline: active ? '1.5px solid var(--tf-accent)' : '1.5px solid var(--tf-border)',
                boxShadow: active ? '0 0 10px rgba(108,99,255,0.35)' : 'none',
            }}
        >
            {label}
        </motion.button>
    );
}
