import React, { useState, useEffect } from 'react';
import { X, Code2, ShieldCheck, Key, Copy, Check } from 'lucide-react';
import { api } from '../api/client';

export function ApiDocsModal({ isOpen, onClose }) {
  const [spec, setSpec] = useState(null);
  const [copiedPath, setCopiedPath] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.getApiSpec().then(setSpec).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (path) => {
    navigator.clipboard.writeText(`http://localhost:4000${path}`);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(''), 1800);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-window" style={{ maxWidth: '960px', height: '88vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <Code2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>REST API Documentation &amp; Specification</h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                OpenAPI 3.0 compatible catalog with JWT role-based access control
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.15rem',
              fontSize: '0.825rem',
              color: '#c7d2fe',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <Key size={18} color="#818cf8" style={{ flexShrink: 0 }} />
            <div>
              All protected endpoints require <code>Authorization: Bearer &lt;jwt_token&gt;</code>. Role-based access control (RBAC) ensures authors only access their assigned author ID, while operations admins have catalog-wide supervisory clearance.
            </div>
          </div>

          {spec?.endpoints?.map((group) => (
            <div key={group.group} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
                {group.group}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {group.routes.map((r) => {
                  const methodColor =
                    r.method === 'GET'
                      ? '#38bdf8'
                      : r.method === 'POST'
                      ? '#34d399'
                      : r.method === 'PATCH'
                      ? '#fbbf24'
                      : '#f43f5e';

                  return (
                    <div
                      key={r.path + r.method}
                      className="glass-card"
                      style={{
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(0, 0, 0, 0.35)',
                            color: methodColor,
                            border: `1px solid ${methodColor}40`
                          }}
                        >
                          {r.method}
                        </span>

                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#ffffff' }}>
                          {r.path}
                        </span>

                        {r.auth && (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ShieldCheck size={12} color="#10b981" />
                            {r.auth}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.desc}</span>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.725rem' }}
                          onClick={() => handleCopy(r.path)}
                          title="Copy full URL"
                        >
                          {copiedPath === r.path ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
