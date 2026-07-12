import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import apiClient from '../api/axios';
import { useToastStore } from '../store/useToastStore';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const navigate = useNavigate();
  const addToast = useToastStore(s => s.addToast);

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError('Email address is required.');
    if (!tokenParam && (!otp || otp.length !== 6)) return setError('Please enter a valid 6-digit code.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password/', {
        email,
        otp: tokenParam ? '' : otp,
        token: tokenParam,
        new_password: password,
        confirm_password: confirmPassword
      });
      addToast('Password reset successfully! You can now log in.', 'success');
      navigate('/login');
    } catch (err: any) {
      const errPayload = err?.response?.data?.error;
      if (typeof errPayload === 'string') {
        setError(errPayload);
      } else if (errPayload && typeof errPayload === 'object') {
        const first = Object.values(errPayload)[0] as any;
        setError(Array.isArray(first) ? first[0] : String(first));
      } else {
        setError('Reset failed. Please check the code and try again.');
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
        <KeyRound size={24} color="#fff" strokeWidth={2.5} />
      </div>
      
      <h3 className="animate-fade-in-up delay-100" style={{
        fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '20px',
        textAlign: 'center', marginBottom: '6px', color: 'var(--tf-text)'
      }}>
        Reset new password
      </h3>
      
      <p className="animate-fade-in-up delay-200" style={{
        fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--tf-text-secondary)',
        textAlign: 'center', marginBottom: '28px'
      }}>
        {tokenParam ? 'Enter your new password below' : `Enter the 6-digit code sent to ${email}`}
      </p>

      <form onSubmit={handleReset} className="animate-fade-in-up delay-300">
        {!emailParam && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--tf-text-secondary)', marginBottom: '8px' }}>
              Email address
            </label>
            <input 
              type="email" 
              required 
              className="input-modern"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="you@example.com"
            />
          </div>
        )}
        
        {!tokenParam && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--tf-text-secondary)', marginBottom: '8px' }}>
              Reset Code (OTP)
            </label>
            <input 
              type="text" 
              required 
              maxLength={6}
              pattern="\d{6}"
              className="input-modern"
              value={otp} 
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} 
              placeholder="123456"
              style={{ 
                letterSpacing: '8px', 
                textAlign: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
                height: '46px'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--tf-text-secondary)', marginBottom: '8px' }}>
            New Password
          </label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              required minLength={8}
              className="input-modern"
              placeholder="••••••••"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              style={{ paddingRight: '40px' }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tf-text-tertiary)', padding: 0, display: 'flex' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--tf-text-secondary)', marginBottom: '8px' }}>
            Confirm New Password
          </label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showConfirm ? "text" : "password"} 
              required minLength={8}
              className="input-modern"
              placeholder="••••••••"
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
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
        
        <button 
          type="submit" 
          disabled={loading} 
          className="btn-modern primary"
          style={{ marginBottom: '20px' }}
        >
          {loading ? (
            <><div className="animate-spin" style={{width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%'}} /> Updating...</>
          ) : (
            <>Reset Password <ArrowRight size={16} /></>
          )}
        </button>
      </form>

      <div className="animate-fade-in-up delay-400" style={{ textAlign: 'center', fontSize: '13px', color: 'var(--tf-text-secondary)' }}>
        Back to <Link to="/login" style={{ color: 'var(--tf-accent)', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--tf-accent-hover)'} onMouseOut={e => e.currentTarget.style.color='var(--tf-accent)'}>Sign in</Link>
      </div>
    </div>
  );
}
