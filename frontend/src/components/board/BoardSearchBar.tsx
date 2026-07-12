import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchTasks } from '../../api/tasksApi';
import { motion, AnimatePresence } from 'framer-motion';

interface BoardSearchBarProps {
    boardId: string;
    onSelectTask: (taskId: string) => void;
}

const PRIORITY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    P0: { bg: 'rgba(226,75,74,0.15)',   color: 'var(--tf-red)', border: 'rgba(226,75,74,0.3)'   },
    P1: { bg: 'rgba(186,117,23,0.15)', color: 'var(--tf-yellow)', border: 'rgba(186,117,23,0.3)' },
    P2: { bg: 'rgba(29,158,117,0.15)',  color: 'var(--tf-green)', border: 'rgba(29,158,117,0.3)'  },
    P3: { bg: 'var(--tf-surface2)', color: 'var(--tf-text-tertiary)',    border: 'var(--tf-border)' },
};

function highlightMatch(text: string, query: string) {
    if (!query || query.length < 2) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
        <span>
            {text.slice(0, idx)}
            <mark style={{ background: 'rgba(108,99,255,0.35)', color: '#fff', borderRadius: '2px', padding: '0 1px' }}>
                {text.slice(idx, idx + query.length)}
            </mark>
            {text.slice(idx + query.length)}
        </span>
    );
}

export default function BoardSearchBar({ boardId, onSelectTask }: BoardSearchBarProps) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // 300ms debounce
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const { data: results, isLoading, isFetching } = useQuery({
        queryKey: ['search', boardId, debouncedQuery],
        queryFn: () => searchTasks(boardId, debouncedQuery),
        enabled: debouncedQuery.length >= 2,
        staleTime: 30_000,
    });

    const searchResults: any[] = Array.isArray(results) ? results : (results?.results || []);

    useEffect(() => {
        setIsOpen(debouncedQuery.length >= 2);
        setFocusedIndex(-1);
    }, [debouncedQuery]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Escape closes
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                setQuery('');
                inputRef.current?.blur();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen || searchResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(i => Math.min(i + 1, searchResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && focusedIndex >= 0) {
            e.preventDefault();
            handleSelect(searchResults[focusedIndex].id);
        }
    }, [isOpen, searchResults, focusedIndex]);

    const handleSelect = (taskId: string) => {
        setIsOpen(false);
        setQuery('');
        setFocusedIndex(-1);
        onSelectTask(taskId);
    };

    const clear = () => {
        setQuery('');
        setIsOpen(false);
        inputRef.current?.focus();
    };

    // Auto-focus the input when it mounts (since it appears when search icon clicked)
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '320px' }}>
            {/* Input Container */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'var(--tf-surface)',
                border: '0.5px solid var(--tf-border)',
                borderRadius: '10px', padding: '0 12px', height: '40px',
                transition: 'all 0.2s',
                boxShadow: isFocused ? '0 0 0 3px rgba(108,99,255,0.15)' : '0 8px 32px rgba(0,0,0,0.4)',
            }}>
                <Search size={14} style={{
                    color: isFocused ? 'var(--tf-accent)' : 'var(--tf-text-tertiary)',
                    minWidth: 14, transition: 'color 0.2s'
                }} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => { setIsFocused(true); if (query.length >= 2) setIsOpen(true); }}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search tasks..."
                    style={{
                        background: 'transparent', border: 'none', color: 'var(--tf-text)',
                        fontSize: '13px', width: '100%', outline: 'none',
                        fontFamily: 'var(--font-body)',
                    }}
                />
                <AnimatePresence>
                    {(isFetching || isLoading) && query.length >= 2 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{
                                width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0,
                                border: '2px solid rgba(108,99,255,0.3)', borderTopColor: 'var(--tf-accent)',
                                animation: 'spin 0.7s linear infinite'
                            }} />
                    )}
                </AnimatePresence>
                {query && (
                    <button onClick={clear} style={{
                        background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
                        color: 'var(--tf-text-tertiary)', padding: 0, flexShrink: 0,
                        transition: 'color 0.2s'
                    }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--tf-text)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--tf-text-tertiary)')}
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        style={{
                            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                            background: 'var(--tf-surface)', border: '0.5px solid var(--tf-border)',
                            borderRadius: '12px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                            zIndex: 200, overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '10px 14px 8px', fontSize: '10px', fontWeight: 600,
                            color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em',
                            borderBottom: '0.5px solid var(--tf-border)',
                        }}>
                            {isLoading ? 'Searching...' : searchResults.length > 0
                                ? `${searchResults.length} result${searchResults.length > 1 ? 's' : ''}`
                                : 'No results'}
                        </div>

                        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                            {searchResults.length === 0 && !isLoading ? (
                                <div style={{
                                    padding: '28px 16px', textAlign: 'center',
                                    color: 'var(--tf-text-secondary)', fontSize: '13px',
                                }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                                    No tasks match <strong style={{ color: 'var(--tf-text)' }}>"{debouncedQuery}"</strong>
                                </div>
                            ) : (
                                searchResults.map((task: any, i: number) => {
                                    const pStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['P3'];
                                    const isFoc = i === focusedIndex;
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => handleSelect(task.id)}
                                            onMouseEnter={() => setFocusedIndex(i)}
                                            style={{
                                                padding: '10px 14px',
                                                borderBottom: '0.5px solid var(--tf-border)',
                                                cursor: 'pointer',
                                                background: isFoc ? 'var(--tf-surface2)' : 'transparent',
                                                transition: 'background 0.15s',
                                                display: 'flex', alignItems: 'center', gap: '12px',
                                            }}
                                        >
                                            {/* Priority dot */}
                                            <div style={{
                                                width: '8px', height: '8px', borderRadius: '50%',
                                                background: pStyle.color, flexShrink: 0,
                                            }} />

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: '13px', fontWeight: 500, color: 'var(--tf-text)',
                                                    lineHeight: '1.4', whiteSpace: 'nowrap',
                                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>
                                                    {highlightMatch(task.title, debouncedQuery)}
                                                </div>
                                                <div style={{
                                                    fontSize: '11px', color: 'var(--tf-text-secondary)',
                                                    marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px',
                                                }}>
                                                    <span>in</span>
                                                    <span style={{
                                                        background: 'var(--tf-surface2)',
                                                        padding: '1px 6px', borderRadius: '4px',
                                                        color: 'var(--tf-text-secondary)', fontSize: '10px', fontWeight: 500,
                                                    }}>
                                                        {task.column_name || 'Board'}
                                                    </span>
                                                    {task.assignees?.slice(0, 2).map((a: any) => (
                                                        <span key={a.id} style={{
                                                            width: '16px', height: '16px', borderRadius: '50%',
                                                            background: 'var(--tf-accent)', display: 'inline-flex',
                                                            alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '9px', fontWeight: 700, color: '#fff',
                                                        }}>
                                                            {(a.display_name || '?')[0].toUpperCase()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Priority badge */}
                                            <span style={{
                                                fontSize: '10px', fontWeight: 700, padding: '2px 7px',
                                                borderRadius: '5px', background: pStyle.bg, color: pStyle.color,
                                                border: `0.5px solid ${pStyle.border}`, flexShrink: 0,
                                            }}>
                                                {task.priority}
                                            </span>

                                            {isFoc && (
                                                <ArrowRight size={12} style={{ color: 'var(--tf-accent)', flexShrink: 0 }} />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {searchResults.length > 0 && (
                            <div style={{
                                padding: '8px 14px', fontSize: '10px', color: 'var(--tf-text-tertiary)',
                                borderTop: '0.5px solid var(--tf-border)',
                                display: 'flex', gap: '12px',
                            }}>
                                <span>↑↓ Navigate</span>
                                <span>↵ Open task</span>
                                <span>Esc Close</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
