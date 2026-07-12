import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { Loader2 } from 'lucide-react';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const socialLogin = useAuthStore(s => s.socialLogin);
  const addToast = useToastStore(s => s.addToast);
  const [error, setError] = useState('');
  const callbackCalled = useRef(false);

  useEffect(() => {
    if (callbackCalled.current) return;
    
    // Detect provider from URL path (e.g. /auth/callback/google) or query params
    let provider = '';
    if (location.pathname.includes('/google')) {
      provider = 'google';
    } else if (location.pathname.includes('/github')) {
      provider = 'github';
    } else {
      provider = searchParams.get('provider') || '';
    }

    const code = searchParams.get('code') || '';
    const redirectUri = window.location.origin + location.pathname;

    // In mock mode, we might also get mock details passed in query params
    const mockEmail = searchParams.get('email') || undefined;
    const mockName = searchParams.get('name') || undefined;
    const mockAvatar = searchParams.get('avatar_url') || undefined;

    const mockData = mockEmail ? { email: mockEmail, name: mockName, avatar_url: mockAvatar } : undefined;

    if (!provider || !code) {
      setError('Invalid OAuth callback configuration. Missing provider or authorization code.');
      return;
    }

    callbackCalled.current = true;

    const handleLogin = async () => {
      try {
        await socialLogin(provider, code, redirectUri, mockData);
        addToast(`Successfully logged in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}!`, 'success');
        navigate('/boards');
      } catch (err: any) {
        console.error(err);
        const errMsg = err?.response?.data?.error || `Authentication with ${provider} failed.`;
        setError(errMsg);
        addToast(errMsg, 'error');
      }
    };

    handleLogin();
  }, [searchParams, location, socialLogin, navigate, addToast]);

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
      {error ? (
        <>
          <div style={{ color: 'var(--tf-red)', fontSize: '13px', textAlign: 'center', fontWeight: 'bold' }}>
            Authentication Failed
          </div>
          <p style={{ fontSize: '12px', color: 'var(--tf-text-secondary)', textAlign: 'center' }}>
            {error}
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="btn-primary"
            style={{ width: '100%', height: '36px' }}
          >
            Back to Login
          </button>
        </>
      ) : (
        <>
          <Loader2 size={36} color="var(--tf-accent)" className="animate-spin" />
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--tf-text)', fontSize: '15px' }}>
            Authenticating...
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--tf-text-secondary)', textAlign: 'center' }}>
            Exchanging codes and signing you in.
          </p>
        </>
      )}
    </div>
  );
}
