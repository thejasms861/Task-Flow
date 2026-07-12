import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, CheckCircle2, Clock, BarChart2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getBoardTasks, getBoardDetail } from '../api/tasksApi';
import { getBoardActivities } from '../api/activityApi';
import Navbar from '../components/ui/Navbar';

const PRIORITY_COLORS: Record<string, string> = {
    P0: 'var(--tf-red)',
    P1: 'var(--tf-yellow)',
    P2: 'var(--tf-green)',
    P3: 'var(--tf-text-secondary)',
};

const DONUT_COLORS = ['#8885a8', '#ffd166', '#43e8a0'];

function StatCard({ icon, label, value, sub, accent }: any) {
    return (
        <div style={{
            background: 'var(--tf-surface)', borderRadius: '14px', border: '0.5px solid var(--tf-border)',
            padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--tf-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-body)', fontWeight: 600 }}>{label}</span>
                <div style={{ color: accent || 'var(--tf-accent)', opacity: 0.7 }}>{icon}</div>
            </div>
            <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: accent || 'var(--tf-text)', lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: '12px', color: 'var(--tf-text-secondary)', fontFamily: 'var(--font-body)' }}>{sub}</div>}
        </div>
    );
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: 'var(--tf-surface)', border: '0.5px solid var(--tf-border)', borderRadius: '8px', padding: '10px 14px' }}>
                <p style={{ color: 'var(--tf-text-secondary)', fontSize: '11px', marginBottom: '4px', fontFamily: 'var(--font-body)' }}>Priority {label}</p>
                <p style={{ color: 'var(--tf-text)', fontWeight: 600, fontSize: '18px', fontFamily: 'var(--font-heading)' }}>{payload[0].value} tasks</p>
            </div>
        );
    }
    return null;
}

const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: 'var(--tf-surface)', border: '0.5px solid var(--tf-border)', borderRadius: '8px', padding: '10px 14px' }}>
                <p style={{ color: payload[0].payload.fill, fontWeight: 600, fontFamily: 'var(--font-body)' }}>{payload[0].name}: {payload[0].value}</p>
            </div>
        );
    }
    return null;
};

export default function Analytics() {
    const { id: boardId } = useParams<{ id: string }>();

    const { data: boardData } = useQuery({
        queryKey: ['board', boardId],
        queryFn: () => getBoardDetail(boardId!),
        enabled: !!boardId,
    });

    const { data: tasksData, isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks', boardId],
        queryFn: () => getBoardTasks(boardId!),
        enabled: !!boardId,
    });

    const { data: activityData, isLoading: activityLoading } = useQuery({
        queryKey: ['activities', boardId, '', 1],
        queryFn: () => getBoardActivities(boardId!, 1, ''),
        enabled: !!boardId,
    });

    const tasks: any[] = useMemo(() => {
        if (!tasksData) return [];
        return Array.isArray(tasksData) ? tasksData : (tasksData.results || []);
    }, [tasksData]);

    const columns: any[] = useMemo(() => boardData?.columns || [], [boardData]);

    const metrics = useMemo(() => {
        const total = tasks.length;

        // Match columns by name (case-insensitive)
        const doneCol = columns.find((c: any) => /done/i.test(c.name));
        const inProgressCol = columns.find((c: any) => /progress/i.test(c.name));

        const done = doneCol ? tasks.filter((t: any) => String(t.column) === String(doneCol.id)).length : 0;
        const inProgress = inProgressCol ? tasks.filter((t: any) => String(t.column) === String(inProgressCol.id)).length : 0;
        const completionRate = total ? Math.round((done / total) * 100) : 0;

        // Priority breakdown
        const priorityData = ['P0', 'P1', 'P2', 'P3'].map(p => ({
            priority: p,
            count: tasks.filter((t: any) => t.priority === p).length,
            fill: PRIORITY_COLORS[p],
        }));

        // Per-column donut
        const donutData = columns.map((c: any, i: number) => ({
            name: c.name,
            value: tasks.filter((t: any) => String(t.column) === String(c.id)).length,
            fill: DONUT_COLORS[i % DONUT_COLORS.length],
        })).filter(d => d.value > 0);

        return { total, done, inProgress, completionRate, priorityData, donutData };
    }, [tasks, columns]);

    const activities: any[] = useMemo(() => {
        if (!activityData) return [];
        return Array.isArray(activityData) ? activityData.slice(0, 10) : (activityData.results || []).slice(0, 10);
    }, [activityData]);

    const cardStyle = {
        background: 'var(--tf-surface)', borderRadius: '14px',
        border: '0.5px solid var(--tf-border)', padding: '1.5rem',
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--tf-bg)', color: 'var(--tf-text)', display: 'flex', flexDirection: 'column' }}>
            <Navbar 
                boardName={boardData?.name} 
                pageName="Analytics" 
                boardId={boardId} 
                boardMembers={boardData?.members} 
                shareEnabled={!!boardData?.share_token} 
            />

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', flex: 1, width: '100%' }}>
                {/* Page title */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '4px', color: 'var(--tf-text)' }}>
                        Board Analytics
                    </h1>
                    <p style={{ color: 'var(--tf-text-secondary)', fontSize: '14px', fontFamily: 'var(--font-body)' }}>
                        Overview of task progress and team activity
                    </p>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <StatCard icon={<BarChart2 size={18} />} label="Total Tasks" value={metrics.total} sub="Across all columns" />
                    <StatCard icon={<CheckCircle2 size={18} />} label="Completed" value={metrics.done} accent="var(--tf-green)" sub="In Done column" />
                    <StatCard icon={<Clock size={18} />} label="In Progress" value={metrics.inProgress} accent="var(--tf-yellow)" sub="Actively worked on" />
                    <StatCard icon={<TrendingUp size={18} />} label="Completion Rate" value={`${metrics.completionRate}%`} accent={metrics.completionRate >= 75 ? 'var(--tf-green)' : metrics.completionRate >= 40 ? 'var(--tf-yellow)' : 'var(--tf-red)'} sub="Done / Total" />
                </div>

                {/* Charts row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '2rem' }}>
                    {/* Bar Chart - Priority Breakdown */}
                    <div style={cardStyle}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '16px', marginBottom: '1.5rem', color: 'var(--tf-text)' }}>
                            Tasks by Priority
                        </h3>
                        {tasksLoading ? (
                            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tf-text-tertiary)' }}>Loading...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={metrics.priorityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--tf-border)" vertical={false} />
                                    <XAxis dataKey="priority" tick={{ fill: 'var(--tf-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'var(--tf-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                        {metrics.priorityData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Donut Chart - Tasks per Column */}
                    <div style={cardStyle}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '16px', marginBottom: '1.5rem', color: 'var(--tf-text)' }}>
                            Tasks per Column
                        </h3>
                        {tasksLoading ? (
                            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tf-text-tertiary)' }}>Loading...</div>
                        ) : metrics.donutData.length === 0 ? (
                            <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tf-text-tertiary)', fontSize: '14px' }}>No tasks yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={metrics.donutData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {metrics.donutData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.fill} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomPieTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: '12px', color: 'var(--tf-text-secondary)', paddingTop: '8px' }}
                                        formatter={(value) => <span style={{ color: 'var(--tf-text)' }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div style={cardStyle}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '16px', marginBottom: '1.25rem', color: 'var(--tf-text)' }}>
                        Recent Activity
                    </h3>
                    {activityLoading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--tf-text-tertiary)' }}>Loading...</div>
                    ) : activities.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--tf-text-tertiary)' }}>No activity yet</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {activities.map((act: any, i: number) => (
                                <div key={act.id || i} style={{
                                    display: 'flex', alignItems: 'center', gap: '14px',
                                    padding: '12px 0',
                                    borderBottom: i < activities.length - 1 ? '0.5px solid var(--tf-border)' : 'none',
                                }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                                        background: 'var(--tf-surface2)', border: '0.5px solid var(--tf-border)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '12px', fontWeight: 600, color: 'var(--tf-text)'
                                    }}>
                                        {(act.actor_name || act.actor?.display_name || '?')[0]?.toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-body)' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--tf-text)' }}>
                                            {act.actor_name || act.actor?.display_name || 'Someone'}
                                        </span>
                                        <span style={{ color: 'var(--tf-text-secondary)', margin: '0 6px' }}>{act.verb}</span>
                                        {act.task_title && (
                                            <span style={{ color: 'var(--tf-text-secondary)', fontStyle: 'italic' }}>
                                                · {act.task_title}
                                            </span>
                                        )}
                                        {act.detail_display && (
                                            <span style={{ color: 'var(--tf-text-tertiary)', marginLeft: '6px' }}>
                                                → <span style={{ color: 'var(--tf-accent)' }}>{act.detail_display}</span>
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--tf-text-tertiary)', flexShrink: 0, fontFamily: 'var(--font-body)' }}>
                                        {act.created_at && !isNaN(new Date(act.created_at).getTime())
                                            ? formatDistanceToNow(new Date(act.created_at), { addSuffix: true })
                                            : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
