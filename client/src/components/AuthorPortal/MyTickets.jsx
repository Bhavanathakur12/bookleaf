import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  MessageSquare,
  ChevronRight,
  PlusCircle,
  Book,
  Paperclip,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { api } from '../../api/client';
import { TicketThreadModal } from './TicketThreadModal';

export function MyTickets({ onOpenSubmitModal }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeTicketId, setActiveTicketId] = useState(null);

  const fetchTickets = async () => {
    try {
      const res = await api.getAuthorTickets();
      setTickets(res.tickets || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load author tickets', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    // Real-time polling every 4s
    const timer = setInterval(fetchTickets, 4000);
    return () => clearInterval(timer);
  }, []);

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus === 'All') return true;
    return t.status === filterStatus;
  });

  return (
    <div>
      {/* Header and Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>My Support Inquiries &amp; Tickets</h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Real-time tracking of queries submitted to the BookLeaf operations team
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Status Filter Tabs */}
          <div className="nav-tabs">
            {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map((st) => (
              <button
                key={st}
                className={`nav-tab-btn ${filterStatus === st ? 'active' : ''}`}
                onClick={() => setFilterStatus(st)}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            id="btn-raise-new-ticket"
            className="btn btn-primary"
            style={{ fontSize: '0.825rem', padding: '0.45rem 0.95rem' }}
            onClick={onOpenSubmitModal}
          >
            <PlusCircle size={15} /> New Ticket
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-muted)' }}>
          Loading your tickets...
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <FileText size={40} color="#64748b" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No tickets found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {filterStatus === 'All'
              ? 'You have not submitted any support tickets yet.'
              : `No tickets currently match the "${filterStatus}" status filter.`}
          </p>
          <button className="btn btn-primary" onClick={onOpenSubmitModal}>
            <PlusCircle size={15} /> Raise a Ticket
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredTickets.map((t) => (
            <div
              key={t.id}
              id={`ticket-card-${t.id}`}
              className="glass-card"
              onClick={() => setActiveTicketId(t.id)}
              style={{
                padding: '1.25rem 1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#818cf8',
                      background: 'rgba(99, 102, 241, 0.1)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {t.ticket_number}
                  </span>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff' }}>{t.subject}</h3>

                  <span className={`badge badge-status-${t.status.toLowerCase().replace(' ', '-')}`}>
                    {t.status}
                  </span>

                  <span className="badge badge-category">{t.category}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <span>
                    <Book size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {t.book_title || 'General Account Level'}
                  </span>
                  <span>•</span>
                  <span>
                    <Clock size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {t.created_at}
                  </span>
                  {t.attachment_name && (
                    <>
                      <span>•</span>
                      <span style={{ color: '#38bdf8' }}>
                        <Paperclip size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                        {t.attachment_name}
                      </span>
                    </>
                  )}
                </div>

                {t.last_message && (
                  <div
                    style={{
                      fontSize: '0.825rem',
                      color: t.last_message_sender === 'admin' ? '#a5b4fc' : '#94a3b8',
                      marginTop: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '800px'
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {t.last_message_sender === 'admin' ? '🛡️ BookLeaf Support: ' : '👤 You: '}
                    </span>
                    {t.last_message}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <MessageSquare size={15} />
                  <span>{t.message_count || 1}</span>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real-time Thread Modal */}
      <TicketThreadModal
        ticketId={activeTicketId}
        isOpen={Boolean(activeTicketId)}
        onClose={() => setActiveTicketId(null)}
        onTicketUpdated={fetchTickets}
      />
    </div>
  );
}
