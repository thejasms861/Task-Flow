import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PRIORITY: Record<string, { label: string; bg: string; color: string }> = {
    P0: { label: 'P0', bg: 'rgba(226,75,74,0.15)', color: 'var(--tf-red)' },
    P1: { label: 'P1', bg: 'rgba(186,117,23,0.15)', color: 'var(--tf-yellow)' },
    P2: { label: 'P2', bg: 'rgba(29,158,117,0.15)', color: 'var(--tf-green)' },
    P3: { label: 'P3', bg: 'var(--tf-surface2)', color: 'var(--tf-text-tertiary)' },
};

export default function TaskCard({ task, onClick, isDragOverlay }: { task: any; onClick: () => void; isDragOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id: String(task.id),
        disabled: isDragOverlay 
    });
    const p = PRIORITY[task.priority] || PRIORITY['P3'];
    const isOverdue = task.due_date && new Date() > new Date(task.due_date);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        background: 'var(--tf-surface)',
        border: '0.5px solid var(--tf-border)',
        borderLeft: `3px solid ${p.color}`,
        borderRadius: '10px',
        padding: '12px 14px',
        cursor: isDragOverlay ? 'grabbing' : 'grab',
        userSelect: 'none' as const,
        opacity: isDragging && !isDragOverlay ? 0.3 : 1,
        boxShadow: isDragOverlay ? '0 10px 30px rgba(0,0,0,0.5)' : 'none',
    };

    return (
        <motion.div
            ref={setNodeRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={!isDragOverlay ? { borderColor: 'var(--tf-accent)', boxShadow: '0 4px 16px var(--tf-accent-glow)' } : {}}
            onClick={onClick}
            {...attributes}
            {...listeners}
            style={style}
        >
            {task.labels?.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {task.labels.map((l: any) => (
                        <div key={l.id} title={l.name} style={{ width: '16px', height: '4px', borderRadius: '2px', background: l.color }} />
                    ))}
                </div>
            )}

            <p style={{ fontSize: '13px', fontFamily: 'var(--font-body)', fontWeight: 500, marginBottom: '10px', lineHeight: 1.4, color: 'var(--tf-text)' }}>
                {task.title}
            </p>

            {task.subtask_count > 0 && (
                <p style={{ fontSize: '11px', color: 'var(--tf-text-secondary)', marginBottom: '8px' }}>
                    {task.subtask_done_count}/{task.subtask_count} subtasks
                </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: p.bg, color: p.color }}>
                        {p.label}
                    </span>
                    {task.due_date && !isNaN(new Date(task.due_date).getTime()) && (
                        <span style={{ fontSize: '10px', color: isOverdue ? 'var(--tf-pink)' : 'var(--tf-text-tertiary)' }}>
                            {new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex' }}>
                    {(task.assignees || []).slice(0, 3).map((a: any, i: number) => (
                        <div key={i} title={a.display_name} style={{
                            width: '18px', height: '18px', borderRadius: '50%', background: 'var(--tf-surface2)',
                            border: '1.5px solid var(--tf-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '9px', fontWeight: 700, marginLeft: i > 0 ? '-5px' : '0', color: 'var(--tf-text-secondary)',
                            backgroundImage: a.avatar_url ? `url(${a.avatar_url})` : 'none',
                            backgroundSize: 'cover'
                        }}>
                            {!a.avatar_url && (a.display_name?.[0]?.toUpperCase() || '?')}
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
