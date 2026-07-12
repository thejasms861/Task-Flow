import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Layers, Settings, Activity, BarChart2, Calendar, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useBoardStore } from '../store/boardStore';
import { useAuthStore } from '../store/useAuthStore';
import { useBoardSocket } from '../hooks/useBoardSocket';
import { getBoardDetail, getBoardTasks, createTask, moveTask } from '../api/tasksApi';
import BoardColumn from '../components/board/BoardColumn';
import TaskCard from '../components/board/TaskCard';
import TaskDetailDrawer from '../components/board/TaskDetailDrawer';
import BoardSettingsModal from '../components/board/BoardSettingsModal';
import ShareModal from '../components/board/ShareModal';
import { BoardSkeleton } from '../components/ui/Skeleton';
import BoardSearchBar from '../components/board/BoardSearchBar';
import BoardFilterBar from '../components/board/BoardFilterBar';
import Navbar from '../components/ui/Navbar';

export type BoardFilters = { priority?: string; due?: string; assignee?: string };

/**
 * Client-side filter: returns true if the task matches the active filters.
 * Executed locally so the board shows all tasks – non-matching ones are faded.
 */
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

export default function Board() {
    const { id: boardId } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { accessToken } = useAuthStore();
    const {
        board, columns, tasksByColumn, setBoard, setColumns, setTasks,
        moveTaskOptimistic, revertMove, addTask
    } = useBoardStore();

    const [activeTask, setActiveTask] = useState<any>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [filters, setFilters] = useState<BoardFilters>({});

    const hasActiveFilters = !!(filters.priority || filters.due || filters.assignee);

    useBoardSocket(boardId, accessToken);

    const { data: boardData, isLoading: boardLoading } = useQuery({
        queryKey: ['board', boardId],
        queryFn: () => getBoardDetail(boardId || ''),
        enabled: !!boardId,
    });

    // Always fetch all tasks – filtering is done client-side for the fade effect
    const { data: tasksData, isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks', boardId],
        queryFn: () => getBoardTasks(boardId || ''),
        enabled: !!boardId,
    });

    useEffect(() => {
        if (boardData) {
            setBoard(boardData);
            setColumns(boardData.columns || []);
        }
    }, [boardData, setBoard, setColumns]);

    useEffect(() => {
        if (tasksData) {
            const taskList = Array.isArray(tasksData) ? tasksData : (tasksData.results || []);
            const grouped = taskList.reduce((acc: Record<string, any[]>, task: any) => {
                const colId = String(task.column);
                if (!acc[colId]) acc[colId] = [];
                acc[colId].push(task);
                return acc;
            }, {});
            setTasks(grouped);
        }
    }, [tasksData, setTasks]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowSettings(false);
                setSelectedTaskId(null);
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, []);

    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 5 },
    }));

    const onDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const allTasks = Object.values(tasksByColumn).flat();
        const found = allTasks.find(t => String(t.id) === String(active.id));
        setActiveTask(found);
    }, [tasksByColumn]);

    const onDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);
        if (!over) return;

        const taskId = String(active.id);
        const overId = String(over.id);
        if (taskId === overId) return;

        const allTasks = Object.values(tasksByColumn).flat();

        let targetColumnId = overId;
        const overTask = allTasks.find(t => String(t.id) === overId);
        if (overTask) targetColumnId = String(overTask.column);

        const sourceTask = allTasks.find(t => String(t.id) === taskId);
        if (!sourceTask) return;
        const sourceColumnId = String(sourceTask.column);

        const tasksInTargetCol = (tasksByColumn as Record<string, any[]>)[targetColumnId] || [];
        let newIndex = tasksInTargetCol.findIndex(t => String(t.id) === overId);
        if (newIndex === -1) newIndex = tasksInTargetCol.length;

        if (sourceColumnId === targetColumnId) {
            const currentIndex = tasksInTargetCol.findIndex(t => String(t.id) === taskId);
            if (currentIndex === newIndex) return;
        }

        const snapshot = { ...tasksByColumn };
        moveTaskOptimistic(taskId, sourceColumnId, targetColumnId, newIndex);

        try {
            await moveTask(taskId, targetColumnId, newIndex);
        } catch (err) {
            revertMove(snapshot);
            console.error('Failed to move task', err);
        }
    }, [tasksByColumn, moveTaskOptimistic, revertMove]);

    const handleAddTask = useCallback(async (colId: string, title: string) => {
        if (!boardId) return;

        // 1. Create a temporary optimistic task so the UI updates instantly
        const tempId = `temp-${crypto.randomUUID()}`;
        const optimisticTask = {
            id: tempId,
            title,
            column: colId,
            priority: 'P2',
            assignees: [],
            labels: [],
            subtask_count: 0,
            subtask_done_count: 0,
        };
        
        // Instantly add to local state
        addTask(optimisticTask);

        try {
            // 2. Perform the actual API call
            await createTask(boardId, { title, column: colId });
            
            // 3. Force React Query to sync the real ID from the server
            queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
        } catch (err) {
            console.error('Failed to add task', err);
            // Optionally, we could remove the optimistic task here if it failed
            queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
        }
    }, [boardId, addTask, queryClient]);

    const handleFilterChange = useCallback((key: keyof BoardFilters, value: string | undefined) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const sortedCols = useMemo(
        () => [...(columns || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
        [columns]
    );

    if (boardLoading && !board) return <BoardSkeleton />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--tf-bg)' }}>
            <Navbar 
                boardName={board?.name}
                boardId={boardId}
                boardMembers={board?.members}
                shareEnabled={board?.share_enabled}
                onSearchClick={() => setIsSearchOpen(!isSearchOpen)}
                onSettingsClick={() => setShowSettings(true)}
                onShareClick={() => setShowShare(true)}
            />

            <AnimatePresence>
                {isSearchOpen && boardId && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{ position: 'absolute', top: '56px', right: '180px', zIndex: 110 }}
                    >
                        <BoardSearchBar boardId={boardId} onSelectTask={(id) => { setSelectedTaskId(id); setIsSearchOpen(false); }} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Board Body ──────────────────────────────────────── */}
            <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '0', display: 'flex', flexDirection: 'column' }}>

                {/* ── Filter bar ── */}
                <BoardFilterBar
                    board={board}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={() => setFilters({})}
                />

                {/* ── Active filter indicator ── */}
                <AnimatePresence>
                    {hasActiveFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                margin: '0 2rem 0.75rem',
                                padding: '6px 12px',
                                background: 'var(--accent-glow)',
                                border: '1px solid var(--accent)',
                                borderRadius: '8px',
                                fontSize: '12px', color: 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}
                        >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--tf-accent)', display: 'inline-block' }} />
                            Filters active — non-matching tasks are dimmed on the board
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={{ padding: '0 28px 14px', flex: 1, minHeight: 0 }}>
                    {tasksLoading && Object.keys(tasksByColumn).length === 0 ? <BoardSkeleton /> : (
                        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                            <div id="board-container" style={{ display: 'flex', gap: '16px', height: '100%', alignItems: 'flex-start', paddingBottom: '14px', overflowX: 'auto' }}>
                                {sortedCols.map((col: any) => (
                                    <motion.div key={col.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="board-column" style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: '320px', flex: 1, flexShrink: 0 }}>
                                        <BoardColumn
                                            column={col}
                                            tasks={(tasksByColumn as Record<string, any[]>)[String(col.id)] || []}
                                            boardId={boardId}
                                            onTaskClick={(t: any) => setSelectedTaskId(String(t.id))}
                                            onAddTask={handleAddTask}
                                            filters={filters}
                                            hasActiveFilters={hasActiveFilters}
                                        />
                                    </motion.div>
                                ))}
                            </div>

                            <DragOverlay>
                                {activeTask && (
                                    <div style={{ width: '300px' }}>
                                        <TaskCard task={activeTask} onClick={() => {}} isDragOverlay />
                                    </div>
                                )}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showSettings && <BoardSettingsModal onClose={() => setShowSettings(false)} />}
                {showShare && board && <ShareModal board={board} onClose={() => setShowShare(false)} />}
                {selectedTaskId && <TaskDetailDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
            </AnimatePresence>
        </div>
    );
}
