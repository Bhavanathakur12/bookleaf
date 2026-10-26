import React, { useState, useEffect } from 'react';
import { X, Send, Paperclip, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';

export function SubmitTicketModal({ isOpen, onClose, books = [], initialBookId = null, onTicketCreated }) {
  const [bookId, setBookId] = useState(initialBookId || 'general');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialBookId) {
      setBookId(initialBookId);
    }
  }, [initialBookId]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!subject.trim()) {
      setError('Please provide a subject line for your query.');
      return;
    }
    if (!description.trim()) {
      setError('Please describe your query in detail.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createTicket({
        book_id: bookId === 'general' ? null : bookId,
        subject: subject.trim(),
        description: description.trim(),
        attachment_name: attachment?.name || null,
        attachment_url: attachment ? '/uploads/defect_sample_pages.jpg' : null
      });

      onTicketCreated(res.ticket);
      onClose();
      // Reset form
      setSubject('');
      setDescription('');
      setAttachment(null);
      setBookId('general');
    } catch (err) {
      setError(err.message || 'Failed to submit query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-window">
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Submit Support Query</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Our operations and editorial team will assist you with priority
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  color: '#fb7185',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem'
                }}
              >
                {error}
              </div>
            )}

            {/* Book Selection Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Relating to Book
              </label>
              <select
                id="select-ticket-book"
                className="select"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
              >
                <option value="general">General / Account Level (No specific title)</option>
                {books.map((b) => (
                  <option key={b.book_id} value={b.book_id}>
                    {b.title} ({b.status}) {b.isbn ? `• ISBN: ${b.isbn}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Subject Line
              </label>
              <input
                id="input-ticket-subject"
                type="text"
                className="input"
                placeholder="e.g. Haven't received Q3 royalty or Defective print copies"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Detailed Description
              </label>
              <textarea
                id="input-ticket-description"
                className="textarea"
                rows={5}
                placeholder="Please describe your concern with as much detail as possible (order numbers, dates, error descriptions)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* File Attachment Support */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Optional File Attachment (Photos of misprints, invoices, or screenshots)
              </label>

              <div
                style={{
                  border: '1px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  textAlign: 'center',
                  background: 'rgba(15, 23, 42, 0.4)',
                  position: 'relative'
                }}
              >
                <input
                  id="input-ticket-file"
                  type="file"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%'
                  }}
                />

                {attachment ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#34d399' }}>
                    <CheckCircle2 size={16} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{attachment.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({attachment.size})</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                    <Paperclip size={16} />
                    <span style={{ fontSize: '0.85rem' }}>Click or drag a file to attach (UI support)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button id="btn-submit-ticket-confirm" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting & Classifying...' : 'Submit Ticket'}
              <Send size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
