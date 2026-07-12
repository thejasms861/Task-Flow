import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <h1 className='text-accent' style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
      <p style={{ marginBottom: '2rem' }}>The requested resource was not found on our servers.</p>
      <Link to='/' className='btn-primary' style={{ width: 'auto' }}>Go Home</Link>
    </div>
  )
}
