import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, ArrowRight, ShieldCheck } from 'lucide-react';

export function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'var(--bg-primary)'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #4f46e5, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              margin: '0 auto 1rem',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
            }}
          >
            <BookOpen size={26} />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            BookLeaf Publishing
          </h1>
        </div>

        {error && (
          <div
            style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#be123c',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}
          >
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label
              htmlFor="input-login-email"
              style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
            >
              Email Address
            </label>
            <input
              id="input-login-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="enter your email id"
              required
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="input-login-password"
              style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
            >
              Password
            </label>
            <input
              id="input-login-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your account password"
              required
            />
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0.75rem', marginTop: '0.5rem', width: '100%', fontSize: '0.9rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* 1-Click Quick Demo Accounts */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.6rem', textAlign: 'center' }}>
            Quick Demo Accounts (1-Click Fill)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              id="btn-demo-admin"
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.725rem', padding: '0.45rem 0.5rem', justifyContent: 'center' }}
              onClick={() => {
                setEmail('admin@bookleafpublishing.com');
                setPassword('admin123');
                setError('');
              }}
              title="admin@bookleafpublishing.com / admin123"
            >
              🛡️ Admin
            </button>
            <button
              id="btn-demo-support"
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.725rem', padding: '0.45rem 0.5rem', justifyContent: 'center' }}
              onClick={() => {
                setEmail('support@bookleafpublishing.com');
                setPassword('support123');
                setError('');
              }}
              title="support@bookleafpublishing.com / support123"
            >
              🛡️ Support Lead
            </button>
            <button
              id="btn-demo-priya"
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.725rem', padding: '0.45rem 0.5rem', justifyContent: 'center' }}
              onClick={() => {
                setEmail('priya.sharma@email.com');
                setPassword('priya123');
                setError('');
              }}
              title="priya.sharma@email.com / priya123"
            >
              👤 Priya (Author)
            </button>
            <button
              id="btn-demo-rohit"
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.725rem', padding: '0.45rem 0.5rem', justifyContent: 'center' }}
              onClick={() => {
                setEmail('rohit.kapoor@email.com');
                setPassword('rohit123');
                setError('');
              }}
              title="rohit.kapoor@email.com / rohit123"
            >
              👤 Rohit (Author)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
