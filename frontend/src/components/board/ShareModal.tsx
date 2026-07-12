import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Copy, Check, Globe, EyeOff, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { enableShare, disableShare } from '../../api/tasksApi';

interface ShareModalProps {
    board: any;
    onClose: () => void;
}

export default function ShareModal({ board, onClose }: ShareModalProps) {
    const qc = useQueryClient();
    const [shareEnabled, setShareEnabled] = useState<boolean>(board?.share_enabled ?? false);
    const [shareUrl, setShareUrl] = useState<string>(
        board?.share_token ? `${window.location.origin}/share/${board.share_token}` : ''
    );
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close on Escape
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    const enableMut = useMutation({
        mutationFn: () => enableShare(board.id),
        onSuccess: (data) => {
            setShareEnabled(true);
            const url = `${window.location.origin}/share/${data.board.share_token}`;
            setShareUrl(url);
            qc.invalidateQueries({ queryKey: ['board', board.id] });
        },
    });

    const disableMut = useMutation({
        mutationFn: () => disableShare(board.id),
        onSuccess: () => {
            setShareEnabled(false);
            setShareUrl('');
            qc.invalidateQueries({ queryKey: ['board', board.id] });
        },
    });

    const isLoading = enableMut.isPending || disableMut.isPending;

    const handleToggle = () => {
        if (shareEnabled) {
            disableMut.mutate();
        } else {
            enableMut.mutate();
        }
    };

    const copyLink = async () => {
        if (!shareUrl) return;
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 60,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 16 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'var(--tf-surface)',
                        border: '0.5px solid var(--tf-border)',
                        borderRadius: '18px',
                        width: '460px',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '22px 24px 18px',
                        borderBottom: '0.5px solid var(--tf-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '34px', height: '34px', borderRadius: '10px',
                                background: 'rgba(123,104,238,0.15)',
                                border: '0.5px solid rgba(123,104,238,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Globe size={16} color="var(--tf-accent)" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '15px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--tf-text)' }}>
                                    Share Board
                                </h3>
                                <p style={{ fontSize: '11px', color: 'var(--tf-text-secondary)', marginTop: '1px', fontFamily: 'var(--font-body)' }}>
                                    {board?.name}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'var(--tf-surface2)', border: 'none',
                                borderRadius: '8px', width: '30px', height: '30px',
                                cursor: 'pointer', color: 'var(--tf-text-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s', padding: 0
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--tf-text)'; e.currentTarget.style.background = 'var(--tf-border)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--tf-text-secondary)'; e.currentTarget.style.background = 'var(--tf-surface2)'; }}
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '24px' }}>
                        {/* Toggle row */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'var(--tf-surface2)',
                            border: '0.5px solid var(--tf-border)',
                            borderRadius: '12px', padding: '14px 16px',
                            marginBottom: '20px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: shareEnabled ? 'rgba(45, 212, 191, 0.1)' : 'var(--tf-surface)',
                                    border: `0.5px solid ${shareEnabled ? 'rgba(45, 212, 191, 0.25)' : 'var(--tf-border)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.3s',
                                }}>
                                    {shareEnabled
                                        ? <Globe size={16} color="var(--tf-green)" />
                                        : <EyeOff size={16} color="var(--tf-text-secondary)" />
                                    }
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-body)', color: 'var(--tf-text)' }}>
                                        Enable public link
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--tf-text-secondary)', marginTop: '2px', fontFamily: 'var(--font-body)' }}>
                                        {shareEnabled ? 'Link is active' : 'Anyone with the link can view'}
                                    </div>
                                </div>
                            </div>

                            {/* Toggle switch */}
                            <button
                                onClick={handleToggle}
                                disabled={isLoading}
                                style={{
                                    width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                                    background: shareEnabled ? 'var(--tf-green)' : 'var(--tf-border)',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    position: 'relative', transition: 'background 0.3s',
                                    flexShrink: 0,
                                }}
                            >
                                {isLoading ? (
                                    <Loader2 size={12} color="#fff" style={{
                                        position: 'absolute', top: '50%', left: '50%',
                                        transform: 'translate(-50%,-50%)',
                                        animation: 'spin 0.7s linear infinite',
                                    }} />
                                ) : (
                                    <motion.div
                                        animate={{ x: shareEnabled ? 22 : 2 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        style={{
                                            position: 'absolute', top: '3px', left: 0,
                                            width: '18px', height: '18px', borderRadius: '50%',
                                            background: '#fff',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                        }}
                                    />
                                )}
                            </button>
                        </div>

                        {/* Link area */}
                        <AnimatePresence>
                            {shareEnabled && shareUrl && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{ overflow: 'hidden', marginBottom: '20px' }}
                                >
                                    <div style={{ marginBottom: '8px' }}>
                                        <label style={{
                                            fontSize: '11px', fontWeight: 600,
                                            color: 'var(--tf-text-secondary)',
                                            textTransform: 'uppercase', letterSpacing: '0.07em',
                                            fontFamily: 'var(--font-body)'
                                        }}>
                                            Share URL
                                        </label>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{
                                            flex: 1, display: 'flex', alignItems: 'center',
                                            background: 'var(--tf-surface2)',
                                            border: '0.5px solid var(--tf-border)',
                                            borderRadius: '10px', padding: '0 12px',
                                            gap: '8px',
                                        }}>
                                            <Link2 size={13} color="var(--tf-text-secondary)" style={{ flexShrink: 0 }} />
                                            <input
                                                ref={inputRef}
                                                readOnly
                                                value={shareUrl}
                                                onClick={() => inputRef.current?.select()}
                                                style={{
                                                    background: 'transparent', border: 'none',
                                                    color: 'var(--tf-text)', fontSize: '12px',
                                                    width: '100%', outline: 'none',
                                                    fontFamily: 'monospace', padding: '10px 0',
                                                }}
                                            />
                                        </div>
                                        <button
                                            onClick={copyLink}
                                            style={{
                                                background: copied ? 'rgba(45, 212, 191, 0.15)' : 'var(--tf-accent)',
                                                border: `0.5px solid ${copied ? 'rgba(45, 212, 191, 0.4)' : 'transparent'}`,
                                                borderRadius: '10px', padding: '0 16px',
                                                cursor: 'pointer', color: '#fff',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                                                whiteSpace: 'nowrap', fontFamily: 'var(--font-body)'
                                            }}
                                        >
                                            {copied
                                                ? <><Check size={13} color="var(--tf-green)" /> <span style={{ color: 'var(--tf-green)' }}>Copied!</span></>
                                                : <><Copy size={13} /> Copy Link</>
                                            }
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {!shareEnabled && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{
                                        textAlign: 'center', padding: '16px',
                                        background: 'var(--tf-surface2)',
                                        border: '1px dashed var(--tf-border)',
                                        borderRadius: '10px', marginBottom: '20px',
                                        fontSize: '12px', color: 'var(--tf-text-secondary)',
                                        fontFamily: 'var(--font-body)'
                                    }}
                                >
                                    <EyeOff size={18} style={{ marginBottom: '6px', opacity: 0.4 }} />
                                    <div>Link disabled — toggle on to generate a share URL</div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Info footer */}
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: '10px',
                            padding: '12px 14px',
                            background: 'rgba(123, 104, 238, 0.06)',
                            border: '0.5px solid rgba(123, 104, 238, 0.15)',
                            borderRadius: '10px',
                            fontSize: '12px', color: 'var(--tf-text-secondary)',
                            lineHeight: 1.5, fontFamily: 'var(--font-body)'
                        }}>
                            <Globe size={14} color="var(--tf-accent)" style={{ marginTop: '1px', flexShrink: 0, opacity: 0.8 }} />
                            <span>
                                Anyone with this link can <strong style={{ color: 'var(--tf-text)', fontWeight: 600 }}>view</strong> this board
                                in read-only mode. They don't need an account.
                            </span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
            <style>{`@keyframes spin { to { transform: translate(-50%,-50%) rotate(360deg); } }`}</style>
        </AnimatePresence>
    );
}
