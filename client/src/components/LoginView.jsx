import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Shield, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export function LoginView({ onOpenDocsModal }) {
  const { login, demoAccounts } = useAuth();
  const [email, setEmail] = useState('admin@bookleafpublishing.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
    setLoading(true);
    try {
      await login(demoEmail, demoPass);
    } catch (err) {
      setError(err.message || 'Login failed.');
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
        padding: '2rem 1rem'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '2.5rem',
          position: 'relative'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              margin: '0 auto 1rem',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)'
            }}
          >
            <BookOpen size={28} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.35rem' }}>BookLeaf Publishing</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Author Support &amp; Communication Portal
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#fb7185',
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Email Address
            </label>
            <input
              id="input-login-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@bookleafpublishing.com or priya.sharma@email.com"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Password
            </label>
            <input
              id="input-login-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0.75rem', marginTop: '0.5rem', width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Demo Switcher Section for Reviewers */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Sparkles size={14} color="#f59e0b" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Instant 1-Click Evaluator Logins
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <button
              id="quick-login-admin"
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.775rem', padding: '0.55rem 0.6rem', justifyContent: 'flex-start', background: 'rgba(99, 102, 241, 0.12)' }}
              onClick={() => handleQuickDemoLogin('admin@bookleafpublishing.com', 'admin123')}
            >
              <Shield size={14} color="#818cf8" />
              <span>Ops Admin</span>
            </button>

            <button
              id="quick-login-priya"
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.775rem', padding: '0.55rem 0.6rem', justifyContent: 'flex-start', background: 'rgba(16, 185, 129, 0.12)' }}
              onClick={() => handleQuickDemoLogin('priya.sharma@email.com', 'author123')}
            >
              <User size={14} color="#34d399" />
              <span>Priya Sharma</span>
            </button>

            <button
              id="quick-login-rohit"
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.775rem', padding: '0.55rem 0.6rem', justifyContent: 'flex-start' }}
              onClick={() => handleQuickDemoLogin('rohit.kapoor@email.com', 'author123')}
            >
              <User size={14} color="#38bdf8" />
              <span>Rohit Kapoor</span>
            </button>

            <button
              id="quick-login-sneha"
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.775rem', padding: '0.55rem 0.6rem', justifyContent: 'flex-start' }}
              onClick={() => handleQuickDemoLogin('sneha.kulkarni@email.com', 'author123')}
            >
              <User size={14} color="#ec4899" />
              <span>Sneha Kulkarni</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Seeded 10 authors &amp; 18 books</span>
            <button
              onClick={onOpenDocsModal}
              style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', textDecoration: 'underline' }}
            >
              View API Spec
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
