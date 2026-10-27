import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Book,
  Clock,
  Shield,
  FileText,
  AlertTriangle,
  Lock,
  Edit3,
  CheckCircle,
  Copy,
  RefreshCw,
  Paperclip,
  UserCheck
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export function AdminTicketWorkspace({ ticketId, isOpen, onClose, onTicketUpdated }) {
  const { user } = useAuth();
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState('In Progress');
  const [sendingReply, setSendingReply] = useState(false);

  // Overrides & Management State
  const [mobileTab, setMobileTab] = useState('thread'); // 'dossier' | 'thread' | 'notes'
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [regeneratingDraft, setRegeneratingDraft] = useState(false);
  const [draftCopied, setDraftCopied] = useState(false);

  const messagesEndRef = useRef(null);

  const fetchDossier = async () => {
    if (!ticketId) return;
    try {
      const res = await api.getAdminTicket(ticketId);
      setTicketData(res);
      setReplyStatus(res.ticket.status === 'Open' ? 'In Progress' : res.ticket.status);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch ticket dossier', err);
    }
  };

  // Lock body scroll while modal is open to prevent background page scrolling
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && ticketId) {
      setLoading(true);
      fetchDossier();

      // Real-time near-real-time polling interval
      const interval = setInterval(fetchDossier, 3500);
      return () => clearInterval(interval);
    }
  }, [isOpen, ticketId]);

  const { ticket, messages = [], notes = [] } = ticketData || {};

  // Auto-generate AI draft on open if ticket has no pre-drafted response
  useEffect(() => {
    if (ticket && (!ticket.ai_draft_response || ticket.ai_draft_response.trim().length === 0) && !regeneratingDraft) {
      handleRegenerateDraft();
    }
  }, [ticket?.id]);

  // Override Category
  const handleCategoryChange = async (cat) => {
    try {
      await api.overrideClassification(ticketId, cat);
      await fetchDossier();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      alert(`Could not update category: ${err.message}`);
    }
  };

  // Override Priority
  const handlePriorityChange = async (pri) => {
    try {
      await api.overridePriority(ticketId, pri);
      await fetchDossier();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      alert(`Could not update priority: ${err.message}`);
    }
  };

  // Update Status
  const handleStatusChange = async (st) => {
    try {
      await api.updateTicketStatus(ticketId, st);
      await fetchDossier();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      alert(`Could not update status: ${err.message}`);
    }
  };

  // Assign ticket
  const handleAssignChange = async (val) => {
    try {
      await api.assignTicket(ticketId, val);
      await fetchDossier();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      alert(`Could not assign: ${err.message}`);
    }
  };

  // Add Internal Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || addingNote) return;
    setAddingNote(true);
    try {
      await api.addInternalNote(ticketId, newNote.trim());
      setNewNote('');
      await fetchDossier();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      alert(`Could not add internal note: ${err.message}`);
    } finally {
      setAddingNote(false);
    }
  };

  // Regenerate AI Draft
  const handleRegenerateDraft = async () => {
    setRegeneratingDraft(true);
    try {
      const res = await api.generateAiDraft(ticketId);
      await fetchDossier();
    } catch (err) {
      alert(`Could not regenerate draft: ${err.message}`);
    } finally {
      setRegeneratingDraft(false);
    }
  };

  // Insert AI Draft into Reply Editor
  const handleUseDraft = () => {
    if (ticket?.ai_draft_response) {
      setReplyMessage(ticket.ai_draft_response);
      setDraftCopied(true);
      setTimeout(() => setDraftCopied(false), 2000);
    }
  };

  // Send Admin Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      await api.sendAdminReply(ticketId, replyMessage.trim(), replyStatus);
      setReplyMessage('');
      await fetchDossier();
      if (onTicketUpdated) onTicketUpdated();
      // Scroll to the latest message only after admin explicitly sends a reply
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (err) {
      alert(`Failed to send reply: ${err.message}`);
    } finally {
      setSendingReply(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-window" style={{ maxWidth: '1240px', height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Workspace Top Header */}
        <div className="modal-header" style={{ padding: '1rem 1.5rem', background: '#0e1626', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: '#818cf8' }}>
              {ticket?.ticket_number}
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{ticket?.subject}</h2>

            {/* Quick Status Pill */}
            {ticket && (
              <span className={`badge badge-status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                {ticket.status}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Quick Status Selector */}
            <select
              id="select-ticket-status-header"
              className="select"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem', width: 'auto' }}
              value={ticket?.status || 'Open'}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="Open">Status: Open</option>
              <option value="In Progress">Status: In Progress</option>
              <option value="Resolved">Status: Resolved</option>
              <option value="Closed">Status: Closed</option>
            </select>

            {/* Assign to Me Button & Assignee Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                id="btn-assign-to-me"
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem' }}
                onClick={() => handleAssignChange(user?.name || 'Operations Admin')}
                disabled={ticket?.assigned_to === (user?.name || 'Operations Admin')}
                title="Assign this ticket directly to yourself"
              >
                <UserCheck size={13} />
                {ticket?.assigned_to === (user?.name || 'Operations Admin') ? 'Assigned to You' : 'Assign to Me'}
              </button>

              <select
                id="select-ticket-assignee"
                className="select"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem', width: 'auto' }}
                value={ticket?.assigned_to || ''}
                onChange={(e) => handleAssignChange(e.target.value)}
              >
                <option value="">Unassigned</option>
                <option value="Operations Admin">Assign: Operations Admin</option>
                <option value="Author Support Lead">Assign: Author Support Lead</option>
                <option value="Finance Desk">Assign: Finance Desk</option>
                <option value="Production Manager">Assign: Production Manager</option>
              </select>
            </div>

            <button
              id="btn-close-admin-workspace"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '0.5rem' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher (Visible only on viewports < 1024px) */}
        <div className="admin-mobile-tab-bar">
          <button
            type="button"
            className={`admin-mobile-tab-btn ${mobileTab === 'dossier' ? 'active' : ''}`}
            onClick={() => setMobileTab('dossier')}
          >
            <User size={13} /> Dossier
          </button>
          <button
            type="button"
            className={`admin-mobile-tab-btn ${mobileTab === 'thread' ? 'active' : ''}`}
            onClick={() => setMobileTab('thread')}
          >
            <Send size={13} /> Thread &amp; Draft
          </button>
          <button
            type="button"
            className={`admin-mobile-tab-btn ${mobileTab === 'notes' ? 'active' : ''}`}
            onClick={() => setMobileTab('notes')}
          >
            <Lock size={13} /> Notes ({notes.length})
          </button>
        </div>

        {/* Responsive Workspace Grid */}
        <div className="admin-workspace-grid">
          {/* Column 1: Context & Dossier */}
          <div className={`admin-workspace-col admin-workspace-col-dossier ${mobileTab === 'dossier' ? 'mobile-active' : ''}`}>
            {/* Author Profile */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                <User size={13} color="#818cf8" />
                Author Dossier
              </div>

              <div className="glass-card" style={{ padding: '0.85rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{ticket?.author_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{ticket?.author_email}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {ticket?.author_phone || 'No phone'} • {ticket?.author_city || 'India'}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Joined: {ticket?.author_joined_date || 'N/A'} • ID: {ticket?.author_id}
                </div>
              </div>
            </div>

            {/* Linked Book Details & Economics */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                <Book size={13} color="#06b6d4" />
                Book Context &amp; Royalties
              </div>

              {ticket?.book_title ? (
                <div className="glass-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ticket.book_title}</div>
                    <div style={{ fontSize: '0.725rem', color: '#0284c7' }}>{ticket.book_status}</div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div><strong>ISBN:</strong> {ticket.book_isbn || 'Pending'}</div>
                    <div><strong>MRP:</strong> {ticket.book_mrp ? `₹${ticket.book_mrp}` : 'N/A'}</div>
                    <div><strong>Copies Sold:</strong> {(ticket.total_copies_sold || 0).toLocaleString()}</div>
                    <div><strong>Royalty Earned:</strong> ₹{(ticket.total_royalty_earned || 0).toLocaleString('en-IN')}</div>
                    <div><strong>Royalty Paid:</strong> ₹{(ticket.royalty_paid || 0).toLocaleString('en-IN')}</div>
                    <div style={{ color: '#fbbf24', fontWeight: 600 }}>
                      <strong>Royalty Pending:</strong> ₹{(ticket.royalty_pending || 0).toLocaleString('en-IN')}
                    </div>
                    <div><strong>Last Payout:</strong> {ticket.last_royalty_payout_date || 'None'}</div>
                    <div><strong>Print Partner:</strong> {ticket.print_partner || 'In-House'}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem' }}>
                  General / Account Level query (no specific book attached)
                </div>
              )}
            </div>

            {/* AI Auto-Classification & Override */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                <Bot size={13} color="#a855f7" />
                AI Auto-Classification
              </div>

              <div className="glass-card" style={{ padding: '0.85rem' }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  AI Detected: <strong>{ticket?.ai_category}</strong>
                </div>

                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                  Current / Override Category:
                </label>
                <select
                  id="select-override-category"
                  className="select"
                  style={{ fontSize: '0.775rem', padding: '0.4rem' }}
                  value={ticket?.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  <option value="Royalty & Payments">Royalty &amp; Payments</option>
                  <option value="ISBN & Metadata Issues">ISBN &amp; Metadata Issues</option>
                  <option value="Printing & Quality">Printing &amp; Quality</option>
                  <option value="Distribution & Availability">Distribution &amp; Availability</option>
                  <option value="Book Status & Production Updates">Book Status &amp; Production Updates</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>
            </div>

            {/* AI Priority Scoring & Override */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                <AlertTriangle size={13} color="#f43f5e" />
                AI Priority Score
              </div>

              <div className="glass-card" style={{ padding: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Score:</span>
                  <span className={`badge badge-priority-${ticket?.priority?.toLowerCase()}`}>
                    {ticket?.priority}
                  </span>
                </div>

                {ticket?.ai_priority_reason && (
                  <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginBottom: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.4rem', borderRadius: '4px' }}>
                    💡 <em>{ticket.ai_priority_reason}</em>
                  </div>
                )}

                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                  Override Priority:
                </label>
                <select
                  id="select-override-priority"
                  className="select"
                  style={{ fontSize: '0.775rem', padding: '0.4rem' }}
                  value={ticket?.priority}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Column 2: Center - AI Draft Assistant & Conversation Thread */}
          <div className={`admin-workspace-col admin-workspace-col-thread ${mobileTab === 'thread' ? 'mobile-active' : ''}`}>
            {/* AI Draft Response Assistant Box */}
            <div className="ai-draft-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}
                  >
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      AI Knowledge Base Assistant
                    </h4>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                      Grounded in BookLeaf Knowledge Base &amp; Author Account Metrics
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    id="btn-regenerate-ai-draft"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    onClick={handleRegenerateDraft}
                    disabled={regeneratingDraft}
                    title="Regenerate fresh draft using LLM / Knowledge Base"
                  >
                    <RefreshCw size={13} className={regeneratingDraft ? 'spin' : ''} />
                    {regeneratingDraft ? 'Regenerating...' : 'Regenerate'}
                  </button>

                  <button
                    id="btn-use-ai-draft"
                    className="btn btn-ai"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    onClick={handleUseDraft}
                  >
                    <Copy size={13} />
                    {draftCopied ? 'Inserted into Editor!' : 'Use Draft as Reply'}
                  </button>
                </div>
              </div>

              {/* Draft Content Preview */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e9d5ff',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  color: 'var(--text-primary)',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {regeneratingDraft ? (
                  <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={14} className="spin" /> Generating contextual draft response with BookLeaf Knowledge Base...
                  </span>
                ) : (
                  ticket?.ai_draft_response || (
                    <span style={{ color: 'var(--text-muted)' }}>
                      Generating contextual draft response with BookLeaf Knowledge Base...
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Conversation Thread Messages */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Conversation History
              </div>

              {ticket?.attachment_name && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.5rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    color: '#0284c7'
                  }}
                >
                  <Paperclip size={14} />
                  <span>Author Attachment: <strong>{ticket.attachment_name}</strong></span>
                </div>
              )}

              {messages.map((msg) => {
                const isAdmin = msg.sender_type === 'admin';
                return (
                  <div key={msg.id} className={`message-bubble ${isAdmin ? 'message-admin' : 'message-author'}`}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: isAdmin ? '#4f46e5' : '#059669' }}>
                        {isAdmin ? `🛡️ ${msg.sender_name} (BookLeaf Ops)` : `👤 ${msg.sender_name} (Author)`}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{msg.created_at}</span>
                    </div>

                    <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Admin Response Composer */}
            <form onSubmit={handleSendReply} style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Official Response to Author (will appear in author portal)
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.775rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Set status on reply:</span>
                  <select
                    id="select-reply-status-change"
                    className="select"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value)}
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <textarea
                id="textarea-admin-reply"
                className="textarea"
                rows={4}
                placeholder="Type your response or click 'Use Draft as Reply' above to edit and send..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  id="btn-send-admin-reply"
                  type="submit"
                  className="btn btn-primary"
                  disabled={sendingReply || !replyMessage.trim()}
                >
                  <Send size={15} />
                  {sendingReply ? 'Sending Response...' : 'Send Official Response'}
                </button>
              </div>
            </form>
          </div>

          {/* Column 3: Right Sidebar - Internal Ops Notes (Strictly Confidential) */}
          <div className={`admin-workspace-col admin-workspace-col-notes ${mobileTab === 'notes' ? 'mobile-active' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Lock size={13} />
              Internal Notes (Admin Only)
            </div>

            <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              These notes are strictly private to the operations team and NEVER visible to authors.
            </p>

            {/* List of Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto' }}>
              {notes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No internal notes logged yet.
                </div>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="internal-note-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#b45309', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700 }}>{n.admin_name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{n.created_at?.split(' ')[1] || n.created_at}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#78350f', whiteSpace: 'pre-wrap' }}>{n.note}</div>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
              <textarea
                id="input-internal-note"
                className="textarea"
                rows={3}
                placeholder="Log internal action, finance check, or vendor note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                style={{ fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
              />
              <button
                id="btn-add-internal-note"
                type="submit"
                className="btn btn-secondary"
                style={{ fontSize: '0.775rem', padding: '0.45rem', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}
                disabled={addingNote || !newNote.trim()}
              >
                {addingNote ? 'Saving...' : '+ Add Internal Note'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
