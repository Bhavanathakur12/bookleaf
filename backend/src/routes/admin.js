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
router.get('/stats', async (req, res) => {
  try {
    const [[{ count: total }]] = await db.query('SELECT COUNT(*) as count FROM tickets');
    const [[{ count: open }]] = await db.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'Open'");
    const [[{ count: inProgress }]] = await db.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'In Progress'");
    const [[{ count: resolved }]] = await db.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'Resolved'");
    const [[{ count: closed }]] = await db.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'Closed'");
    const [[{ count: critical }]] = await db.query("SELECT COUNT(*) as count FROM tickets WHERE priority = 'Critical' AND status IN ('Open', 'In Progress')");
    const [[{ count: high }]] = await db.query("SELECT COUNT(*) as count FROM tickets WHERE priority = 'High' AND status IN ('Open', 'In Progress')");

    // Find oldest unresolved ticket
    const [oldestRows] = await db.query(`
      SELECT t.id, t.ticket_number, t.subject, t.created_at, t.priority, t.category, a.name as author_name
      FROM tickets t
      JOIN authors a ON t.author_id = a.author_id
      WHERE t.status IN ('Open', 'In Progress')
      ORDER BY t.created_at ASC, t.id ASC
      LIMIT 1
    `);
    const oldestUnresolved = oldestRows[0] || null;

    // Category breakdown
    const [categoryStats] = await db.query(`
      SELECT category, COUNT(*) as count
      FROM tickets
      GROUP BY category
    `);

    res.json({
      metrics: {
        total: Number(total),
        unresolved: Number(open) + Number(inProgress),
        open: Number(open),
        inProgress: Number(inProgress),
        resolved: Number(resolved),
        closed: Number(closed),
        critical: Number(critical),
        high: Number(high)
      },
      oldestUnresolved,
      categoryStats
    });
  } catch (err) {
    console.error('[Admin Stats Error]', err);
    res.status(500).json({ error: 'Failed to retrieve queue statistics.' });
  }
});

// GET /api/admin/tickets
// List all incoming tickets with filtering, searching, sorting, and date range
router.get('/tickets', async (req, res) => {
  const { status, category, priority, sort, search, date } = req.query;

  try {
    let query = `
      SELECT t.*, 
        a.name as author_name, a.email as author_email, a.city as author_city,
        b.title as book_title, b.isbn as book_isbn,
        (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) as message_count,
        (SELECT COUNT(*) FROM ticket_internal_notes n WHERE n.ticket_id = t.id) as notes_count,
        (SELECT m.created_at FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_activity
      FROM tickets t
      JOIN authors a ON t.author_id = a.author_id
      LEFT JOIN books b ON t.book_id = b.book_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      if (status.toLowerCase() === 'pending' || status.toLowerCase() === 'unresolved') {
        query += " AND t.status IN ('Open', 'In Progress')";
      } else {
        query += ' AND t.status = ?';
        params.push(status);
      }
    }

    if (category && category !== 'All') {
      query += ' AND t.category = ?';
      params.push(category);
    }

    if (priority && priority !== 'All') {
      query += ' AND t.priority = ?';
      params.push(priority);
    }

    if (date && date !== 'All') {
      if (date === 'today') {
        query += ' AND DATE(t.created_at) = CURDATE()';
      } else if (date === '7days') {
        query += ' AND t.created_at >= NOW() - INTERVAL 7 DAY';
      } else if (date === '30days') {
        query += ' AND t.created_at >= NOW() - INTERVAL 30 DAY';
      }
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
      query += ' ORDER BY t.created_at ASC, t.id ASC';
    } else if (sort === 'newest') {
      query += ' ORDER BY t.created_at DESC, t.id DESC';
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
        t.created_at ASC, t.id ASC`;
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
        t.created_at ASC, t.id ASC`;
    }

    const [tickets] = await db.query(query, params);

    // Compute oldest unresolved ticket ID for easy visual highlight
    const [oldestRows] = await db.query(`
      SELECT id FROM tickets 
      WHERE status IN ('Open', 'In Progress') 
      ORDER BY created_at ASC, id ASC LIMIT 1
    `);
    const oldestId = oldestRows[0] ? oldestRows[0].id : null;

    const enrichedTickets = tickets.map((t) => ({
      ...t,
      is_oldest_unresolved: t.id === oldestId,
      is_critical_unresolved: t.priority === 'Critical' && (t.status === 'Open' || t.status === 'In Progress')
    }));

    res.json({ tickets: enrichedTickets });
  } catch (err) {
    console.error('[Admin Tickets Error]', err);
    res.status(500).json({ error: 'Failed to retrieve tickets.' });
  }
});

// GET /api/admin/tickets/:id
// Get complete ticket dossier with author info, linked book metrics, message thread, and internal notes
router.get('/tickets/:id', async (req, res) => {
  const ticketId = req.params.id;

  try {
    const [ticketRows] = await db.query(
      `SELECT t.*, 
        a.name as author_name, a.email as author_email, a.phone as author_phone, 
        a.city as author_city, a.joined_date as author_joined_date,
        b.title as book_title, b.isbn as book_isbn, b.genre as book_genre,
        b.status as book_status, b.mrp as book_mrp, b.author_royalty_per_copy,
        b.total_copies_sold, b.total_royalty_earned, b.royalty_paid, b.royalty_pending,
        b.last_royalty_payout_date, b.print_partner, b.available_on
      FROM tickets t
      JOIN authors a ON t.author_id = a.author_id
      LEFT JOIN books b ON t.book_id = b.book_id
      WHERE t.id = ?`,
      [ticketId]
    );

    const ticket = ticketRows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (ticket.available_on) {
      ticket.available_on = typeof ticket.available_on === 'string' ? JSON.parse(ticket.available_on) : ticket.available_on;
    }

    // Get messages in chronological order
    const [messages] = await db.query(
      `SELECT id, sender_type, sender_name, sender_id, message, created_at
       FROM ticket_messages
       WHERE ticket_id = ?
       ORDER BY created_at ASC, id ASC`,
      [ticketId]
    );

    // Get internal notes (Strictly admin visible)
    const [notes] = await db.query(
      `SELECT id, admin_id, admin_name, note, created_at
       FROM ticket_internal_notes
       WHERE ticket_id = ?
       ORDER BY created_at ASC, id ASC`,
      [ticketId]
    );

    // Auto-generate AI draft response if missing or empty upon opening ticket dossier
    if (!ticket.ai_draft_response || ticket.ai_draft_response.trim().length === 0) {
      try {
        const author = {
          name: ticket.author_name,
          email: ticket.author_email,
          city: ticket.author_city,
          phone: ticket.author_phone
        };
        const book = ticket.book_id
          ? {
              title: ticket.book_title,
              isbn: ticket.book_isbn,
              status: ticket.book_status,
              mrp: ticket.book_mrp,
              total_copies_sold: ticket.total_copies_sold,
              total_royalty_earned: ticket.total_royalty_earned,
              royalty_paid: ticket.royalty_paid,
              royalty_pending: ticket.royalty_pending,
              last_royalty_payout_date: ticket.last_royalty_payout_date
            }
          : null;

        const autoDraft = await generateAiDraftResponse({
          author,
          book,
          ticket: {
            ticket_number: ticket.ticket_number,
            category: ticket.category,
            priority: ticket.priority,
            subject: ticket.subject,
            description: ticket.description
          },
          messages
        });

        if (autoDraft && autoDraft.trim().length > 0) {
          ticket.ai_draft_response = autoDraft.trim();
          await db.query('UPDATE tickets SET ai_draft_response = ? WHERE id = ?', [autoDraft.trim(), ticketId]);
        }
      } catch (draftErr) {
        console.warn('[Admin Ticket Detail] Auto-generating missing draft failed:', draftErr.message);
      }
    }

    res.json({
      ticket,
      messages,
      notes
    });
  } catch (err) {
    console.error('[Admin Ticket Detail Error]', err);
    res.status(500).json({ error: 'Failed to retrieve ticket dossier.' });
  }
});

// PATCH /api/admin/tickets/:id/status
// Update ticket status
router.patch('/tickets/:id/status', async (req, res) => {
  const ticketId = req.params.id;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const now = new Date();
    const [result] = await db.query('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?', [status, now, ticketId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const [rows] = await db.query('SELECT author_id, ticket_number FROM tickets WHERE id = ?', [ticketId]);
    const ticket = rows[0];

    eventManager.broadcast(
      'ticket_status_changed',
      {
        ticketId: Number(ticketId),
        ticketNumber: ticket?.ticket_number,
        status
      },
      { authorId: ticket?.author_id }
    );

    res.json({ message: 'Ticket status updated successfully.', status });
  } catch (err) {
    console.error('[Update Status Error]', err);
    res.status(500).json({ error: 'Failed to update ticket status.' });
  }
});

// PATCH /api/admin/tickets/:id/classification
// Override AI's category classification
router.patch('/tickets/:id/classification', async (req, res) => {
  const ticketId = req.params.id;
  const { category } = req.body;

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }

  try {
    const now = new Date();
    const [result] = await db.query('UPDATE tickets SET category = ?, updated_at = ? WHERE id = ?', [category, now, ticketId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    res.json({ message: 'Classification updated successfully.', category });
  } catch (err) {
    console.error('[Update Classification Error]', err);
    res.status(500).json({ error: 'Failed to update classification.' });
  }
});

// PATCH /api/admin/tickets/:id/priority
// Override AI's priority score
router.patch('/tickets/:id/priority', async (req, res) => {
  const ticketId = req.params.id;
  const { priority } = req.body;

  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
  }

  try {
    const now = new Date();
    const [result] = await db.query('UPDATE tickets SET priority = ?, updated_at = ? WHERE id = ?', [priority, now, ticketId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    res.json({ message: 'Priority score updated successfully.', priority });
  } catch (err) {
    console.error('[Update Priority Error]', err);
    res.status(500).json({ error: 'Failed to update priority.' });
  }
});

// PATCH /api/admin/tickets/:id/assign
// Assign ticket to admin or team member
router.patch('/tickets/:id/assign', async (req, res) => {
  const ticketId = req.params.id;
  const { assigned_to } = req.body;

  try {
    const now = new Date();
    const [result] = await db.query('UPDATE tickets SET assigned_to = ?, updated_at = ? WHERE id = ?', [assigned_to || null, now, ticketId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    res.json({ message: 'Ticket assignment updated.', assigned_to });
  } catch (err) {
    console.error('[Update Assign Error]', err);
    res.status(500).json({ error: 'Failed to update ticket assignment.' });
  }
});

// POST /api/admin/tickets/:id/notes
// Add internal note (strictly admin visible)
router.post('/tickets/:id/notes', async (req, res) => {
  const ticketId = req.params.id;
  const { note } = req.body;

  if (!note || note.trim().length === 0) {
    return res.status(400).json({ error: 'Internal note text cannot be empty.' });
  }

  try {
    const now = new Date();
    const [info] = await db.query(
      'INSERT INTO ticket_internal_notes (ticket_id, admin_id, admin_name, note, created_at) VALUES (?, ?, ?, ?, ?)',
      [ticketId, req.user.email, req.user.name, note.trim(), now]
    );

    const [noteRows] = await db.query('SELECT * FROM ticket_internal_notes WHERE id = ?', [info.insertId]);
    const createdNote = noteRows[0];

    res.status(201).json({
      message: 'Internal note added.',
      note: createdNote
    });
  } catch (err) {
    console.error('[Add Note Error]', err);
    res.status(500).json({ error: 'Failed to add internal note.' });
  }
});

// POST /api/admin/tickets/:id/reply
// Admin sends response to author, adding to message thread and optionally resolving ticket
router.post('/tickets/:id/reply', async (req, res) => {
  const ticketId = req.params.id;
  const { message, status } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Response message cannot be empty.' });
  }

  try {
    const [tRows] = await db.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    const ticket = tRows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const now = new Date();
    const targetStatus = status && VALID_STATUSES.includes(status) ? status : ticket.status === 'Open' ? 'In Progress' : ticket.status;

    await db.query('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?', [targetStatus, now, ticketId]);

    const [info] = await db.query(
      'INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [ticketId, 'admin', req.user.email, req.user.name, message.trim(), now]
    );

    const [msgRows] = await db.query('SELECT * FROM ticket_messages WHERE id = ?', [info.insertId]);
    const createdMsg = msgRows[0];

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
  } catch (err) {
    console.error('[Admin Reply Error]', err);
    res.status(500).json({ error: 'Failed to send reply to author.' });
  }
});

// POST /api/admin/tickets/:id/ai-draft
// Generate or regenerate AI Draft response grounded in BookLeaf Knowledge Base
router.post('/tickets/:id/ai-draft', async (req, res) => {
  const ticketId = req.params.id;

  try {
    const [tRows] = await db.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    const ticket = tRows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const [aRows] = await db.query('SELECT * FROM authors WHERE author_id = ?', [ticket.author_id]);
    const author = aRows[0];

    const [bRows] = ticket.book_id ? await db.query('SELECT * FROM books WHERE book_id = ?', [ticket.book_id]) : [[]];
    const book = bRows[0] || null;

    const [messages] = await db.query('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC, id ASC', [ticketId]);

    const draft = await generateAiDraftResponse({ author, book, ticket, messages });

    await db.query('UPDATE tickets SET ai_draft_response = ? WHERE id = ?', [draft, ticketId]);

    res.json({
      message: 'AI draft response generated successfully.',
      draft
    });
  } catch (err) {
    console.error('[Generate AI Draft Error]', err);
    res.status(500).json({ error: 'Failed to generate AI draft response.' });
  }
});

export default router;
