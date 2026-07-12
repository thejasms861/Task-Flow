import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { Mail, KeyRound, Loader2, ArrowRight } from 'lucide-react';

/** Safely turn any DRF/custom-renderer error payload into a plain string. */
function extractErrorMessage(err: any, fallback: string): string {
  const raw = err?.response?.data?.error ?? err?.response?.data;
  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    // DRF field-level errors: { email: ['msg'] } or { detail: 'msg' }
    const firstVal = Object.values(raw)[0];
    if (Array.isArray(firstVal)) return String(firstVal[0]);
    if (typeof firstVal === 'string') return firstVal;
    return JSON.stringify(raw);
  }
  return fallback;
}

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const navigate = useNavigate();
  const verifyEmail = useAuthStore(s => s.verifyEmail);
  const resendVerification = useAuthStore(s => s.resendVerification);
  const addToast = useToastStore(s => s.addToast);

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [autoVerifying, setAutoVerifying] = useState(false);
  const [error, setError] = useState('');

  const autoVerifyCalled = useRef(false);

  // Auto verify if email and token are in URL
  useEffect(() => {
    if (emailParam && tokenParam && !autoVerifyCalled.current) {
      autoVerifyCalled.current = true;
      const handleAutoVerify = async () => {
        setAutoVerifying(true);
        setLoading(true);
        try {
          await verifyEmail(emailParam, { token: tokenParam });
          addToast('Email verified successfully! Welcome to TaskFlow.', 'success');
          navigate('/boards');
        } catch (err: any) {
          const errMsg = extractErrorMessage(err, 'Verification failed. The link may have expired or is invalid.');
          setError(errMsg);
          addToast(errMsg, 'error');
        } finally {
          setLoading(false);
          setAutoVerifying(false);
        }
      };
      handleAutoVerify();
    }
  }, [emailParam, tokenParam, verifyEmail, navigate, addToast]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError('Email address is required.');
    if (!otp || otp.length !== 6) return setError('Please enter a valid 6-digit code.');
    
    setError('');
    setLoading(true);
    try {
      await verifyEmail(email, { otp });
      addToast('Email verified successfully! Welcome to TaskFlow.', 'success');
      navigate('/boards');
    } catch (err: any) {
      const errMsg = extractErrorMessage(err, 'Verification failed. Please check the code and try again.');
      setError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return setError('Email address is required to resend verification.');
    
    setError('');
    setResending(true);
    try {
      await resendVerification(email);
      addToast('Verification code resent. Please check your inbox.', 'success');
      setCooldown(30);
    } catch (err: any) {
      const errMsg = extractErrorMessage(err, 'Failed to resend code. Please try again.');
      setError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setResending(false);
    }
  };

  if (autoVerifying) {
    return (
      <div style={{
        width: '360px',
        background: 'var(--tf-surface)',
        border: '0.5px solid var(--tf-border)',
        borderRadius: '14px',
        padding: '28px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px'
      }}>
        <Loader2 size={36} color="var(--tf-accent)" className="animate-spin" />
        <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--tf-text)', fontSize: '15px' }}>
          Verifying your email...
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--tf-text-secondary)', textAlign: 'center' }}>
          Please hold on while we complete your registration.
        </p>
      </div>
    );
  }

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
        Verify your email
      </h3>

      <p className="animate-fade-in-up delay-200" style={{
        fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--tf-text-secondary)',
        textAlign: 'center', marginBottom: '28px'
      }}>
        We sent a 6-digit code to <strong>{emailParam || 'your email'}</strong>
      </p>

      <form onSubmit={handleVerify} className="animate-fade-in-up delay-300">
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--tf-text-secondary)', marginBottom: '8px', textAlign: 'center' }}>
            Verification Code
          </label>
          <input
            type="text"
            required
            maxLength={6}
            pattern="\d{6}"
            className="input-modern"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            style={{ 
              letterSpacing: '8px', 
              textAlign: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              height: '52px'
            }}
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
            <><div className="animate-spin" style={{width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%'}} /> Verifying...</>
          ) : (
            <>Verify Email <ArrowRight size={16} /></>
          )}
        </button>
      </form>
      <div className="animate-fade-in-up delay-400" style={{ textAlign: 'center', fontSize: '13px', color: 'var(--tf-text-secondary)' }}>
        Didn't receive the code?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          style={{
            background: 'none', border: 'none',
            color: 'var(--tf-accent)', cursor: (resending || cooldown > 0) ? 'default' : 'pointer',
            fontWeight: 500, fontSize: '13px', textDecoration: 'none', opacity: (resending || cooldown > 0) ? 0.7 : 1, transition: 'color 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.color='var(--tf-accent-hover)'} 
          onMouseOut={e => e.currentTarget.style.color='var(--tf-accent)'}
        >
          {resending ? 'Sending...' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
        </button>
      </div>
      
      <div className="animate-fade-in-up delay-500" style={{ textAlign: 'center', fontSize: '12px', color: 'var(--tf-text-secondary)', marginTop: '20px' }}>
        <Link to="/login" style={{ color: 'var(--tf-text-secondary)', textDecoration: 'underline' }}>Back to login</Link>
      </div>
    </div>
  );
}
