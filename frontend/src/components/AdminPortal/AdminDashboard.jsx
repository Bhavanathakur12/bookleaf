import React, { useState, useEffect } from 'react';
import {
  Inbox,
  AlertOctagon,
  Clock,
  Filter,
  Search,
  CheckCircle,
  ChevronRight,
  Flame,
  User,
  Book,
  Sparkles,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../api/client';
import { AdminTicketWorkspace } from './AdminTicketWorkspace';

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('urgency');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeTicketId, setActiveTicketId] = useState(null);

  const fetchData = async () => {
    try {
      const [statsRes, ticketsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminTickets({
          status: statusFilter,
          category: categoryFilter,
          priority: priorityFilter,
          date: dateFilter,
          sort: sortOrder,
          search: searchQuery
        })
      ]);
      setStats(statsRes);
      setTickets(ticketsRes.tickets || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load admin queue', err);
    }
  };

  useEffect(() => {
    fetchData();
    // Real-time near-real-time queue sync every 4s
    const timer = setInterval(fetchData, 4000);
    return () => clearInterval(timer);
  }, [statusFilter, categoryFilter, priorityFilter, dateFilter, sortOrder, searchQuery]);

  const metrics = stats?.metrics || {};
  const oldestUnresolved = stats?.oldestUnresolved;

  return (
    <div>
      {/* Metrics Row */}
      <div className="stats-grid">
        <div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); }}
          title="Click to view all tickets"
        >
          <div className="stat-card-label">
            <span>Total Tickets</span>
            <Inbox size={16} color="#6366f1" />
          </div>
          <div className="stat-card-value">{metrics.total ?? 0}</div>
        </div>

        <div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setStatusFilter('Pending')}
          title="Click to filter by pending unanswered & in-progress backlog"
        >
          <div className="stat-card-label">
            <span>Unresolved Backlog</span>
            <Clock size={16} color="#f59e0b" />
          </div>
          <div className="stat-card-value" style={{ color: '#d97706' }}>
            {metrics.unresolved ?? 0}
          </div>
        </div>

        <div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => { setPriorityFilter('Critical'); setStatusFilter('Pending'); }}
          title="Click to filter by critical priority pending tickets"
        >
          <div className="stat-card-label">
            <span>Critical Priority SLA</span>
            <Flame size={16} color="#e11d48" />
          </div>
          <div className="stat-card-value" style={{ color: '#be123c' }}>
            {metrics.critical ?? 0}
          </div>
        </div>

        <div
          className="stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setStatusFilter('Resolved')}
          title="Click to view resolved tickets"
        >
          <div className="stat-card-label">
            <span>Resolved / Closed</span>
            <CheckCircle size={16} color="#059669" />
          </div>
          <div className="stat-card-value" style={{ color: '#047857' }}>
            {(metrics.resolved || 0) + (metrics.closed || 0)}
          </div>
        </div>
      </div>

      {/* Spot Oldest Unresolved Urgent Banner */}
      {oldestUnresolved && (
        <div className="urgent-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#be123c'
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#be123c', textTransform: 'uppercase' }}>
                  Attention Required: Oldest Unresolved Ticket
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {oldestUnresolved.ticket_number}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {oldestUnresolved.subject}
                <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                  by {oldestUnresolved.author_name} ({oldestUnresolved.category})
                </span>
              </div>
            </div>
          </div>

          <button
            id="btn-open-oldest-unresolved"
            className="btn btn-danger"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
            onClick={() => setActiveTicketId(oldestUnresolved.id)}
          >
            Review Oldest Ticket
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Author Support Queue</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Filter by urgency, category, and date. AI automatically scores and classifies incoming queries.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sort by:</span>
            <select
              id="select-sort-order"
              className="select"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', width: 'auto' }}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="urgency">Smart Urgency (Critical &amp; Oldest First)</option>
              <option value="oldest">Oldest Submission Date</option>
              <option value="newest">Newest Submission Date</option>
            </select>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="admin-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              id="input-admin-search"
              type="text"
              className="input"
              style={{ paddingLeft: '2.2rem' }}
              placeholder="Search author, book, subject, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="select-filter-status"
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending / Unresolved Backlog</option>
              <option value="Open">Open Only</option>
              <option value="In Progress">In Progress Only</option>
              <option value="Resolved">Resolved Only</option>
              <option value="Closed">Closed Only</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              id="select-filter-category"
              className="select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Royalty & Payments">Royalty &amp; Payments</option>
              <option value="ISBN & Metadata Issues">ISBN &amp; Metadata Issues</option>
              <option value="Printing & Quality">Printing &amp; Quality</option>
              <option value="Distribution & Availability">Distribution &amp; Availability</option>
              <option value="Book Status & Production Updates">Book Status &amp; Production Updates</option>
              <option value="General Inquiry">General Inquiry</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              id="select-filter-priority"
              className="select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              id="select-filter-date"
              className="select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="All">All Submission Dates</option>
              <option value="today">Submitted Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Queue Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-muted)' }}>
          Loading queue...
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <Inbox size={40} color="#64748b" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No tickets match your filters</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Adjust your search or filter options to inspect the queue.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tickets.map((t) => (
            <div
              key={t.id}
              id={`admin-ticket-row-${t.id}`}
              className="glass-card"
              onClick={() => setActiveTicketId(t.id)}
              style={{
                padding: '1.15rem 1.4rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
                borderLeft: t.priority === 'Critical' ? '4px solid #f43f5e' : t.priority === 'High' ? '4px solid #f59e0b' : '4px solid #6366f1'
              }}
            >
              {/* Left Column: Number, Title, Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      color: '#4f46e5',
                      background: '#eef2ff',
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #c7d2fe'
                    }}
                  >
                    {t.ticket_number}
                  </span>

                  <h3 style={{ fontSize: '1.025rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.subject}</h3>

                  <span className={`badge badge-priority-${t.priority.toLowerCase()}`}>
                    {t.priority}
                  </span>

                  <span className={`badge badge-status-${t.status.toLowerCase().replace(' ', '-')}`}>
                    {t.status}
                  </span>

                  {t.is_oldest_unresolved && (
                    <span
                      className="badge"
                      style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                    >
                      <Clock size={11} /> Oldest Unresolved
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span>
                    <User size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                    <strong>{t.author_name}</strong> ({t.author_city || 'India'})
                  </span>
                  <span>•</span>
                  <span>
                    <Book size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                    {t.book_title || 'General Account Level'}
                  </span>
                  <span>•</span>
                  <span className="badge badge-category" style={{ padding: '0.15rem 0.5rem' }}>
                    {t.category}
                  </span>
                  <span>•</span>
                  <span>Submitted {t.created_at}</span>
                </div>
              </div>

              {/* Right Column: Meta & Open Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div>Assigned: <strong style={{ color: t.assigned_to ? 'var(--text-primary)' : 'var(--text-muted)' }}>{t.assigned_to || 'Unassigned'}</strong></div>
                  <div>Messages: {t.message_count || 1} • Notes: {t.notes_count || 0}</div>
                </div>

                <button
                  id={`btn-open-ticket-${t.id}`}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTicketId(t.id);
                  }}
                >
                  Inspect &amp; Reply <ChevronRight size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Workspace Dossier */}
      <AdminTicketWorkspace
        ticketId={activeTicketId}
        isOpen={Boolean(activeTicketId)}
        onClose={() => setActiveTicketId(null)}
        onTicketUpdated={fetchData}
      />
    </div>
  );
}
