import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Eye, EyeOff } from 'lucide-react';
import apiClient from '../api/axios';

export default function Register() {
  const [form, setForm] = useState({ email: '', displayName: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);
  const navigate = useNavigate();

  const handleSocialAuth = async (provider: 'google' | 'github') => {
    try {
      setLoading(true);
      const redirectUri = `${window.location.origin}/auth/callback/${provider}`;
      
      const google_client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const github_client_id = import.meta.env.VITE_GITHUB_CLIENT_ID;

      if (provider === 'google') {
        if (!google_client_id) throw new Error("Google Client ID is not configured in the environment.");
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${google_client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile`;
      } else if (provider === 'github') {
        if (!github_client_id) throw new Error("GitHub Client ID is not configured in the environment.");
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${github_client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
      }
    } catch (err: any) {
      console.error('Failed to initiate social login:', err);
      setError(err.message || 'Failed to initiate social login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true);
    try {
      await register(form.email, form.password, form.displayName);
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (error: any) {
      // Custom renderer wraps errors as { success: false, error: { fieldName: ['msg'] } }
      const errPayload = error?.response?.data?.error;
      if (errPayload && typeof errPayload === 'object') {
        // Field-level errors (e.g. { email: ['user with this email already exists'] })
        const firstField = Object.values(errPayload)[0] as any;
        const msg = Array.isArray(firstField) ? firstField[0] : String(firstField);
        setError(msg);
      } else {
        setError(
          typeof errPayload === 'string' ? errPayload :
          error?.message ||
          'Registration failed. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel animate-fade-in-up" style={{ width: '380px', maxWidth: '100%' }}>
      <div className="animate-fade-in-up delay-100" style={{
        width: '48px', height: '48px',
        background: 'linear-gradient(135deg, var(--tf-accent) 0%, #8b85fa 100%)',
        borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
        boxShadow: '0 8px 16px var(--tf-accent-glow)'
      }}>
        <Layers size={24} color="#fff" strokeWidth={2.5} />
      </div>
      
      <h3 className="animate-fade-in-up delay-100" style={{
        fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '20px',
        textAlign: 'center', marginBottom: '6px', color: 'var(--tf-text)'
      }}>
        Create an account
      </h3>
      
      <p className="animate-fade-in-up delay-200" style={{
        fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--tf-text-secondary)',
        textAlign: 'center', marginBottom: '28px'
      }}>
        Join TaskFlow to manage your projects
      </p>

      <form onSubmit={handleRegister} className="animate-fade-in-up delay-300">
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--tf-text-secondary)', marginBottom: '8px' }}>
            Email address
          </label>
          <input 
            type="email" 
            required 
            className="input-modern"
            placeholder="you@example.com"
            value={form.email} 
            onChange={e => setForm({...form, email: e.target.value})} 
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--tf-text-secondary)', marginBottom: '8px' }}>
            Display Name
          </label>
          <input 
            type="text" 
            required 
            className="input-modern"
            placeholder="John Doe"
            value={form.displayName} 
            onChange={e => setForm({...form, displayName: e.target.value})} 
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--tf-text-secondary)', marginBottom: '8px' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              required minLength={8}
              className="input-modern"
              placeholder="••••••••"
              value={form.password} 
              onChange={e => setForm({...form, password: e.target.value})} 
              style={{ paddingRight: '40px' }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tf-text-tertiary)', padding: 0, display: 'flex' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--tf-text-secondary)', marginBottom: '8px' }}>
            Confirm Password
          </label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showConfirm ? "text" : "password"} 
              required minLength={8}
              className="input-modern"
              placeholder="••••••••"
              value={form.confirm} 
              onChange={e => setForm({...form, confirm: e.target.value})} 
              style={{ paddingRight: '40px' }}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tf-text-tertiary)', padding: 0, display: 'flex' }}>
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="animate-fade-in-up" style={{ 
            background: 'rgba(226, 75, 74, 0.1)', border: '1px solid rgba(226, 75, 74, 0.2)',
            color: 'var(--tf-red)', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', 
            marginBottom: '20px', textAlign: 'center' 
          }}>
            {error}
          </div>
        )}
        
        <button type="submit" disabled={loading} className="btn-modern primary" style={{ marginBottom: '20px' }}>
          {loading ? (
            <><div className="animate-spin" style={{width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%'}} /> Sending code...</>
          ) : 'Create account'}
        </button>
      </form>

      <div className="animate-fade-in-up delay-400" style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '20px', color: 'var(--tf-text-tertiary)', fontSize: '12px'
      }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--tf-border)' }}></div>
        <span>or sign up with</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--tf-border)' }}></div>
      </div>

      <div className="animate-fade-in-up delay-500" style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
        <button 
          type="button"
          disabled={loading}
          onClick={() => handleSocialAuth('google')}
          className="btn-modern ghost"
          style={{ flex: 1 }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
        <button 
          type="button"
          disabled={loading}
          onClick={() => handleSocialAuth('github')}
          className="btn-modern ghost"
          style={{ flex: 1 }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 1.27a11 11 0 00-3.48 21.46c.55.1.75-.24.75-.53v-1.87c-3.06.66-3.71-1.48-3.71-1.48-.5-1.27-1.22-1.61-1.22-1.61-.99-.68.08-.66.08-.66 1.1.08 1.68 1.13 1.68 1.13.98 1.68 2.57 1.2 3.2.92.1-.71.38-1.2.69-1.48-2.44-.28-5.01-1.22-5.01-5.44 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.4.11-2.91 0 0 .93-.3 3.04 1.13a10.6 10.6 0 012.77-.37c.94 0 1.88.13 2.77.37 2.11-1.43 3.04-1.13 3.04-1.13.6 1.51.22 2.63.11 2.91.7.77 1.13 1.75 1.13 2.95 0 4.23-2.58 5.15-5.04 5.42.39.34.74 1 .74 2.01v2.98c0 .29.2.64.76.53A11 11 0 0012 1.27" fill="currentColor"/>
          </svg>
          GitHub
        </button>
      </div>

      <div className="animate-fade-in-up delay-500" style={{ textAlign: 'center', fontSize: '13px', color: 'var(--tf-text-secondary)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--tf-accent)', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--tf-accent-hover)'} onMouseOut={e => e.currentTarget.style.color='var(--tf-accent)'}>Sign in</Link>
      </div>
    </div>
  );
}
