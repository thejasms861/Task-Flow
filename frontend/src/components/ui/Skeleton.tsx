import { motion } from 'framer-motion';

export function Skeleton({ width, height, borderRadius = '4px' }: { width?: string | number, height?: string | number, borderRadius?: string }) {
    return (
        <motion.div
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
                width: width || '100%',
                height: height || '100%',
                background: 'var(--surface2)',
                borderRadius,
            }}
        />
    );
}

export function BoardSkeleton() {
    return (
        <div style={{ display: 'flex', gap: '16px', padding: '2rem' }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Skeleton height={40} borderRadius='10px' />
                    <Skeleton height={120} borderRadius='8px' />
                    <Skeleton height={100} borderRadius='8px' />
                </div>
            ))}
        </div>
    );
}
