import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Trash2, Tag, Settings, Save, AlertTriangle } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { useToastStore } from '../../store/useToastStore';
import { updateBoard, deleteBoard, inviteMember, removeMember, getBoardLabels, createLabel, deleteLabel } from '../../api/tasksApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const LABEL_COLORS = ['#6c63ff', '#43e8a0', '#ff6584', '#ffd166', '#ff9f43', '#00d2ff', '#9b59b6', '#34495e'];

export default function BoardSettingsModal({ onClose }: { onClose: () => void }) {
    const { board, setBoard } = useBoardStore();
    const { addToast } = useToastStore();
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [tab, setTab] = useState<'general' | 'members' | 'labels'>('general');

    // General
    const [name, setName] = useState(board?.name || '');
    const [isDeleting, setIsDeleting] = useState(false);

    // Members
    const [email, setEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');

    // Labels
    const { data: labels, isLoading: labelsLoading } = useQuery({
        queryKey: ['labels', board?.id],
        queryFn: () => getBoardLabels(board!.id),
        enabled: tab === 'labels' && !!board?.id,
    });
    const [newLabelName, setNewLabelName] = useState('');
    const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);

    const handleUpdate = async () => {
        try {
            const updated = await updateBoard(board!.id, { name });
            setBoard(updated);
            addToast('Board renamed successfully', 'success');
        } catch {
            addToast('Failed to update board', 'error');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you absolutely sure? This cannot be undone.')) return;
        try {
            await deleteBoard(board!.id);
            addToast('Board deleted', 'info');
            navigate('/boards');
        } catch {
            addToast('Failed to delete board', 'error');
        }
    };

    const handleInvite = async () => {
        if (!email) return;
        try {
            const updatedBoard = await inviteMember(board!.id, email, inviteRole);
            setBoard(updatedBoard);
            setEmail('');
            addToast('Member invited', 'success');
        } catch {
            addToast('User not found or already a member', 'error');
        }
    };

    const handleRemoveMember = async (userId: number) => {
        try {
            const updatedBoard = await removeMember(board!.id, userId);
            setBoard(updatedBoard);
            addToast('Member removed', 'info');
        } catch {
            addToast('Failed to remove member', 'error');
        }
    };

    const handleCreateLabel = async () => {
        if (!newLabelName) return;
        try {
            await createLabel(board!.id, { name: newLabelName, color: newLabelColor });
            qc.invalidateQueries({ queryKey: ['labels', board?.id] });
            setNewLabelName('');
            addToast('Label created', 'success');
        } catch {
            addToast('Failed to create label', 'error');
        }
    };

    const handleDeleteLabel = async (id: number) => {
        try {
            await deleteLabel(board!.id, id);
            qc.invalidateQueries({ queryKey: ['labels', board?.id] });
            addToast('Label removed', 'info');
        } catch {
            addToast('Failed to delete label', 'error');
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
            
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                style={{ position: 'relative', width: '100%', maxWidth: '600px', background: 'var(--tf-surface)', border: '0.5px solid var(--tf-border)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                
                <div style={{ display: 'flex', borderBottom: '0.5px solid var(--tf-border)' }}>
                    {(['general', 'members', 'labels'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            flex: 1, padding: '16px', fontSize: '13px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
                            color: tab === t ? 'var(--tf-text)' : 'var(--tf-text-secondary)', borderBottom: tab === t ? '2px solid var(--tf-accent)' : 'none',
                            textTransform: 'capitalize', fontFamily: 'var(--font-body)'
                        }}>{t}</button>
                    ))}
                    <button onClick={onClose} style={{ padding: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tf-text-secondary)' }}><X size={18} /></button>
                </div>

                <div style={{ padding: '32px' }}>
                    {tab === 'general' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: 'var(--tf-text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Board Name</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input value={name} onChange={e => setName(e.target.value)} style={{ flex: 1, background: 'var(--tf-surface2)', border: '0.5px solid var(--tf-border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--tf-text)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '14px' }} />
                                    <button onClick={handleUpdate} style={{ background: 'var(--tf-accent)', border: 'none', borderRadius: '8px', padding: '10px 20px', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)' }}><Save size={16} /> Save</button>
                                </div>
                            </div>

                            <div style={{ paddingTop: '24px', borderTop: '0.5px solid var(--tf-border)' }}>
                                <h4 style={{ color: 'var(--tf-red)', fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-heading)', fontWeight: 600 }}><AlertTriangle size={16} /> Danger Zone</h4>
                                <p style={{ fontSize: '13px', color: 'var(--tf-text-secondary)', marginBottom: '16px', fontFamily: 'var(--font-body)' }}>Once you delete a board, there is no going back. Please be certain.</p>
                                <button onClick={handleDelete} style={{ background: 'rgba(226,75,74,0.1)', border: '0.5px solid rgba(226,75,74,0.3)', color: 'var(--tf-red)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Delete Board</button>
                            </div>
                        </div>
                    )}

                    {tab === 'members' && (
                        <div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '32px' }}>
                                <input placeholder='Invite by email...' value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1, background: 'var(--tf-surface2)', border: '0.5px solid var(--tf-border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--tf-text)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '14px' }} />
                                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ background: 'var(--tf-surface2)', border: '0.5px solid var(--tf-border)', borderRadius: '8px', padding: '0 14px', color: 'var(--tf-text)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
                                    <option value='admin'>Admin</option>
                                    <option value='member'>Member</option>
                                    <option value='viewer'>Viewer</option>
                                </select>
                                <button onClick={handleInvite} style={{ background: 'var(--tf-accent)', border: 'none', borderRadius: '8px', padding: '0 20px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontFamily: 'var(--font-body)' }}><UserPlus size={16} /> Invite</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {board?.members?.map((m: any) => (
                                    <div key={m.user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--tf-surface2)', border: '0.5px solid var(--tf-border)', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--tf-surface)', border: '0.5px solid var(--tf-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--tf-text)', backgroundImage: m.user.avatar_url ? `url(${m.user.avatar_url})` : 'none', backgroundSize: 'cover' }}>
                                                {!m.user.avatar_url && (m.user.display_name[0].toUpperCase())}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--tf-text)', fontFamily: 'var(--font-body)' }}>{m.user.display_name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--tf-text-secondary)', fontFamily: 'var(--font-body)' }}>{m.user.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: 'var(--tf-surface)', border: '0.5px solid var(--tf-border)', color: 'var(--tf-text-secondary)', textTransform: 'uppercase', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{m.role}</span>
                                            {m.user.id !== board.owner.id && (
                                                <button onClick={() => handleRemoveMember(m.user.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tf-text-tertiary)', padding: '4px' }} onMouseEnter={e => e.currentTarget.style.color='var(--tf-red)'} onMouseLeave={e => e.currentTarget.style.color='var(--tf-text-tertiary)'}><X size={16} /></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'labels' && (
                        <div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--tf-text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600, fontFamily: 'var(--font-body)', letterSpacing: '0.05em' }}>Label Name</label>
                                    <input placeholder='Label name...' value={newLabelName} onChange={e => setNewLabelName(e.target.value)} style={{ width: '100%', background: 'var(--tf-surface2)', border: '0.5px solid var(--tf-border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--tf-text)', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '14px' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--tf-text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600, fontFamily: 'var(--font-body)', letterSpacing: '0.05em' }}>Label Color</label>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', gap: '6px', padding: '6px', background: 'var(--tf-surface2)', border: '0.5px solid var(--tf-border)', borderRadius: '8px' }}>
                                            {LABEL_COLORS.map(c => (
                                                <button type="button" key={c} onClick={() => setNewLabelColor(c)} style={{ width: '28px', height: '28px', borderRadius: '6px', background: c, border: newLabelColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', transition: 'border-color 0.2s', padding: 0 }} />
                                            ))}
                                        </div>
                                        <button type="button" onClick={handleCreateLabel} style={{ background: 'var(--tf-accent)', border: 'none', borderRadius: '8px', padding: '0 24px', height: '40px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontFamily: 'var(--font-body)' }}><Save size={16} /> Save</button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {labels?.map((l: any) => (
                                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: l.color + '1A', border: '0.5px solid ' + l.color + '33', padding: '8px 14px', borderRadius: '8px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color }} />
                                        <span style={{ fontSize: '13px', color: l.color, fontWeight: 600, fontFamily: 'var(--font-body)' }}>{l.name}</span>
                                        <button onClick={() => handleDeleteLabel(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tf-text-secondary)', display: 'flex', padding: '2px' }}><X size={14} /></button>
                                    </div>
                                ))}
                                {labelsLoading && <div style={{ color: 'var(--tf-text-tertiary)', fontSize: '13px', fontFamily: 'var(--font-body)' }}>Loading labels...</div>}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
