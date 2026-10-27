import express from 'express';
import db from '../db/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { classifyAndScoreTicket, generateAiDraftResponse } from '../ai/aiService.js';
import { eventManager } from '../events/eventManager.js';

const router = express.Router();

// Middleware: all author routes require authentication and 'author' role
router.use(authenticateToken);
router.use(requireRole('author'));

// GET /api/author/books
// Returns author's published and in-production books with full royalty & platform breakdown
router.get('/books', async (req, res) => {
  const authorId = req.user.author_id;
  if (!authorId) {
    return res.status(400).json({ error: 'No author profile linked to this user.' });
  }

  try {
    const [books] = await db.query(
      `SELECT * FROM books
       WHERE author_id = ?
       ORDER BY publication_date DESC, created_at DESC`,
      [authorId]
    );

    // Parse available_on JSON strings or objects
    const formattedBooks = books.map((b) => ({
      ...b,
      total_copies_sold: Number(b.total_copies_sold) || 0,
      total_royalty_earned: Number(b.total_royalty_earned) || 0,
      royalty_paid: Number(b.royalty_paid) || 0,
      royalty_pending: Number(b.royalty_pending) || 0,
      mrp: b.mrp !== null ? Number(b.mrp) : null,
      author_royalty_per_copy: b.author_royalty_per_copy !== null ? Number(b.author_royalty_per_copy) : null,
      available_on: typeof b.available_on === 'string' ? JSON.parse(b.available_on) : (b.available_on || [])
    }));

    // Calculate author-level summary stats
    const totals = formattedBooks.reduce(
      (acc, b) => {
        acc.total_copies_sold += b.total_copies_sold;
        acc.total_royalty_earned += b.total_royalty_earned;
        acc.royalty_paid += b.royalty_paid;
        acc.royalty_pending += b.royalty_pending;
        return acc;
      },
      { total_copies_sold: 0, total_royalty_earned: 0, royalty_paid: 0, royalty_pending: 0 }
    );

    res.json({
      author_id: authorId,
      books: formattedBooks,
      summary: totals
    });
  } catch (err) {
    console.error('[Author Books Error]', err);
    res.status(500).json({ error: 'Failed to retrieve author books.' });
  }
});

// GET /api/author/tickets
// Returns all tickets submitted by this author
router.get('/tickets', async (req, res) => {
  const authorId = req.user.author_id;

  try {
    const [tickets] = await db.query(
      `SELECT t.*, b.title as book_title,
        (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) as message_count,
        (SELECT m.message FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_message,
        (SELECT m.sender_type FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_message_sender
      FROM tickets t
      LEFT JOIN books b ON t.book_id = b.book_id
      WHERE t.author_id = ?
      ORDER BY t.updated_at DESC, t.id DESC`,
      [authorId]
    );

    res.json({ tickets });
  } catch (err) {
    console.error('[Author Tickets Error]', err);
    res.status(500).json({ error: 'Failed to retrieve tickets.' });
  }
});

// POST /api/author/tickets
// Submit a new support query
router.post('/tickets', async (req, res) => {
  const authorId = req.user.author_id;
  const { book_id, subject, description, attachment_url, attachment_name } = req.body;

  if (!subject || subject.trim().length < 3) {
    return res.status(400).json({ error: 'Subject is required and must be at least 3 characters long.' });
  }

  if (!description || description.trim().length < 5) {
    return res.status(400).json({ error: 'Description is required and must be at least 5 characters long.' });
  }

  try {
    // Fetch author & book details for AI context
    const [authorRows] = await db.query('SELECT * FROM authors WHERE author_id = ?', [authorId]);
    const author = authorRows[0];

    let book = null;
    if (book_id && book_id !== 'general') {
      const [bookRows] = await db.query('SELECT * FROM books WHERE book_id = ? AND author_id = ?', [book_id, authorId]);
      book = bookRows[0];
      if (!book) {
        return res.status(400).json({ error: 'Selected book does not exist or does not belong to you.' });
      }
    }

    // Generate robust collision-proof ticket number (e.g., TICK-1008)
    const [maxRows] = await db.query("SELECT MAX(CAST(SUBSTRING(ticket_number, 6) AS UNSIGNED)) as max_num FROM tickets WHERE ticket_number LIKE 'TICK-%'");
    const nextNum = (maxRows[0]?.max_num && !isNaN(maxRows[0].max_num)) ? maxRows[0].max_num + 1 : 1001;
    const ticketNumber = `TICK-${nextNum}`;

    // 1. AI-Powered Auto-Classification & Priority Scoring
    const aiResult = await classifyAndScoreTicket({
      subject: subject.trim(),
      description: description.trim(),
      book,
      author
    });

    // 2. Pre-generate AI Drafted Response based on BookLeaf Knowledge Base
    const aiDraft = await generateAiDraftResponse({
      author,
      book,
      ticket: {
        ticket_number: ticketNumber,
        category: aiResult.category,
        priority: aiResult.priority,
        subject: subject.trim(),
        description: description.trim()
      }
    });

    const now = new Date();

    const [info] = await db.query(
      `INSERT INTO tickets (
        ticket_number, author_id, book_id, subject, description,
        status, category, ai_category, priority, ai_priority,
        ai_priority_reason, ai_draft_response, assigned_to,
        attachment_url, attachment_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketNumber,
        authorId,
        book ? book.book_id : null,
        subject.trim(),
        description.trim(),
        'Open',
        aiResult.category,
        aiResult.category,
        aiResult.priority,
        aiResult.priority,
        aiResult.reason || 'Auto-classified based on author query context',
        aiDraft,
        null,
        attachment_url || null,
        attachment_name || null,
        now,
        now
      ]
    );

    const newTicketId = info.insertId;

    // Insert original query as the first message in the ticket thread
    await db.query(
      `INSERT INTO ticket_messages (
        ticket_id, sender_type, sender_id, sender_name, message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [newTicketId, 'author', req.user.email, req.user.name, description.trim(), now]
    );

    const [createdRows] = await db.query(
      `SELECT t.*, b.title as book_title
       FROM tickets t
       LEFT JOIN books b ON t.book_id = b.book_id
       WHERE t.id = ?`,
      [newTicketId]
    );

    const createdTicket = createdRows[0];

    // Broadcast event via SSE to notify admins
    eventManager.broadcast('ticket_created', {
      ticket: createdTicket,
      authorName: author.name
    });

    res.status(201).json({
      message: 'Support ticket submitted successfully.',
      ticket: createdTicket
    });
  } catch (err) {
    console.error('[Create Ticket Error]', err);
    res.status(500).json({ error: 'Failed to create support ticket.' });
  }
});

// GET /api/author/tickets/:id
// Get single ticket details and chronological message thread (author-safe, no internal notes)
router.get('/tickets/:id', async (req, res) => {
  const authorId = req.user.author_id;
  const ticketId = req.params.id;

  try {
    const [ticketRows] = await db.query(
      `SELECT t.id, t.ticket_number, t.author_id, t.book_id, t.subject, t.description,
        t.status, t.category, t.priority, t.attachment_url, t.attachment_name,
        t.created_at, t.updated_at,
        b.title as book_title, b.isbn, b.status as book_status
      FROM tickets t
      LEFT JOIN books b ON t.book_id = b.book_id
      WHERE t.id = ? AND t.author_id = ?`,
      [ticketId, authorId]
    );

    const ticket = ticketRows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or you do not have permission to view it.' });
    }

    // Get messages in chronological order
    const [messages] = await db.query(
      `SELECT id, sender_type, sender_name, message, created_at
       FROM ticket_messages
       WHERE ticket_id = ?
       ORDER BY created_at ASC, id ASC`,
      [ticketId]
    );

    res.json({
      ticket,
      messages
    });
  } catch (err) {
    console.error('[Get Ticket Error]', err);
    res.status(500).json({ error: 'Failed to retrieve ticket details.' });
  }
});

// POST /api/author/tickets/:id/messages
// Author sends follow-up reply in ticket thread
router.post('/tickets/:id/messages', async (req, res) => {
  const authorId = req.user.author_id;
  const ticketId = req.params.id;
  const { message } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message content cannot be empty.' });
  }

  try {
    const [ticketRows] = await db.query('SELECT * FROM tickets WHERE id = ? AND author_id = ?', [ticketId, authorId]);
    const ticket = ticketRows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or access denied.' });
    }

    const now = new Date();

    // If ticket was resolved/closed, author reply re-opens it to In Progress
    let newStatus = ticket.status;
    if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
      newStatus = 'In Progress';
    }

    await db.query(`UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?`, [newStatus, now, ticketId]);

    const [info] = await db.query(
      `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketId, 'author', req.user.email, req.user.name, message.trim(), now]
    );

    const [msgRows] = await db.query('SELECT * FROM ticket_messages WHERE id = ?', [info.insertId]);
    const createdMessage = msgRows[0];

    // Real-time broadcast
    eventManager.broadcast('ticket_message_added', {
      ticketId: Number(ticketId),
      ticketNumber: ticket.ticket_number,
      message: createdMessage,
      status: newStatus
    });

    res.status(201).json({
      message: 'Reply sent successfully.',
      newMessage: createdMessage,
      ticketStatus: newStatus
    });
  } catch (err) {
    console.error('[Add Message Error]', err);
    res.status(500).json({ error: 'Failed to send message reply.' });
  }
});

export default router;
