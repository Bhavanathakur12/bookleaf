import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Book, Clock, AlertTriangle, Paperclip, MessageSquare } from 'lucide-react';
import { api } from '../../api/client';

export function TicketThreadModal({ ticketId, isOpen, onClose, onTicketUpdated }) {
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchThread = async () => {
    if (!ticketId) return;
    try {
      const res = await api.getAuthorTicket(ticketId);
      setTicketData(res);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch ticket thread', err);
    }
  };

  useEffect(() => {
    if (isOpen && ticketId) {
      setLoading(true);
      fetchThread();

      // Real-time near-real-time polling interval while modal is open
      const interval = setInterval(fetchThread, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticketData?.messages]);

  if (!isOpen) return null;

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sending) return;

    setSending(true);
    try {
      await api.sendAuthorMessage(ticketId, replyText.trim());
      setReplyText('');
      await fetchThread();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      alert(`Could not send reply: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const { ticket, messages = [] } = ticketData || {};

  return (
    <div className="modal-overlay">
      <div className="modal-window" style={{ maxWidth: '850px', height: '85vh' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem', color: '#818cf8', fontWeight: 600 }}>
                {ticket?.ticket_number}
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{ticket?.subject}</h3>
              {ticket && (
                <span className={`badge badge-status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                  {ticket.status}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>
                <strong>Category:</strong> {ticket?.category}
              </span>
              <span>•</span>
              <span>
                <strong>Book:</strong> {ticket?.book_title || 'General / Account Level'}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={12} /> {ticket?.created_at}
              </span>
            </div>
          </div>

          <button
            id="btn-close-author-thread"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Thread History */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading conversation thread...
            </div>
          ) : (
            <div className="chat-container">
              {ticket?.attachment_name && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.6rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <Paperclip size={14} color="var(--accent-primary)" />
                  <span>Attached File: <strong>{ticket.attachment_name}</strong></span>
                </div>
              )}

              {messages.map((msg) => {
                const isAdmin = msg.sender_type === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`message-bubble ${isAdmin ? 'message-admin' : 'message-author'}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: isAdmin ? '#4f46e5' : '#059669' }}>
                        {isAdmin ? '🛡️ BookLeaf Support Desk' : '👤 You (Author)'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{msg.created_at}</span>
                    </div>

                    <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Modal Footer: Reply Composer */}
        <form onSubmit={handleSendReply} className="modal-footer" style={{ justifyContent: 'stretch' }}>
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
            <input
              id="input-author-reply"
              type="text"
              className="input"
              placeholder="Type your reply to BookLeaf support..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={sending}
            />
            <button
              id="btn-send-author-reply"
              type="submit"
              className="btn btn-primary"
              disabled={sending || !replyText.trim()}
              style={{ flexShrink: 0 }}
            >
              <Send size={15} />
              {sending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
