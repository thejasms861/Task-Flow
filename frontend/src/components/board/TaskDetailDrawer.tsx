import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Check, CheckSquare, Square, Plus, Tag, UserPlus, Trash2, FileText, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getTaskDetail, patchTask, createSubtask, patchSubtask, uploadTaskGuideline } from '../../api/taskDetailApi';
import { getBoardLabels, deleteTask } from '../../api/tasksApi';
import { useBoardStore } from '../../store/boardStore';

const PRIORITIES = [
    { key: 'P0', label: 'P0', bg: 'rgba(226,75,74,0.15)', color: 'var(--tf-red)', border: 'rgba(226,75,74,0.4)' },
    { key: 'P1', label: 'P1', bg: 'rgba(186,117,23,0.15)', color: 'var(--tf-yellow)', border: 'rgba(186,117,23,0.4)' },
    { key: 'P2', label: 'P2', bg: 'rgba(29,158,117,0.15)', color: 'var(--tf-green)', border: 'rgba(29,158,117,0.4)' },
    { key: 'P3', label: 'P3', bg: 'var(--tf-surface2)', color: 'var(--tf-text-secondary)', border: 'var(--tf-border)' },
];

function useDebounce<T>(value: T, delay: number): T {
    const [dv, setDv] = useState(value);
    useEffect(() => { const t = setTimeout(() => setDv(value), delay); return () => clearTimeout(t); }, [value, delay]);
    return dv;
}

const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

function SaveStatus({ status }: { status: 'idle' | 'saving' | 'saved' }) {
    if (status === 'idle') return null;
    return (
        <span style={{ fontSize: '11px', color: status === 'saved' ? 'var(--tf-green)' : 'var(--tf-text-tertiary)', transition: 'color 0.3s' }}>
            {status === 'saving' ? 'Saving...' : 'Saved ✓'}
        </span>
    );
}

export default function TaskDetailDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
    const qc = useQueryClient();
    const board = useBoardStore(s => s.board);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const { data: task, isLoading } = useQuery({
        queryKey: ['task-detail', taskId],
        queryFn: () => getTaskDetail(taskId!),
        enabled: !!taskId,
    });

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [descDirty, setDescDirty] = useState(false);
    const [priority, setPriority] = useState('P3');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [subtasks, setSubtasks] = useState<any[]>([]);
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [labelIds, setLabelIds] = useState<string[]>([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [showAssignDropdown, setShowAssignDropdown] = useState(false);
    const [showLabelDropdown, setShowLabelDropdown] = useState(false);
    const [isUploadingGuideline, setIsUploadingGuideline] = useState(false);

    const { data: boardLabels } = useQuery({
        queryKey: ['labels', board?.id],
        queryFn: () => getBoardLabels(board!.id),
        enabled: !!board?.id,
    });

    useEffect(() => {
        if (!task) return;
        setTitle(task.title || '');
        setDescription(task.description || '');
        setDescDirty(false);
        setPriority(task.priority || 'P3');
        setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
        setDueTime(task.due_time || '');
        setSubtasks(task.subtasks || []);
        setAssigneeIds((task.assignees || []).map((a: any) => String(a.id)));
        setLabelIds((task.labels || []).map((l: any) => String(l.id)));
    }, [task]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const patch = useMutation({
        mutationFn: (payload: any) => patchTask(taskId!, payload),
        onMutate: () => setSaveStatus('saving'),
        onSuccess: (data) => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
            qc.invalidateQueries({ queryKey: ['tasks'] });
            qc.setQueryData(['task-detail', taskId], data);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteTask(taskId!),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks'] });
            onClose();
        }
    });

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
            deleteMutation.mutate();
        }
    };

    const debouncedTitle = useDebounce(title, 500);
    const debouncedDesc = useDebounce(description, 500);
    const initialised = useRef(false);

    useEffect(() => {
        if (!task || !initialised.current) return;
        if (debouncedTitle !== task.title) patch.mutate({ title: debouncedTitle });
    }, [debouncedTitle]);

    const saveDescription = () => {
        if (!descDirty) return;
        patch.mutate({ description }, {
            onSuccess: () => setDescDirty(false)
        });
    };

    useEffect(() => { if (task) initialised.current = true; }, [task]);

    const handlePriority = (p: string) => { setPriority(p); patch.mutate({ priority: p }); };
    const handleDueDate = (val: string) => { 
        const minDate = getTodayDateString();
        if (val && val < minDate) val = minDate;
        setDueDate(val); 
        patch.mutate({ due_date: val || null }); 
    };
    const handleDueTime = (val: string) => {
        setDueTime(val);
        patch.mutate({ due_time: val || null });
    };

    const toggleSubtask = async (sub: any) => {
        setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, is_done: !s.is_done } : s));
        await patchSubtask(taskId!, sub.id, { is_done: !sub.is_done });
        qc.invalidateQueries({ queryKey: ['task-detail', taskId] });
        qc.invalidateQueries({ queryKey: ['tasks'] });
    };

    const addSubtask = async () => {
        if (!newSubtask.trim()) return;
        const sub = await createSubtask(taskId!, newSubtask.trim());
        setSubtasks(prev => [...prev, sub]);
        setNewSubtask('');
        qc.invalidateQueries({ queryKey: ['task-detail', taskId] });
        qc.invalidateQueries({ queryKey: ['tasks'] });
    };

    const toggleAssignee = (userId: string) => {
        const newIds = assigneeIds.includes(userId) ? assigneeIds.filter(id => id !== userId) : [...assigneeIds, userId];
        setAssigneeIds(newIds);
        patch.mutate({ assignees: newIds });
    };

    const toggleLabel = (labelId: string) => {
        const newIds = labelIds.includes(labelId) ? labelIds.filter(id => id !== labelId) : [...labelIds, labelId];
        setLabelIds(newIds);
        patch.mutate({ labels: newIds });
    };

    const handleUploadGuideline = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (file.type !== 'application/pdf') {
            alert('Only PDF files are allowed');
            return;
        }
        setIsUploadingGuideline(true);
        try {
            await uploadTaskGuideline(taskId!, file);
            qc.invalidateQueries({ queryKey: ['task-detail', taskId] });
            qc.invalidateQueries({ queryKey: ['tasks'] });
        } catch (err) {
            console.error('Failed to upload guideline', err);
            alert('Failed to upload guideline');
        } finally {
            setIsUploadingGuideline(false);
        }
    };

    const doneCt = subtasks.filter(s => s.is_done).length;
    const pct = subtasks.length ? Math.round((doneCt / subtasks.length) * 100) : 0;

    return (
        <AnimatePresence>
            {taskId && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, backdropFilter: 'blur(3px)' }} />

                    <motion.div initial={{ x: 440 }} animate={{ x: 0 }} exit={{ x: 440 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        style={{
                            position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px',
                            background: 'var(--tf-surface)', borderLeft: '1px solid var(--tf-border)',
                            zIndex: 500, display: 'flex', flexDirection: 'column', overflowY: 'auto',
                            boxShadow: '-10px 0 40px rgba(0,0,0,0.5)'
                        }}
                    >
                        {isLoading || !task ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tf-text-tertiary)' }}>Loading...</div>
                        ) : (
                            <>
                                {/* HEADER */}
                                <div style={{ padding: '24px', borderBottom: '1px solid var(--tf-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'flex-start' }}>
                                        <textarea
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            rows={2}
                                            placeholder='Task Title'
                                            style={{
                                                flex: 1, background: 'none', border: 'none', outline: 'none',
                                                color: 'var(--tf-text)', fontFamily: 'var(--font-heading)', fontWeight: 600,
                                                fontSize: '20px', lineHeight: 1.4, resize: 'none', marginRight: '16px',
                                                padding: 0, overflow: 'hidden'
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={handleDelete} title="Delete Task" style={{ background: 'var(--tf-surface2)', border: '1px solid var(--tf-border)', cursor: 'pointer', color: 'var(--tf-red)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Trash2 size={18} />
                                            </button>
                                            <button onClick={onClose} title="Close" style={{ background: 'var(--tf-surface2)', border: '1px solid var(--tf-border)', cursor: 'pointer', color: 'var(--tf-text-secondary)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {PRIORITIES.map(p => (
                                            <button key={p.key} onClick={() => handlePriority(p.key)} style={{
                                                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                                background: priority === p.key ? p.bg : 'var(--tf-surface2)', 
                                                color: priority === p.key ? p.color : 'var(--tf-text-secondary)', 
                                                border: `1px solid ${priority === p.key ? p.border : 'var(--tf-border)'}`,
                                                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-body)'
                                            }}>
                                                {p.label}
                                            </button>
                                        ))}
                                        <SaveStatus status={saveStatus} />
                                    </div>
                                </div>

                                {/* META */}
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', borderBottom: '1px solid var(--tf-border)' }}>
                                    {/* Assignees */}
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Assignees</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            {task.assignees?.map((a: any) => (
                                                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--tf-surface2)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', border: '1px solid var(--tf-border)', color: 'var(--tf-text)' }}>
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--tf-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, backgroundImage: a.avatar_url ? `url(${a.avatar_url})` : 'none', backgroundSize: 'cover' }}>{!a.avatar_url && (a.display_name?.[0]?.toUpperCase() || '?')}</div>
                                                    {a.display_name}
                                                </div>
                                            ))}
                                            <div style={{ position: 'relative' }}>
                                                <button onClick={() => setShowAssignDropdown(!showAssignDropdown)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px dashed var(--tf-border)', background: 'var(--tf-surface2)', color: 'var(--tf-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                                    <UserPlus size={14} />
                                                </button>
                                                <AnimatePresence>
                                                    {showAssignDropdown && (
                                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                                            style={{ position: 'absolute', top: '40px', left: 0, background: 'var(--tf-surface)', border: '1px solid var(--tf-border)', borderRadius: '12px', padding: '8px', zIndex: 100, width: '220px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                                                            {board?.members?.map((m: any) => (
                                                                <div key={m.user.id} onClick={() => toggleAssignee(String(m.user.id))}
                                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', background: assigneeIds.includes(String(m.user.id)) ? 'rgba(108,99,255,0.1)' : 'none', fontSize: '13px', color: 'var(--tf-text)' }}>
                                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--tf-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, backgroundImage: m.user.avatar_url ? `url(${m.user.avatar_url})` : 'none', backgroundSize: 'cover' }}>{!m.user.avatar_url && (m.user.display_name?.[0]?.toUpperCase() || '?')}</div>
                                                                    <span style={{ flex: 1 }}>{m.user.display_name}</span>
                                                                    {assigneeIds.includes(String(m.user.id)) && <Check size={14} color='var(--tf-accent)' />}
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Labels */}
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Labels</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            {task.labels?.map((l: any) => (
                                                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: l.color + '1A', color: l.color, border: '1px solid ' + l.color + '33', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                                                    {l.name}
                                                </div>
                                            ))}
                                            <div style={{ position: 'relative' }}>
                                                <button onClick={() => setShowLabelDropdown(!showLabelDropdown)} style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px dashed var(--tf-border)', background: 'var(--tf-surface2)', color: 'var(--tf-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                                    <Tag size={13} />
                                                </button>
                                                <AnimatePresence>
                                                    {showLabelDropdown && (
                                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                                            style={{ position: 'absolute', top: '40px', left: 0, background: 'var(--tf-surface)', border: '1px solid var(--tf-border)', borderRadius: '12px', padding: '8px', zIndex: 100, width: '200px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                                                            {boardLabels?.map((l: any) => (
                                                                <div key={l.id} onClick={() => toggleLabel(String(l.id))}
                                                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', background: labelIds.includes(String(l.id)) ? 'var(--tf-surface2)' : 'none', fontSize: '13px', color: 'var(--tf-text)' }}>
                                                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: l.color }} />
                                                                    <span style={{ flex: 1 }}>{l.name}</span>
                                                                    {labelIds.includes(String(l.id)) && <Check size={14} color='var(--tf-accent)' />}
                                                                </div>
                                                            ))}
                                                            {(!boardLabels || boardLabels.length === 0) && (
                                                                <div style={{ fontSize: '12px', color: 'var(--tf-text-tertiary)', padding: '4px 8px' }}>No labels found. Add them in board settings.</div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Due Date & Time */}
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Due Date & Time</div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type='date' value={dueDate} min={getTodayDateString()} onChange={e => handleDueDate(e.target.value)}
                                                style={{ flex: 1, background: 'var(--tf-surface2)', border: '1px solid var(--tf-border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--tf-text)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '13px' }} />
                                            <input type='time' value={dueTime} onChange={e => handleDueTime(e.target.value)}
                                                style={{ flex: 1, background: 'var(--tf-surface2)', border: '1px solid var(--tf-border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--tf-text)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '13px' }} />
                                        </div>
                                    </div>

                                    {/* Guideline PDF */}
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Guideline</div>
                                        {task.attachment ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <a href={task.attachment} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--tf-accent)', textDecoration: 'none', fontSize: '13px', fontWeight: 500, background: 'rgba(108,99,255,0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(108,99,255,0.2)' }}>
                                                    <FileText size={16} /> View Guideline PDF
                                                </a>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--tf-text-secondary)', cursor: 'pointer', background: 'var(--tf-surface2)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--tf-border)' }}>
                                                    <Upload size={14} /> Update
                                                    <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleUploadGuideline} disabled={isUploadingGuideline} />
                                                </label>
                                            </div>
                                        ) : (
                                            <div>
                                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--tf-surface2)', border: '1px dashed var(--tf-border)', padding: '8px 14px', borderRadius: '8px', color: 'var(--tf-text-secondary)', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                    <Upload size={16} /> {isUploadingGuideline ? 'Uploading...' : 'Attach PDF Guideline'}
                                                    <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleUploadGuideline} disabled={isUploadingGuideline} />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* DESCRIPTION */}
                                <div style={{ padding: '24px', borderBottom: '1px solid var(--tf-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Description</div>
                                        {descDirty && (
                                            <button onClick={saveDescription} style={{
                                                background: 'var(--tf-accent)', border: 'none', borderRadius: '6px',
                                                padding: '6px 14px', color: '#fff', fontSize: '12px', fontWeight: 600,
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                            }}>
                                                <Check size={14} /> Save
                                            </button>
                                        )}
                                    </div>
                                    <textarea
                                        value={description}
                                        onChange={e => { setDescription(e.target.value); setDescDirty(true); }}
                                        placeholder='Add a description (markdown supported)...'
                                        rows={6}
                                        style={{
                                            width: '100%', background: 'var(--tf-surface2)', border: `1px solid ${descDirty ? 'var(--tf-accent)' : 'var(--tf-border)'}`,
                                            borderRadius: '8px', padding: '14px', color: 'var(--tf-text)',
                                            fontSize: '13px', fontFamily: 'monospace', lineHeight: 1.6, resize: 'vertical', outline: 'none',
                                            transition: 'border-color 0.2s'
                                        }}
                                    />
                                </div>

                                {/* SUBTASKS */}
                                <div style={{ padding: '24px', borderBottom: '1px solid var(--tf-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Subtasks</div>
                                        <span style={{ fontSize: '12px', color: 'var(--tf-green)', fontWeight: 600 }}>{pct}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--tf-surface2)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px', border: '1px solid var(--tf-border)' }}>
                                        <motion.div animate={{ width: `${pct}%` }} style={{ height: '100%', background: 'var(--tf-green)' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                        {subtasks.map(s => (
                                            <div key={s.id} onClick={() => toggleSubtask(s)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', background: 'var(--tf-surface2)', border: '1px solid var(--tf-border)', cursor: 'pointer', transition: 'background 0.2s' }}>
                                                <div style={{ color: s.is_done ? 'var(--tf-green)' : 'var(--tf-text-tertiary)' }}>{s.is_done ? <CheckSquare size={16} /> : <Square size={16} />}</div>
                                                <span style={{ fontSize: '13px', textDecoration: s.is_done ? 'line-through' : 'none', color: s.is_done ? 'var(--tf-text-tertiary)' : 'var(--tf-text)' }}>{s.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubtask()}
                                            placeholder='+ Add subtask' style={{ flex: 1, background: 'var(--tf-surface2)', border: '1px solid var(--tf-border)', borderRadius: '8px', outline: 'none', color: 'var(--tf-text)', fontSize: '13px', padding: '10px 14px' }} />
                                        {newSubtask && <button onClick={addSubtask} style={{ background: 'var(--tf-accent)', border: 'none', borderRadius: '8px', padding: '0 14px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}><Plus size={16} /></button>}
                                    </div>
                                </div>

                                {/* ACTIVITY */}
                                <div style={{ padding: '24px', flex: 1 }}>
                                    <div style={{ fontSize: '11px', color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Activity</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {task.activities?.map((a: any) => (
                                            <div key={a.id} style={{ display: 'flex', gap: '14px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--tf-surface2)', border: '1px solid var(--tf-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0, color: 'var(--tf-text)' }}>{a.actor?.display_name?.[0]?.toUpperCase() || '?'}</div>
                                                <div>
                                                    <div style={{ fontSize: '13px', color: 'var(--tf-text-secondary)', lineHeight: 1.5 }}>
                                                        <strong style={{ color: 'var(--tf-text)', fontWeight: 600 }}>{a.actor?.display_name || 'Someone'}</strong>
                                                        {' '}{a.verb}
                                                        {(a.detail_display || a.detail?.to_column_name) && (
                                                            <span> to{' '}
                                                                <span style={{
                                                                    background: 'rgba(108,99,255,0.1)',
                                                                    color: 'var(--tf-accent)',
                                                                    padding: '2px 6px', borderRadius: '4px',
                                                                    border: '1px solid rgba(108,99,255,0.2)',
                                                                    fontSize: '12px', fontWeight: 500
                                                                }}>
                                                                    {a.detail_display || a.detail?.to_column_name}
                                                                </span>
                                                            </span>
                                                        )}
                                                        {a.detail?.from_column_name && (
                                                            <span style={{ color: 'var(--tf-text-tertiary)', fontSize: '12px' }}>
                                                                {' '}from{' '}
                                                                <span style={{
                                                                    background: 'var(--tf-surface2)',
                                                                    padding: '2px 6px', borderRadius: '4px',
                                                                    color: 'var(--tf-text-secondary)',
                                                                }}>
                                                                    {a.detail.from_column_name}
                                                                </span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--tf-text-tertiary)', marginTop: '4px' }}>
                                                        {a.created_at && !isNaN(new Date(a.created_at).getTime())
                                                            ? formatDistanceToNow(new Date(a.created_at)) + ' ago'
                                                            : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
