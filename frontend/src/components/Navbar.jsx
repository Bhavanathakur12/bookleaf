import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Headphones,
  FileText,
  PlusCircle,
  Shield,
  LogOut,
  BookMarked
} from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, onOpenSubmitModal }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Compute single uppercase initial from user's name (e.g. "Priya Sharma" -> "P")
  const userInitial = (user?.name?.trim()?.[0] || 'U').toUpperCase();
  const displayRole = isAdmin ? 'Admin' : 'Author';

  // Close popup when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    }
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen]);

  // Close popup when navigating away
  useEffect(() => {
    setIsProfileOpen(false);
  }, [activeTab]);

  return (
    <header className="top-navbar">
      {/* Brand & Role Mode Tag */}
      <div className="brand-badge">
        <div className="brand-logo-icon">
          <BookOpen size={20} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="brand-title">BookLeaf Publishing</span>
            <span
              className="badge"
              style={{
                background: isAdmin ? 'var(--badge-admin-bg)' : 'var(--badge-author-bg)',
                color: isAdmin ? 'var(--badge-admin-text)' : 'var(--badge-author-text)',
                border: isAdmin ? '1px solid var(--badge-admin-border)' : '1px solid var(--badge-author-border)'
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
              className="btn btn-primary btn-submit-nav"
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

      {/* User Actions & Logout */}
      <div className="navbar-user-actions">
        {/* Profile Avatar with Dropdown Popup */}
        <div className="profile-dropdown-container" ref={dropdownRef}>
          <button
            id="btn-user-avatar"
            className="user-avatar-btn user-avatar"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
            aria-label={`Profile menu for ${user?.name || 'User'}`}
            title={user?.name || 'User profile'}
          >
            <span className="user-avatar-initial">{userInitial}</span>
          </button>

          {isProfileOpen && (
            <div
              id="profile-dropdown-popup"
              className="profile-dropdown-popup"
              role="dialog"
              aria-label="User Profile Details"
            >
              <div className="profile-popup-name">{user?.name || 'User'}</div>
              <div className="profile-popup-email">{user?.email || 'No email provided'}</div>
              <div className="profile-popup-role-row">
                <span className="profile-popup-role-label">Role</span>
                <span className={`profile-popup-role-badge ${isAdmin ? 'role-admin' : 'role-author'}`}>
                  {displayRole}
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          id="btn-logout"
          className="btn btn-secondary btn-logout"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
