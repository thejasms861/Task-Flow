import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Mail, ArrowRight, Loader2 } from 'lucide-react';
import apiClient from '../api/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password/', { email });
      setSent(true);
      // Redirect to reset page after short delay
      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 1800);
    } catch (err: any) {
      const errPayload = err?.response?.data?.error;
      if (typeof errPayload === 'string') {
        setError(errPayload);
      } else if (errPayload && typeof errPayload === 'object') {
        const first = Object.values(errPayload)[0] as any;
        setError(Array.isArray(first) ? first[0] : String(first));
      } else {
        setError('Something went wrong. Please try again.');
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
        <Mail size={24} color="#fff" strokeWidth={2.5} />
      </div>

      <h3 className="animate-fade-in-up delay-100" style={{
        fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '20px',
        textAlign: 'center', marginBottom: '6px', color: 'var(--tf-text)'
      }}>
        Forgot your password?
      </h3>

      <p className="animate-fade-in-up delay-200" style={{
        fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--tf-text-secondary)',
        textAlign: 'center', marginBottom: '28px'
      }}>
        Enter your email and we'll send you a 6-digit reset code
      </p>

      {sent ? (
        <div className="animate-fade-in-up delay-300" style={{
          background: 'rgba(29, 158, 117, 0.1)',
          border: '1px solid rgba(29, 158, 117, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '12px' }}>📬</div>
          <div style={{ fontSize: '14px', color: 'var(--tf-text)', fontWeight: 600, marginBottom: '6px' }}>
            Reset code sent!
          </div>
          <div style={{ fontSize: '12px', color: 'var(--tf-text-secondary)', lineHeight: '1.6' }}>
            Check your inbox at <strong>{email}</strong>.<br />Redirecting you now...
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="animate-fade-in-up delay-300">
          <div style={{ marginBottom: '24px' }}>
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
              autoFocus
            />
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
              <><div className="animate-spin" style={{width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%'}} /> Sending...</>
            ) : (
              <>Send reset code <ArrowRight size={16} /></>
            )}
          </button>
        </form>
      )}

      <div className="animate-fade-in-up delay-400" style={{ textAlign: 'center', fontSize: '13px', color: 'var(--tf-text-secondary)' }}>
        Remember your password? <Link to="/login" style={{ color: 'var(--tf-accent)', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--tf-accent-hover)'} onMouseOut={e => e.currentTarget.style.color='var(--tf-accent)'}>Sign in</Link>
      </div>
    </div>
  );
}
