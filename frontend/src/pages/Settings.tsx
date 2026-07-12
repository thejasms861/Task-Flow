import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bell, Layers, ChevronLeft, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { updateProfile, uploadAvatar, removeAvatar } from '../api/settingsApi';
import { useToastStore } from '../store/useToastStore';

const AVATAR_COLORS: { key: string; hex: string; label: string }[] = [
  { key: 'purple', hex: '#7B68EE', label: 'Purple' },
  { key: 'teal',   hex: '#2DD4BF', label: 'Teal' },
  { key: 'red',    hex: '#F87171', label: 'Red' },
  { key: 'pink',   hex: '#F472B6', label: 'Pink' },
  { key: 'blue',   hex: '#60A5FA', label: 'Blue' },
  { key: 'amber',  hex: '#FBBF24', label: 'Amber' },
];

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
];

/* ── tiny helpers ── */
const inp: React.CSSProperties = {
  width: '100%', background: 'var(--tf-surface2)',
  border: '1px solid var(--tf-border)',
  borderRadius: '8px', padding: '11px 14px',
  color: 'var(--tf-text)', fontSize: '14px', outline: 'none',
  transition: 'border-color .2s',
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: checked ? 'var(--tf-accent)' : 'var(--tf-border-hover)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background .25s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left .25s',
        boxShadow: '0 1px 4px rgba(0,0,0,.4)',
      }} />
    </button>
  );
}

/* ═══════════════════════════════════════ */
export default function Settings() {
  const navigate = useNavigate();
  const { user, loadUser } = useAuthStore();
  const { addToast } = useToastStore();

  const [tab, setTab] = useState('profile');

  /* ── Profile ── */
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [avatarColor, setAvatarColor] = useState(user?.avatar_color ?? 'purple');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarHex = AVATAR_COLORS.find(c => c.key === avatarColor)?.hex ?? '#7B68EE';

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }
    setUploadingAvatar(true);
    try {
      await uploadAvatar(file);
      await loadUser();
      addToast('Avatar updated!', 'success');
    } catch {
      addToast('Failed to upload avatar', 'error');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await removeAvatar();
      await loadUser();
      addToast('Avatar removed!', 'success');
    } catch {
      addToast('Failed to remove avatar', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ display_name: displayName.trim(), avatar_color: avatarColor });
      await loadUser();
      addToast('Profile saved!', 'success');
    } catch {
      addToast('Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleColorPick = async (key: string) => {
    setAvatarColor(key);
    try {
      await updateProfile({ avatar_color: key });
      await loadUser();
    } catch { /* silent */ }
  };

  /* ── Notifications ── */
  const NOTIF_KEYS = ['task_assigned', 'task_done', 'sprint_started', 'member_added', 'weekly_digest'];
  const NOTIF_LABELS: Record<string, string> = {
    task_assigned:  'Task assigned to me',
    task_done:      'Task moved to Done',
    sprint_started: 'Sprint started',
    member_added:   'Member added to board',
    weekly_digest:  'Weekly digest email',
  };
  const loadNotifs = () => {
    try { return JSON.parse(localStorage.getItem('tf_notif_prefs') || '{}'); } catch { return {}; }
  };
  const [notifs, setNotifs] = useState<Record<string, boolean>>(() => {
    const saved = loadNotifs();
    const defaults: Record<string, boolean> = {};
    NOTIF_KEYS.forEach(k => { defaults[k] = saved[k] !== false; });
    return defaults;
  });
  const handleToggleNotif = (key: string, val: boolean) => {
    const next = { ...notifs, [key]: val };
    setNotifs(next);
    localStorage.setItem('tf_notif_prefs', JSON.stringify(next));
    addToast('Preference saved', 'success');
  };



  /* ── focus border util ── */
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = 'var(--tf-accent)');
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = 'var(--tf-border)');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        height: 64, padding: '0 2rem', display: 'flex', alignItems: 'center', gap: '1rem',
        borderBottom: '1px solid var(--border)', background: 'var(--surface)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate('/boards')} style={{
          background: 'var(--tf-surface2)', border: '1px solid var(--tf-border)',
          borderRadius: 8, padding: '6px 12px', color: 'var(--tf-text-secondary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, transition: 'color .2s',
        }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--tf-text)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--tf-text-secondary)')}>
          <ChevronLeft size={15} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={15} color="#fff" />
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>TaskFlow</span>
        </div>
        <span style={{ marginLeft: 4, color: 'var(--text-muted)', fontSize: 14 }}>/ Settings</span>
      </nav>

      {/* ── BODY ── */}
      <div style={{ display: 'flex', maxWidth: 960, margin: '0 auto', padding: '2.5rem 1.5rem', gap: '2rem' }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width: 180, flexShrink: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.75rem' }}>Settings</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} id={`settings-tab-${t.id}`} onClick={() => setTab(t.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8,
                  background: active ? 'var(--tf-accent-glow)' : 'none',
                  border: 'none', color: active ? 'var(--tf-accent)' : 'var(--tf-text-secondary)',
                  fontSize: 14, fontWeight: active ? 600 : 400, cursor: 'pointer',
                  textAlign: 'left', width: '100%', transition: 'all .15s',
                }}>
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── MAIN PANEL ── */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

              {/* ════════ PROFILE ════════ */}
              {tab === 'profile' && (
                <div>
                  <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Profile</h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>Manage your personal information</p>

                  {/* Avatar preview */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%', background: avatarHex,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, fontWeight: 700, color: '#fff',
                      boxShadow: `0 0 0 3px ${avatarHex}44`,
                      transition: 'background .3s, box-shadow .3s',
                      backgroundImage: user?.avatar_url ? `url(${user.avatar_url})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}>
                      {!user?.avatar_url && (displayName || user?.display_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{displayName || user?.display_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</p>
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <label style={{
                          fontSize: 12, fontWeight: 600, background: 'var(--tf-surface2)', border: '1px solid var(--tf-border)', 
                          padding: '6px 12px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                          {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadAvatar} disabled={uploadingAvatar} />
                        </label>
                        {user?.avatar_url && (
                          <button onClick={handleRemoveAvatar} disabled={uploadingAvatar} style={{
                            fontSize: 12, fontWeight: 600, background: 'transparent', color: 'var(--tf-text-secondary)', border: 'none', 
                            padding: '6px 8px', cursor: 'pointer', transition: 'all 0.2s'
                          }}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Display name */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Display Name
                    </label>
                    <input
                      id="settings-display-name"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      onBlur={onBlur}
                      onFocus={onFocus}
                      style={inp}
                    />
                  </div>

                  {/* Email read-only */}
                  <div style={{ marginBottom: 32 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Email
                    </label>
                    <input
                      value={user?.email || ''}
                      readOnly
                      style={{ ...inp, color: 'var(--text-muted)', cursor: 'not-allowed' }}
                    />
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Email cannot be changed</p>
                  </div>

                  {/* Avatar color picker */}
                  <div style={{ marginBottom: 36 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Avatar Color
                    </label>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {AVATAR_COLORS.map(c => (
                        <button
                          key={c.key}
                          id={`avatar-color-${c.key}`}
                          onClick={() => handleColorPick(c.key)}
                          title={c.label}
                          style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: c.hex, border: 'none', cursor: 'pointer',
                            boxShadow: avatarColor === c.key ? `0 0 0 3px var(--bg), 0 0 0 5px ${c.hex}` : 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'box-shadow .2s, transform .15s',
                            transform: avatarColor === c.key ? 'scale(1.12)' : 'scale(1)',
                          }}
                        >
                          {avatarColor === c.key && <Check size={16} color="#fff" strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    id="settings-save-profile"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    style={{
                      background: 'var(--accent)', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '11px 28px', fontFamily: "'Syne', sans-serif",
                      fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1, transition: 'all .2s',
                      boxShadow: '0 4px 14px var(--accent-glow)',
                    }}
                    onMouseOver={e => { if (!saving) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                    onMouseOut={e => { e.currentTarget.style.filter = 'none'; }}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              )}

              {/* ════════ NOTIFICATIONS ════════ */}
              {tab === 'notifications' && (
                <div>
                  <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Notifications</h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>Choose what you want to be notified about</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {NOTIF_KEYS.map((key, i) => (
                      <div key={key} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '18px 20px',
                        background: i % 2 === 0 ? 'var(--tf-surface2)' : 'transparent',
                        borderBottom: i < NOTIF_KEYS.length - 1 ? '1px solid var(--tf-border)' : 'none',
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{NOTIF_LABELS[key]}</span>
                        <Toggle checked={notifs[key]} onChange={val => handleToggleNotif(key, val)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}



            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
