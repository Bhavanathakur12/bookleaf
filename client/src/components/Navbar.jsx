import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Headphones,
  FileText,
  PlusCircle,
  Shield,
  LogOut,
  UserCheck,
  Code2,
  BookMarked
} from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, onOpenSubmitModal, onOpenDocsModal }) {
  const { user, logout, demoAccounts, login } = useAuth();
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const isAdmin = user?.role === 'admin';

  const handleQuickSwitch = async (email, password) => {
    try {
      await login(email, password);
      setShowSwitchMenu(false);
    } catch (err) {
      alert(`Switch failed: ${err.message}`);
    }
  };

  return (
    <header className="top-navbar">
      {/* Brand & Mode Tag */}
      <div className="brand-badge">
        <div className="brand-logo-icon">
          <BookOpen size={20} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="brand-title">BookLeaf Publishing</span>
            <span
              className="badge"
              style={{
                background: isAdmin ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: isAdmin ? '#818cf8' : '#34d399',
                border: isAdmin ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
              }}
            >
              {isAdmin ? (
                <>
                  <Shield size={12} /> Admin Operations Portal
                </>
              ) : (
                <>
                  <Headphones size={12} /> Author Portal
                </>
              )}
            </span>
          </div>
          <span className="brand-sub">Author Support &amp; Communication Portal</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        {!isAdmin ? (
          <>
            <button
              id="tab-my-books"
              className={`nav-tab-btn ${activeTab === 'books' ? 'active' : ''}`}
              onClick={() => setActiveTab('books')}
            >
              <BookMarked size={16} /> My Books
            </button>
            <button
              id="tab-my-tickets"
              className={`nav-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
              onClick={() => setActiveTab('tickets')}
            >
              <FileText size={16} /> My Tickets
            </button>
            <button
              id="btn-submit-query-nav"
              className="btn btn-primary"
              style={{ padding: '0.45rem 0.95rem', fontSize: '0.825rem' }}
              onClick={onOpenSubmitModal}
            >
              <PlusCircle size={15} /> Raise Support Ticket
            </button>
          </>
        ) : (
          <>
            <button
              id="tab-admin-queue"
              className={`nav-tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('queue')}
            >
              <Headphones size={16} /> Ticket Queue
            </button>
            <button
              id="tab-admin-kb"
              className={`nav-tab-btn ${activeTab === 'kb' ? 'active' : ''}`}
              onClick={() => setActiveTab('kb')}
            >
              <BookOpen size={16} /> Knowledge Base Policies
            </button>
          </>
        )}
      </div>

      {/* User Actions, Quick Switcher & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <button
          id="btn-open-api-docs"
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
          onClick={onOpenDocsModal}
          title="View REST API Documentation & Specs"
        >
          <Code2 size={15} /> API Docs
        </button>

        {/* Quick Demo Account Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            id="btn-switch-account-dropdown"
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.4)' }}
            onClick={() => setShowSwitchMenu(!showSwitchMenu)}
          >
            <UserCheck size={15} color="#818cf8" />
            <span>Switch Role</span>
          </button>

          {showSwitchMenu && (
            <div
              className="glass-panel"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '320px',
                padding: '0.75rem',
                zIndex: 60,
                background: '#131c2e',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem', padding: '0 0.25rem' }}>
                Test Evaluation Accounts
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ fontSize: '0.725rem', color: '#6366f1', fontWeight: 600, marginTop: '0.25rem' }}>Ops Admin</div>
                {demoAccounts.admins?.map((adm) => (
                  <button
                    key={adm.email}
                    onClick={() => handleQuickSwitch(adm.email, 'admin123')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.4rem 0.6rem',
                      background: user.email === adm.email ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    <span>{adm.name}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Admin</span>
                  </button>
                ))}

                <div style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600, marginTop: '0.5rem' }}>Authors (10 Seeded)</div>
                {demoAccounts.authors?.map((auth) => (
                  <button
                    key={auth.email}
                    onClick={() => handleQuickSwitch(auth.email, 'author123')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.4rem 0.6rem',
                      background: user.email === auth.email ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <div>{auth.name}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{auth.city} • {auth.book_count} books</div>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#34d399' }}>{auth.author_id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: isAdmin ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#ffffff'
            }}
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#f8fafc' }}>{user?.name}</span>
        </div>

        {/* Logout */}
        <button
          id="btn-logout"
          className="btn btn-secondary"
          style={{ padding: '0.45rem', borderRadius: 'var(--radius-full)' }}
          onClick={logout}
          title="Sign out"
        >
          <LogOut size={16} color="#94a3b8" />
        </button>
      </div>
    </header>
  );
}
