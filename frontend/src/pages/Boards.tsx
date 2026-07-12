import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Layout, Clock, ClipboardList } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import apiClient from '../api/axios';
import Navbar from '../components/ui/Navbar';

interface Board {
    id: string;
    name: string;
    task_count: number;
    updated_at: string;
    color?: string;
}

const ACCENTS = ['var(--tf-accent)', 'var(--tf-green)', 'var(--tf-red)', 'var(--tf-yellow)', 'var(--tf-pink)', 'var(--tf-blue)'];

export default function Boards() {
    const navigate = useNavigate();
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchBoards();
    }, []);

    const fetchBoards = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/boards/');
            setBoards(res.data.data || []);
        } catch (err: any) {
            if (err.response?.status === 401) {
                navigate('/login');
            }
            console.error('Failed to fetch boards:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBoard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBoardName.trim()) return;
        setCreating(true);
        setError('');
        try {
            const res = await apiClient.post('/boards/', { name: newBoardName.trim() });
            const newBoard = res.data.data;
            setBoards([newBoard, ...boards]);
            setNewBoardName('');
            setIsModalOpen(false);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create board');
        } finally {
            setCreating(false);
        }
    };

    const SkeletonCard = () => (
        <div style={{ 
            background: 'var(--tf-surface)', borderRadius: '12px', height: '100px', 
            border: '0.5px solid var(--tf-border)', position: 'relative', overflow: 'hidden' 
        }}>
            <div className="shimmer" style={{ 
                position: 'absolute', inset: 0, 
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                animation: 'shimmer 1.5s infinite'
            }} />
        </div>
    );

    return (
        <div style={{ 
            minHeight: '100vh', background: 'var(--tf-bg)',
            backgroundImage: `radial-gradient(circle at 80% 20%, rgba(108, 99, 255, 0.08), transparent 50%),
                              radial-gradient(circle at 20% 80%, rgba(29, 158, 117, 0.05), transparent 50%)`
        }}>
            <Navbar />

            <div style={{ padding: '28px 28px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '22px', color: 'var(--tf-text)', marginBottom: '4px' }}>
                        My boards
                    </h1>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--tf-text-secondary)' }}>
                        Manage your team's work
                    </p>
                </div>
                <button onClick={() => setIsModalOpen(true)} style={{ 
                    height: '32px', background: 'var(--tf-accent)', color: '#fff', 
                    fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '12px', 
                    borderRadius: '8px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                    <Plus size={14} /> New board
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '0 28px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            ) : boards.length > 0 ? (
                <div style={{ padding: '0 28px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    {boards.map((board, idx) => (
                        <motion.div 
                            key={board.id}
                            whileHover={{ y: -2 }}
                            onClick={() => navigate(`/board/${board.id}`)}
                            style={{ 
                                background: 'var(--tf-surface)', border: '0.5px solid var(--tf-border)', borderRadius: '12px',
                                cursor: 'pointer', overflow: 'hidden', position: 'relative'
                            }}
                            onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--tf-border-hover)')}
                            onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--tf-border)')}
                        >
                            <div style={{ height: '4px', width: '100%', background: ACCENTS[idx % ACCENTS.length] }} />
                            <div style={{ padding: '14px' }}>
                                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '14px', color: 'var(--tf-text)', marginBottom: '8px' }}>
                                    {board.name}
                                </h3>
                                <div style={{ fontSize: '11px', color: 'var(--tf-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                    <Layout size={12} /> {board.task_count || 0} tasks
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--tf-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                    <Clock size={12} /> Updated {formatDistanceToNow(new Date(board.updated_at))} ago
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                    <ClipboardList size={40} color="var(--tf-text-tertiary)" style={{ marginBottom: '16px' }} />
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '16px', marginBottom: '8px' }}>No boards yet</h2>
                    <p style={{ fontSize: '13px', color: 'var(--tf-text-secondary)', marginBottom: '20px' }}>Create your first board to get started</p>
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                        + Create board
                    </button>
                </div>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} 
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            style={{ 
                                position: 'relative', width: '400px', background: 'var(--tf-surface)', 
                                padding: '24px', borderRadius: '14px', border: '0.5px solid var(--tf-border)'
                            }}
                        >
                            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '16px', marginBottom: '20px' }}>New board</h2>
                            <form onSubmit={handleCreateBoard}>
                                <div style={{ marginBottom: '20px' }}>
                                    <input 
                                        autoFocus required maxLength={100}
                                        value={newBoardName} onChange={e => setNewBoardName(e.target.value)}
                                        placeholder="Board name..."
                                        style={{ width: '100%', height: '36px' }}
                                    />
                                </div>
                                {error && <div style={{ color: 'var(--tf-red)', fontSize: '12px', marginBottom: '16px' }}>{error}</div>}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" className="btn-ghost" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary" disabled={creating} style={{ flex: 1 }}>
                                        {creating ? 'Creating...' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
