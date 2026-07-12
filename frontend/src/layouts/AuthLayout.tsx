import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--tf-bg)',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(108, 99, 255, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'spin 20s linear infinite',
        transformOrigin: 'center center',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        right: '-10%',
        width: '60vw',
        height: '60vw',
        background: 'radial-gradient(circle, rgba(29, 158, 117, 0.1) 0%, transparent 60%)',
        borderRadius: '50%',
        animation: 'spin 30s linear infinite reverse',
        transformOrigin: 'center center',
        zIndex: 0
      }} />
      
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
        padding: '20px'
      }}>
        <Outlet />
      </div>
    </div>
  );
}
