import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Search, BarChart2, Settings, Activity, Calendar, Link2, LogOut, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import NotificationBell from './NotificationBell';

// Note: Ensure the NotificationBell uses the new style internally, 
// but we might need to wrap it or pass styles.

interface NavbarProps {
  boardName?: string;
  pageName?: string;
  boardId?: string;
  boardMembers?: any[];
  shareEnabled?: boolean;
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
  onShareClick?: () => void;
}

const AVATAR_COLOR_MAP: Record<string, string> = {
  purple: '#7B68EE', teal: '#2DD4BF', red: '#F87171',
  pink: '#F472B6', blue: '#60A5FA', amber: '#FBBF24',
};

export default function Navbar({
  boardName,
  pageName,
  boardId,
  boardMembers = [],
  shareEnabled,
  onSearchClick,
  onSettingsClick,
  onShareClick
}: NavbarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const avatarHex = AVATAR_COLOR_MAP[user?.avatar_color ?? ''] ?? 'var(--tf-accent)';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    if (avatarMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [avatarMenuOpen]);

  return (
    <nav style={{
      height: '44px',
      background: 'var(--tf-surface)',
      borderBottom: '0.5px solid var(--tf-border)',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Left side */}
      <Link to="/boards" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
        <div style={{
          width: '22px', height: '22px', background: 'var(--tf-accent)',
          borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Layers size={12} color="#fff" />
        </div>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '13px', color: 'var(--tf-text)' }}>
          TaskFlow
        </span>
      </Link>

      {boardName && (
        <>
          <span style={{ color: 'var(--tf-text-secondary)', fontSize: '12px' }}>/</span>
          <Link to={`/board/${boardId}`} style={{ color: 'var(--tf-text-secondary)', fontSize: '13px', textDecoration: 'none' }}>
            {boardName}
          </Link>
        </>
      )}

      {pageName && (
        <>
          <span style={{ color: 'var(--tf-text-secondary)', fontSize: '12px' }}>/</span>
          <span style={{ color: 'var(--tf-text)', fontSize: '13px' }}>{pageName}</span>
        </>
      )}

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        
        <style>
          {`
            .icon-btn {
              width: 28px;
              height: 28px;
              border-radius: 8px;
              background: var(--tf-surface2);
              border: 0.5px solid var(--tf-border);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: border-color 0.15s;
              color: var(--tf-text-secondary);
              text-decoration: none;
              padding: 0;
            }
            .icon-btn:hover {
              border-color: var(--tf-border-hover);
              color: var(--tf-text);
            }
          `}
        </style>

        {/* Board Search */}
        {boardId && onSearchClick && (
          <button className="icon-btn" onClick={onSearchClick} title="Search tasks">
            <Search size={14} />
          </button>
        )}

        {/* Theme Toggle */}
        <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <NotificationBell />

        {boardId && (
          <>
            <Link to={`/board/${boardId}/activity`} className="icon-btn" title="Activity Log">
              <Activity size={14} />
            </Link>
            <Link to={`/board/${boardId}/sprints`} className="icon-btn" title="Sprints">
              <Calendar size={14} />
            </Link>
            <Link to={`/board/${boardId}/analytics`} className="icon-btn" title="Analytics">
              <BarChart2 size={14} />
            </Link>
          </>
        )}

        {/* Share Button (if applicable) */}
        {boardId && onShareClick && (
          <button 
            className="icon-btn" 
            onClick={onShareClick} 
            title="Share board"
            style={{ 
              color: shareEnabled ? 'var(--tf-green)' : 'var(--tf-text-secondary)',
              borderColor: shareEnabled ? 'rgba(29, 158, 117, 0.3)' : 'var(--tf-border)'
            }}
          >
            <Link2 size={14} />
          </button>
        )}

        {/* Settings */}
        {onSettingsClick && (
          <button className="icon-btn" onClick={onSettingsClick} title="Settings">
            <Settings size={14} />
          </button>
        )}

        {/* Member Avatars */}
        {boardMembers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
            {boardMembers.slice(0, 5).map((m: any, i: number) => {
              const char = String(m.user?.display_name || '?').charAt(0).toUpperCase();
              return (
                <div key={i} title={m.user?.display_name} style={{
                  width: '26px', height: '26px', borderRadius: '50%', background: 'var(--tf-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '11px', color: '#fff',
                  border: '2px solid var(--tf-surface)',
                  marginLeft: i > 0 ? '-6px' : '0', zIndex: 10 - i
                }}>
                  {char}
                </div>
              );
            })}
          </div>
        )}

        {/* Current User Avatar */}
        <div style={{ position: 'relative', marginLeft: '4px' }} ref={avatarMenuRef}>
          <div
            onClick={() => setAvatarMenuOpen(o => !o)}
            style={{
              width: '26px', height: '26px', borderRadius: '50%', background: avatarHex,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '11px', color: '#fff',
              cursor: 'pointer', border: '2px solid var(--tf-surface)'
            }}
            title={user?.display_name}
          >
            {user?.display_name?.[0]?.toUpperCase() || '?'}
          </div>

          <AnimatePresence>
            {avatarMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  background: 'var(--tf-surface)', border: '0.5px solid var(--tf-border)',
                  borderRadius: '12px', minWidth: '180px', overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100,
                }}
              >
                <button
                  onClick={() => { setAvatarMenuOpen(false); navigate('/settings'); }}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    color: 'var(--tf-text)', padding: '11px 16px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--tf-surface2)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'none')}
                >
                  <Settings size={14} color="var(--tf-text-secondary)" /> Settings
                </button>
                <div style={{ height: '0.5px', background: 'var(--tf-border)' }} />
                <button
                  onClick={() => { setAvatarMenuOpen(false); logout(); }}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    color: 'var(--tf-red)', padding: '11px 16px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = 'rgba(226,75,74,0.08)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'none')}
                >
                  <LogOut size={14} /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
