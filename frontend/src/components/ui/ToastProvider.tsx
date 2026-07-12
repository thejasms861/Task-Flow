import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '../../store/useToastStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const COLORS = {
    success: { bg: 'rgba(45, 212, 191, 0.1)', border: 'rgba(45, 212, 191, 0.25)', icon: 'var(--tf-green)' },
    error: { bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.25)', icon: 'var(--tf-red)' },
    info: { bg: 'rgba(123, 104, 238, 0.1)', border: 'rgba(123, 104, 238, 0.25)', icon: 'var(--tf-accent)' },
};

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
};

export default function ToastProvider() {
    const { toasts, removeToast } = useToastStore();

    return (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
            <AnimatePresence>
                {toasts.map((toast) => {
                    const Color = COLORS[toast.type];
                    const Icon = ICONS[toast.type];
                    return (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            style={{
                                pointerEvents: 'auto',
                                minWidth: '280px',
                                background: 'var(--tf-surface)',
                                border: `0.5px solid var(--tf-border)`,
                                borderRadius: '12px',
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                                backdropFilter: 'blur(10px)',
                            }}
                        >
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '8px',
                                background: Color.bg, border: `0.5px solid ${Color.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Icon size={14} color={Color.icon} />
                            </div>
                            <span style={{ flex: 1, fontSize: '13px', color: 'var(--tf-text)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>{toast.message}</span>
                            <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tf-text-secondary)', display: 'flex', padding: '4px' }}>
                                <X size={14} />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
