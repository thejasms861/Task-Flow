import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCircle2 } from 'lucide-react';
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../../api/notificationsApi';
import { useToastStore } from '../../store/useToastStore';

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { addToast } = useToastStore();
    const queryClient = useQueryClient();

    // Fetch unread count every 30 seconds
    const { data: countData } = useQuery({
        queryKey: ['notifications-count'],
        queryFn: getUnreadCount,
        refetchInterval: 30000,
    });

    const unreadCount = countData?.data?.count || countData?.count || 0;
    const prevCountRef = useRef(unreadCount);

    useEffect(() => {
        if (unreadCount > prevCountRef.current) {
            addToast('New notification', 'info');
        }
        prevCountRef.current = unreadCount;
    }, [unreadCount, addToast]);

    // Fetch full notifications when dropdown is open
    const { data: notificationsData, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: getNotifications,
        enabled: isOpen,
    });

    const notifications = Array.isArray(notificationsData?.data) ? notificationsData.data : (Array.isArray(notificationsData) ? notificationsData : (notificationsData?.results || []));

    const markReadMutation = useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
        }
    });

    const markAllReadMutation = useMutation({
        mutationFn: markAllNotificationsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
        }
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleNotificationClick = (notif: any) => {
        if (!notif.is_read) {
            markReadMutation.mutate(notif.id);
        }
        setIsOpen(false);
        if (notif.board) {
            navigate(`/board/${notif.board}`);
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    background: 'var(--tf-surface2)', border: '0.5px solid var(--tf-border)', color: 'var(--tf-text-secondary)', 
                    cursor: 'pointer', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.15s ease',
                    padding: 0
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--tf-text)'; e.currentTarget.style.borderColor = 'var(--tf-border-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--tf-text-secondary)'; e.currentTarget.style.borderColor = 'var(--tf-border)'; }}
            >
                <Bell size={14} />
                {unreadCount > 0 && (
                    <div style={{
                        position: 'absolute', top: '-4px', right: '-4px', background: 'var(--tf-red)', 
                        color: '#fff', fontSize: '9px', fontWeight: 700, width: '14px', height: '14px', 
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid var(--tf-surface)', fontFamily: 'var(--font-heading)'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '360px', 
                    background: 'var(--tf-surface)', border: '0.5px solid var(--tf-border)', 
                    borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100,
                    display: 'flex', flexDirection: 'column', maxHeight: '400px', overflow: 'hidden'
                }}>
                    <div style={{ 
                        padding: '14px 16px', borderBottom: '0.5px solid var(--tf-border)', 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                    }}>
                        <h3 style={{ fontSize: '13px', fontWeight: 600, margin: 0, fontFamily: 'var(--font-heading)', color: 'var(--tf-text)' }}>Notifications</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={() => markAllReadMutation.mutate()}
                                style={{ 
                                    background: 'none', border: 'none', color: 'var(--tf-accent)', 
                                    fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                    fontFamily: 'var(--font-body)', fontWeight: 600 
                                }}
                            >
                                <Check size={12} /> Mark all read
                            </button>
                        )}
                    </div>
                    
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {isLoading ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--tf-text-tertiary)', fontSize: '12px', fontFamily: 'var(--font-body)' }}>Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--tf-text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <CheckCircle2 size={24} style={{ color: 'var(--tf-accent)', opacity: 0.5 }} />
                                <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)' }}>You're all caught up 🎉</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {notifications.slice(0, 50).map((notif: any) => (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => handleNotificationClick(notif)}
                                        style={{ 
                                            padding: '12px 16px', borderBottom: '0.5px solid var(--tf-border)',
                                            background: notif.is_read ? 'transparent' : 'rgba(123, 104, 238, 0.08)',
                                            cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start',
                                            transition: 'background 0.2s', fontFamily: 'var(--font-body)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = notif.is_read ? 'var(--tf-surface2)' : 'rgba(123, 104, 238, 0.12)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = notif.is_read ? 'transparent' : 'rgba(123, 104, 238, 0.08)'}
                                    >
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '50%', background: 'var(--tf-surface2)', border: '0.5px solid var(--tf-border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
                                            fontWeight: 600, color: 'var(--tf-text)', flexShrink: 0,
                                            backgroundImage: notif.actor_avatar ? `url(${notif.actor_avatar})` : 'none',
                                            backgroundSize: 'cover'
                                        }}>
                                            {!notif.actor_avatar && String(notif.actor_name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                            <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--tf-text)' }}>{notif.actor_name}</span>{' '}
                                                <span style={{ color: 'var(--tf-text-secondary)' }}>{notif.verb}</span>{' '}
                                                {notif.task_title && <span style={{ fontWeight: 500, color: 'var(--tf-text)' }}>{notif.task_title}</span>}
                                            </div>
                                            <span style={{ fontSize: '10px', color: 'var(--tf-text-tertiary)', fontWeight: 500 }}>{timeAgo(notif.created_at)}</span>
                                        </div>
                                        {!notif.is_read && (
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--tf-accent)', marginTop: '4px' }} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
