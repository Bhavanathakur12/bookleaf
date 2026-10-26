import React from 'react';
import {
  Book,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  Printer,
  PlusCircle
} from 'lucide-react';

export function MyBooks({ booksData, loading, onRaiseTicketForBook }) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
        Loading published catalog...
      </div>
    );
  }

  const { books = [], summary = {} } = booksData || {};

  return (
    <div>
      {/* Overview Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">
            <span>Total Copies Sold</span>
            <TrendingUp size={16} color="#06b6d4" />
          </div>
          <div className="stat-card-value">{(summary.total_copies_sold || 0).toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            <span>Total Royalty Earned</span>
            <DollarSign size={16} color="#6366f1" />
          </div>
          <div className="stat-card-value">₹{(summary.total_royalty_earned || 0).toLocaleString('en-IN')}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            <span>Royalty Disbursed</span>
            <CheckCircle size={16} color="#10b981" />
          </div>
          <div className="stat-card-value" style={{ color: '#34d399' }}>
            ₹{(summary.royalty_paid || 0).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">
            <span>Royalty Pending</span>
            <Clock size={16} color="#f59e0b" />
          </div>
          <div className="stat-card-value" style={{ color: '#fbbf24' }}>
            ₹{(summary.royalty_pending || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Book Catalog Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>My Published Books &amp; Works</h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Full catalog inventory, sales tracking, and platform distribution status
          </p>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <Book size={40} color="#64748b" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No books registered yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Your published and in-production titles will show up here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {books.map((book) => {
            const isLive = book.status === 'Published & Live';
            return (
              <div key={book.book_id} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1.25rem' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '64px',
                        background: 'linear-gradient(135deg, #1e293b, #334155)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#818cf8',
                        flexShrink: 0,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                      }}
                    >
                      <Book size={24} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{book.title}</h3>
                        <span
                          className="badge"
                          style={{
                            background: isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isLive ? '#34d399' : '#fbbf24',
                            border: isLive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)'
                          }}
                        >
                          {isLive ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                          {book.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>
                          <strong>ISBN:</strong> {book.isbn || 'Pending Allocation'}
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Genre:</strong> {book.genre || 'General'}
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Published:</strong> {book.publication_date || 'In Pipeline'}
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Print Partner:</strong> {book.print_partner || 'In-House'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                    onClick={() => onRaiseTicketForBook(book.book_id)}
                  >
                    <PlusCircle size={14} /> Query About This Book
                  </button>
                </div>

                {/* Metrics Bar */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '0.85rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    marginTop: '1.25rem',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>MRP / List Price</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      {book.mrp ? `₹${book.mrp}` : 'In Production'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Royalty / Copy</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      {book.author_royalty_per_copy ? `₹${book.author_royalty_per_copy}` : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Total Sold</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8' }}>
                      {(book.total_copies_sold || 0).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Total Royalty Earned</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#818cf8' }}>
                      ₹{(book.total_royalty_earned || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Royalty Paid</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399' }}>
                      ₹{(book.royalty_paid || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Royalty Pending</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fbbf24' }}>
                      ₹{(book.royalty_pending || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Availability platforms */}
                {book.available_on && book.available_on.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <ShoppingBag size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                      Available on:
                    </span>
                    {book.available_on.map((ch) => (
                      <span
                        key={ch}
                        style={{
                          fontSize: '0.725rem',
                          padding: '0.15rem 0.5rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
