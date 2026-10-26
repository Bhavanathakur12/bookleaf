import express from 'express';
import db from '../db/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateAiDraftResponse } from '../ai/aiService.js';
import { eventManager } from '../events/eventManager.js';

const router = express.Router();

// Middleware: all admin routes require authentication and 'admin' role
router.use(authenticateToken);
router.use(requireRole('admin'));

const VALID_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
];

const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const VALID_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

// GET /api/admin/stats
// Queue metrics and health overview
router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM tickets').get().count;
  const open = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Open'").get().count;
  const inProgress = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'In Progress'").get().count;
  const resolved = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Resolved'").get().count;
  const closed = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Closed'").get().count;
  const critical = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE priority = 'Critical' AND status IN ('Open', 'In Progress')").get().count;
  const high = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE priority = 'High' AND status IN ('Open', 'In Progress')").get().count;

  // Find oldest unresolved ticket
  const oldestUnresolved = db.prepare(`
    SELECT t.id, t.ticket_number, t.subject, t.created_at, t.priority, t.category, a.name as author_name
    FROM tickets t
    JOIN authors a ON t.author_id = a.author_id
    WHERE t.status IN ('Open', 'In Progress')
    ORDER BY t.created_at ASC
    LIMIT 1
  `).get();

  // Category breakdown
  const categoryStats = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM tickets
    GROUP BY category
  `).all();

  res.json({
    metrics: {
      total,
      unresolved: open + inProgress,
      open,
      inProgress,
      resolved,
      closed,
      critical,
      high
    },
    oldestUnresolved: oldestUnresolved || null,
    categoryStats
  });
});

// GET /api/admin/tickets
// List all incoming tickets with filtering, searching, and sorting
router.get('/tickets', (req, res) => {
  const { status, category, priority, sort, search } = req.query;

  let query = `
    SELECT t.*, 
      a.name as author_name, a.email as author_email, a.city as author_city,
      b.title as book_title, b.isbn as book_isbn,
      (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) as message_count,
      (SELECT COUNT(*) FROM ticket_internal_notes n WHERE n.ticket_id = t.id) as notes_count,
      (SELECT m.created_at FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) as last_activity
    FROM tickets t
    JOIN authors a ON t.author_id = a.author_id
    LEFT JOIN books b ON t.book_id = b.book_id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'All') {
    query += ' AND t.status = ?';
    params.push(status);
  }

  if (category && category !== 'All') {
    query += ' AND t.category = ?';
    params.push(category);
  }

  if (priority && priority !== 'All') {
    query += ' AND t.priority = ?';
    params.push(priority);
  }

  if (search && search.trim()) {
    query += ` AND (
      t.ticket_number LIKE ? OR 
      t.subject LIKE ? OR 
      t.description LIKE ? OR 
      a.name LIKE ? OR 
      a.email LIKE ? OR 
      b.title LIKE ?
    )`;
    const s = `%${search.trim()}%`;
    params.push(s, s, s, s, s, s);
  }

  // Sorting
  if (sort === 'oldest') {
    query += ' ORDER BY t.created_at ASC';
  } else if (sort === 'newest') {
    query += ' ORDER BY t.created_at DESC';
  } else if (sort === 'urgency') {
    // Priority order: Critical > High > Medium > Low, then oldest unresolved first
    query += ` ORDER BY 
      CASE t.priority 
        WHEN 'Critical' THEN 1 
        WHEN 'High' THEN 2 
        WHEN 'Medium' THEN 3 
        WHEN 'Low' THEN 4 
        ELSE 5 
      END ASC,
      CASE 
        WHEN t.status IN ('Open', 'In Progress') THEN 1 
        ELSE 2 
      END ASC,
      t.created_at ASC`;
  } else {
    // Default smart urgency sort
    query += ` ORDER BY 
      CASE 
        WHEN t.priority = 'Critical' AND t.status IN ('Open', 'In Progress') THEN 1
        WHEN t.priority = 'High' AND t.status IN ('Open', 'In Progress') THEN 2
        WHEN t.status = 'Open' THEN 3
        WHEN t.status = 'In Progress' THEN 4
        ELSE 5
      END ASC,
      t.created_at ASC`;
  }

  const tickets = db.prepare(query).all(...params);

  // Compute oldest unresolved ticket ID for easy visual highlight
  const oldestRow = db.prepare(`
    SELECT id FROM tickets 
    WHERE status IN ('Open', 'In Progress') 
    ORDER BY created_at ASC LIMIT 1
  `).get();
  const oldestId = oldestRow ? oldestRow.id : null;

  const enrichedTickets = tickets.map((t) => ({
    ...t,
    is_oldest_unresolved: t.id === oldestId,
    is_critical_unresolved: t.priority === 'Critical' && (t.status === 'Open' || t.status === 'In Progress')
  }));

  res.json({ tickets: enrichedTickets });
});

// GET /api/admin/tickets/:id
// Get complete ticket dossier with author info, linked book metrics, message thread, and internal notes
router.get('/tickets/:id', (req, res) => {
  const ticketId = req.params.id;

  const ticket = db
    .prepare(
      `
    SELECT t.*, 
      a.name as author_name, a.email as author_email, a.phone as author_phone, 
      a.city as author_city, a.joined_date as author_joined_date,
      b.title as book_title, b.isbn as book_isbn, b.genre as book_genre,
      b.status as book_status, b.mrp as book_mrp, b.author_royalty_per_copy,
      b.total_copies_sold, b.total_royalty_earned, b.royalty_paid, b.royalty_pending,
      b.last_royalty_payout_date, b.print_partner, b.available_on
    FROM tickets t
    JOIN authors a ON t.author_id = a.author_id
    LEFT JOIN books b ON t.book_id = b.book_id
    WHERE t.id = ?
  `
    )
    .get(ticketId);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  if (ticket.available_on) {
    ticket.available_on = JSON.parse(ticket.available_on);
  }

  // Get messages in chronological order
  const messages = db
    .prepare(
      `
    SELECT id, sender_type, sender_name, sender_id, message, created_at
    FROM ticket_messages
    WHERE ticket_id = ?
    ORDER BY created_at ASC, id ASC
  `
    )
    .all(ticketId);

  // Get internal notes (Strictly admin visible)
  const notes = db
    .prepare(
      `
    SELECT id, admin_id, admin_name, note, created_at
    FROM ticket_internal_notes
    WHERE ticket_id = ?
    ORDER BY created_at ASC, id ASC
  `
    )
    .all(ticketId);

  res.json({
    ticket,
    messages,
    notes
  });
});

// PATCH /api/admin/tickets/:id/status
// Update ticket status
router.patch('/tickets/:id/status', (req, res) => {
  const ticketId = req.params.id;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const result = db.prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?').run(status, now, ticketId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const ticket = db.prepare('SELECT author_id, ticket_number FROM tickets WHERE id = ?').get(ticketId);

  eventManager.broadcast(
    'ticket_status_changed',
    {
      ticketId: Number(ticketId),
      ticketNumber: ticket.ticket_number,
      status
    },
    { authorId: ticket.author_id }
  );

  res.json({ message: 'Ticket status updated successfully.', status });
});

// PATCH /api/admin/tickets/:id/classification
// Override AI's category classification
router.patch('/tickets/:id/classification', (req, res) => {
  const ticketId = req.params.id;
  const { category } = req.body;

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const result = db.prepare('UPDATE tickets SET category = ?, updated_at = ? WHERE id = ?').run(category, now, ticketId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  res.json({ message: 'Classification updated successfully.', category });
});

// PATCH /api/admin/tickets/:id/priority
// Override AI's priority score
router.patch('/tickets/:id/priority', (req, res) => {
  const ticketId = req.params.id;
  const { priority } = req.body;

  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const result = db.prepare('UPDATE tickets SET priority = ?, updated_at = ? WHERE id = ?').run(priority, now, ticketId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  res.json({ message: 'Priority score updated successfully.', priority });
});

// PATCH /api/admin/tickets/:id/assign
// Assign ticket to admin or team member
router.patch('/tickets/:id/assign', (req, res) => {
  const ticketId = req.params.id;
  const { assigned_to } = req.body;

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const result = db.prepare('UPDATE tickets SET assigned_to = ?, updated_at = ? WHERE id = ?').run(assigned_to || null, now, ticketId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  res.json({ message: 'Ticket assignment updated.', assigned_to });
});

// POST /api/admin/tickets/:id/notes
// Add internal note (strictly admin visible)
router.post('/tickets/:id/notes', (req, res) => {
  const ticketId = req.params.id;
  const { note } = req.body;

  if (!note || note.trim().length === 0) {
    return res.status(400).json({ error: 'Internal note text cannot be empty.' });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const info = db
    .prepare('INSERT INTO ticket_internal_notes (ticket_id, admin_id, admin_name, note, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(ticketId, req.user.email, req.user.name, note.trim(), now);

  const createdNote = db.prepare('SELECT * FROM ticket_internal_notes WHERE id = ?').get(info.lastInsertRowid);

  res.status(201).json({
    message: 'Internal note added.',
    note: createdNote
  });
});

// POST /api/admin/tickets/:id/reply
// Admin sends response to author, adding to message thread and optionally resolving ticket
router.post('/tickets/:id/reply', (req, res) => {
  const ticketId = req.params.id;
  const { message, status } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Response message cannot be empty.' });
  }

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const targetStatus = status && VALID_STATUSES.includes(status) ? status : ticket.status === 'Open' ? 'In Progress' : ticket.status;

  db.prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?').run(targetStatus, now, ticketId);

  const info = db
    .prepare('INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, message, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(ticketId, 'admin', req.user.email, req.user.name, message.trim(), now);

  const createdMsg = db.prepare('SELECT * FROM ticket_messages WHERE id = ?').get(info.lastInsertRowid);

  // Broadcast real-time update to author
  eventManager.broadcast(
    'ticket_admin_replied',
    {
      ticketId: Number(ticketId),
      ticketNumber: ticket.ticket_number,
      message: createdMsg,
      status: targetStatus
    },
    { authorId: ticket.author_id }
  );

  res.status(201).json({
    message: 'Response sent to author successfully.',
    newMessage: createdMsg,
    status: targetStatus
  });
});

// POST /api/admin/tickets/:id/ai-draft
// Generate or regenerate AI Draft response grounded in BookLeaf Knowledge Base
router.post('/tickets/:id/ai-draft', async (req, res) => {
  const ticketId = req.params.id;

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found.' });
  }

  const author = db.prepare('SELECT * FROM authors WHERE author_id = ?').get(ticket.author_id);
  const book = ticket.book_id ? db.prepare('SELECT * FROM books WHERE book_id = ?').get(ticket.book_id) : null;
  const messages = db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId);

  const draft = await generateAiDraftResponse({ author, book, ticket, messages });

  db.prepare('UPDATE tickets SET ai_draft_response = ? WHERE id = ?').run(draft, ticketId);

  res.json({
    message: 'AI draft response generated successfully.',
    draft
  });
});

export default router;
