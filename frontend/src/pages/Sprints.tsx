import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, CheckCircle, Play, Check } from 'lucide-react';
import { getBoardDetail, getBoardTasks, assignTaskToSprint } from '../api/tasksApi';
import { getBoardSprints, createSprint, startSprint, completeSprint } from '../api/sprintsApi';
import { BoardSkeleton } from '../components/ui/Skeleton';
import Navbar from '../components/ui/Navbar';
import { useToastStore } from '../store/useToastStore';

const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export default function Sprints() {
    const { id: boardId } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { addToast } = useToastStore();

    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newSprint, setNewSprint] = useState({ name: '', goal: '', start_date: '', end_date: '' });

    const { data: boardData, isLoading: boardLoading } = useQuery({
        queryKey: ['board', boardId],
        queryFn: () => getBoardDetail(boardId || ''),
        enabled: !!boardId,
    });

    const { data: sprintsData, isLoading: sprintsLoading } = useQuery({
        queryKey: ['sprints', boardId],
        queryFn: () => getBoardSprints(boardId || ''),
        enabled: !!boardId,
    });

    const { data: tasksData, isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks', boardId],
        queryFn: () => getBoardTasks(boardId || ''),
        enabled: !!boardId,
    });

    const sprints = Array.isArray(sprintsData) ? sprintsData : (sprintsData?.results || []);
    const tasks = Array.isArray(tasksData) ? tasksData : (tasksData?.results || []);

    const selectedSprint = sprints.find((s: any) => s.id === selectedSprintId);
    const sprintTasks = tasks.filter((t: any) => t.sprint === selectedSprintId);
    const doneColumnIds = (boardData?.columns || [])
        .filter((c: any) => c.name.toLowerCase() === 'done')
        .map((c: any) => c.id);

    const backlogTasks = tasks.filter((t: any) => !t.sprint && !doneColumnIds.includes(t.column));

    const createMutation = useMutation({
        mutationFn: (data: any) => createSprint(boardId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sprints', boardId] });
            setShowNewModal(false);
            setNewSprint({ name: '', goal: '', start_date: '', end_date: '' });
            addToast('Sprint created successfully', 'success');
        },
        onError: () => addToast('Failed to create sprint', 'error')
    });

    const startMutation = useMutation({
        mutationFn: (sprintId: string) => startSprint(boardId!, sprintId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sprints', boardId] });
            addToast('Sprint started', 'success');
        }
    });

    const completeMutation = useMutation({
        mutationFn: (sprintId: string) => completeSprint(boardId!, sprintId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sprints', boardId] });
            addToast('Sprint completed', 'success');
        }
    });

    const assignMutation = useMutation({
        mutationFn: ({ taskId, sprintId }: { taskId: string, sprintId: string | null }) => assignTaskToSprint(taskId, sprintId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
        }
    });

    const handleCreateSprint = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(newSprint);
    };

    if (boardLoading || sprintsLoading || tasksLoading) return <BoardSkeleton />;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--tf-bg)' }}>
            <Navbar 
                boardName={boardData?.name} 
                pageName="Sprints" 
                boardId={boardId} 
                boardMembers={boardData?.members} 
                shareEnabled={!!boardData?.share_token} 
            />

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Sidebar */}
                <div style={{ width: '280px', borderRight: '0.5px solid var(--tf-border)', display: 'flex', flexDirection: 'column', background: 'var(--tf-surface)' }}>
                    <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--tf-text)' }}>Sprints</h3>
                        <button onClick={() => setShowNewModal(true)} style={{ background: 'var(--tf-surface2)', border: '0.5px solid var(--tf-border)', color: 'var(--tf-text-secondary)', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                            <Plus size={16} />
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
                        {sprints.map((sprint: any) => {
                            const isSelected = selectedSprintId === sprint.id;
                            const statusColor = sprint.status === 'planning' ? 'var(--tf-text-tertiary)' : sprint.status === 'active' ? 'var(--tf-green)' : 'var(--tf-accent)';
                            return (
                                <div key={sprint.id} onClick={() => setSelectedSprintId(sprint.id)} style={{
                                    padding: '14px', borderRadius: '10px', cursor: 'pointer',
                                    background: isSelected ? 'var(--tf-surface2)' : 'transparent',
                                    border: `0.5px solid ${isSelected ? 'var(--tf-border)' : 'transparent'}`,
                                    marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', color: isSelected ? 'var(--tf-text)' : 'var(--tf-text-secondary)' }}>{sprint.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }} />
                                        <span style={{ fontSize: '12px', color: 'var(--tf-text-tertiary)', textTransform: 'capitalize', fontFamily: 'var(--font-body)', fontWeight: 500 }}>{sprint.status}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {sprints.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--tf-text-tertiary)', fontSize: '13px', marginTop: '20px', fontFamily: 'var(--font-body)' }}>No sprints yet</div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '32px' }}>
                    {selectedSprint ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                            {/* Sprint Header */}
                            <div style={{ background: 'var(--tf-surface)', border: '0.5px solid var(--tf-border)', borderRadius: '12px', padding: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <h2 style={{ fontSize: '24px', marginBottom: '12px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--tf-text)' }}>{selectedSprint.name}</h2>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: 'var(--tf-text-secondary)', fontSize: '13px', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={15} /> {selectedSprint.start_date} - {selectedSprint.end_date}
                                            </span>
                                            <span style={{ textTransform: 'capitalize', color: selectedSprint.status === 'planning' ? 'var(--tf-text-secondary)' : selectedSprint.status === 'active' ? 'var(--tf-green)' : 'var(--tf-accent)' }}>
                                                • {selectedSprint.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        {selectedSprint.status === 'planning' && (
                                            <button onClick={() => startMutation.mutate(selectedSprint.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--tf-accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                                                <Play size={16} /> Start Sprint
                                            </button>
                                        )}
                                        {selectedSprint.status === 'active' && (
                                            <button onClick={() => completeMutation.mutate(selectedSprint.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--tf-green)', color: '#111', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                                                <Check size={16} /> Complete Sprint
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {selectedSprint.goal && (
                                    <p style={{ color: 'var(--tf-text-secondary)', fontSize: '14px', lineHeight: '1.6', fontFamily: 'var(--font-body)' }}>
                                        <strong style={{ color: 'var(--tf-text)' }}>Goal:</strong> {selectedSprint.goal}
                                    </p>
                                )}
                            </div>

                            {/* Sprint Tasks */}
                            <div>
                                <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--tf-text)' }}>
                                    Sprint Backlog <span style={{ background: 'var(--tf-surface2)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', color: 'var(--tf-text-secondary)' }}>{sprintTasks.length}</span>
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {sprintTasks.map((task: any) => (
                                        <div key={task.id} style={{ background: 'var(--tf-surface)', padding: '14px 20px', borderRadius: '10px', border: '0.5px solid var(--tf-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--tf-text)' }}>{task.title}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', background: 'var(--tf-surface2)', color: 'var(--tf-text-secondary)', fontWeight: 600 }}>{task.priority}</span>
                                                <button onClick={() => assignMutation.mutate({ taskId: task.id, sprintId: null })} style={{ background: 'none', border: 'none', color: 'var(--tf-red)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Remove</button>
                                            </div>
                                        </div>
                                    ))}
                                    {sprintTasks.length === 0 && <p style={{ color: 'var(--tf-text-tertiary)', fontSize: '14px', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>No tasks assigned to this sprint yet.</p>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--tf-text-tertiary)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                            Select a sprint from the sidebar to view details
                        </div>
                    )}

                    {/* General Backlog */}
                    <div style={{ maxWidth: '800px', margin: '48px auto 0', width: '100%', borderTop: '0.5px solid var(--tf-border)', paddingTop: '32px' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--tf-text)' }}>
                            Project Backlog <span style={{ background: 'var(--tf-surface2)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', color: 'var(--tf-text-secondary)' }}>{backlogTasks.length}</span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {backlogTasks.map((task: any) => (
                                <div key={task.id} style={{ background: 'var(--tf-surface)', padding: '14px 20px', borderRadius: '10px', border: '0.5px solid var(--tf-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--tf-text)' }}>{task.title}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', background: 'var(--tf-surface2)', color: 'var(--tf-text-secondary)', fontWeight: 600 }}>{task.priority}</span>
                                        {selectedSprintId && (
                                            <button onClick={() => assignMutation.mutate({ taskId: task.id, sprintId: selectedSprintId })} style={{ background: 'none', border: 'none', color: 'var(--tf-accent)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                                                + Add to Sprint
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {backlogTasks.length === 0 && <p style={{ color: 'var(--tf-text-tertiary)', fontSize: '14px', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>Backlog is empty.</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* New Sprint Modal */}
            {showNewModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ width: '440px', padding: '32px', background: 'var(--tf-surface)', borderRadius: '16px', border: '0.5px solid var(--tf-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <h3 style={{ marginBottom: '24px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '20px', color: 'var(--tf-text)' }}>New Sprint</h3>
                        <form onSubmit={handleCreateSprint}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--tf-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
                                <input required value={newSprint.name} onChange={e => setNewSprint({ ...newSprint, name: e.target.value })} placeholder="Sprint 1" 
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid var(--tf-border)', background: 'var(--tf-surface2)', color: 'var(--tf-text)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '14px' }} />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--tf-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Goal</label>
                                <textarea value={newSprint.goal} onChange={e => setNewSprint({ ...newSprint, goal: e.target.value })} rows={3} 
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid var(--tf-border)', background: 'var(--tf-surface2)', color: 'var(--tf-text)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--tf-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</label>
                                    <input type="date" required value={newSprint.start_date} min={getTodayDateString()} onChange={e => {
                                        let val = e.target.value;
                                        const minDate = getTodayDateString();
                                        if (val && val < minDate) val = minDate;
                                        setNewSprint({ ...newSprint, start_date: val });
                                    }} 
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid var(--tf-border)', background: 'var(--tf-surface2)', color: 'var(--tf-text)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '14px' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--tf-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Date</label>
                                    <input type="date" required value={newSprint.end_date} min={newSprint.start_date || getTodayDateString()} onChange={e => {
                                        let val = e.target.value;
                                        const minDate = newSprint.start_date || getTodayDateString();
                                        if (val && val < minDate) val = minDate;
                                        setNewSprint({ ...newSprint, end_date: val });
                                    }} 
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid var(--tf-border)', background: 'var(--tf-surface2)', color: 'var(--tf-text)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '14px' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => setShowNewModal(false)} style={{ background: 'transparent', border: '0.5px solid var(--tf-border)', borderRadius: '8px', padding: '10px 20px', color: 'var(--tf-text)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
                                <button type="submit" disabled={createMutation.isPending} style={{ background: 'var(--tf-accent)', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Create Sprint</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
