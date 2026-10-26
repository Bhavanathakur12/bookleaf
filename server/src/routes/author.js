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
router.get('/books', (req, res) => {
  const authorId = req.user.author_id;
  if (!authorId) {
    return res.status(400).json({ error: 'No author profile linked to this user.' });
  }

  const books = db
    .prepare(
      `
    SELECT * FROM books
    WHERE author_id = ?
    ORDER BY publication_date DESC, created_at DESC
  `
    )
    .all(authorId);

  // Parse available_on JSON strings
  const formattedBooks = books.map((b) => ({
    ...b,
    available_on: b.available_on ? JSON.parse(b.available_on) : []
  }));

  // Calculate author-level summary stats
  const totals = formattedBooks.reduce(
    (acc, b) => {
      acc.total_copies_sold += b.total_copies_sold || 0;
      acc.total_royalty_earned += b.total_royalty_earned || 0;
      acc.royalty_paid += b.royalty_paid || 0;
      acc.royalty_pending += b.royalty_pending || 0;
      return acc;
    },
    { total_copies_sold: 0, total_royalty_earned: 0, royalty_paid: 0, royalty_pending: 0 }
  );

  res.json({
    author_id: authorId,
    books: formattedBooks,
    summary: totals
  });
});

// GET /api/author/tickets
// Returns all tickets submitted by this author
router.get('/tickets', (req, res) => {
  const authorId = req.user.author_id;

  const tickets = db
    .prepare(
      `
    SELECT t.*, b.title as book_title,
      (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) as message_count,
      (SELECT m.message FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
      (SELECT m.sender_type FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) as last_message_sender
    FROM tickets t
    LEFT JOIN books b ON t.book_id = b.book_id
    WHERE t.author_id = ?
    ORDER BY t.updated_at DESC
  `
    )
    .all(authorId);

  res.json({ tickets });
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

  // Fetch author & book details for AI context
  const author = db.prepare('SELECT * FROM authors WHERE author_id = ?').get(authorId);
  let book = null;
  if (book_id && book_id !== 'general') {
    book = db.prepare('SELECT * FROM books WHERE book_id = ? AND author_id = ?').get(book_id, authorId);
    if (!book) {
      return res.status(400).json({ error: 'Selected book does not exist or does not belong to you.' });
    }
  }

  // Generate unique ticket number (e.g., TICK-1024)
  const countRow = db.prepare('SELECT COUNT(*) as count FROM tickets').get();
  const ticketNumber = `TICK-${1001 + countRow.count}`;

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

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const insertStmt = db.prepare(`
    INSERT INTO tickets (
      ticket_number, author_id, book_id, subject, description,
      status, category, ai_category, priority, ai_priority,
      ai_priority_reason, ai_draft_response, assigned_to,
      attachment_url, attachment_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = insertStmt.run(
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
  );

  const newTicketId = info.lastInsertRowid;

  // Insert original query as the first message in the ticket thread
  db.prepare(`
    INSERT INTO ticket_messages (
      ticket_id, sender_type, sender_id, sender_name, message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(newTicketId, 'author', req.user.email, req.user.name, description.trim(), now);

  const createdTicket = db
    .prepare(
      `
    SELECT t.*, b.title as book_title
    FROM tickets t
    LEFT JOIN books b ON t.book_id = b.book_id
    WHERE t.id = ?
  `
    )
    .get(newTicketId);

  // Broadcast event via SSE to notify admins
  eventManager.broadcast('ticket_created', {
    ticket: createdTicket,
    authorName: author.name
  });

  res.status(201).json({
    message: 'Support ticket submitted successfully.',
    ticket: createdTicket
  });
});

// GET /api/author/tickets/:id
// Get single ticket details and chronological message thread (author-safe, no internal notes)
router.get('/tickets/:id', (req, res) => {
  const authorId = req.user.author_id;
  const ticketId = req.params.id;

  const ticket = db
    .prepare(
      `
    SELECT t.id, t.ticket_number, t.author_id, t.book_id, t.subject, t.description,
      t.status, t.category, t.priority, t.attachment_url, t.attachment_name,
      t.created_at, t.updated_at,
      b.title as book_title, b.isbn, b.status as book_status
    FROM tickets t
    LEFT JOIN books b ON t.book_id = b.book_id
    WHERE t.id = ? AND t.author_id = ?
  `
    )
    .get(ticketId, authorId);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found or you do not have permission to view it.' });
  }

  // Get messages in chronological order
  const messages = db
    .prepare(
      `
    SELECT id, sender_type, sender_name, message, created_at
    FROM ticket_messages
    WHERE ticket_id = ?
    ORDER BY created_at ASC, id ASC
  `
    )
    .all(ticketId);

  res.json({
    ticket,
    messages
  });
});

// POST /api/author/tickets/:id/messages
// Author sends follow-up reply in ticket thread
router.post('/tickets/:id/messages', (req, res) => {
  const authorId = req.user.author_id;
  const ticketId = req.params.id;
  const { message } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message content cannot be empty.' });
  }

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND author_id = ?').get(ticketId, authorId);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found or access denied.' });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // If ticket was resolved/closed, author reply re-opens it to In Progress
  let newStatus = ticket.status;
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
    newStatus = 'In Progress';
  }

  db.prepare(`UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?`).run(newStatus, now, ticketId);

  const insertMsg = db.prepare(`
    INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, sender_name, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const info = insertMsg.run(ticketId, 'author', req.user.email, req.user.name, message.trim(), now);

  const createdMessage = db.prepare('SELECT * FROM ticket_messages WHERE id = ?').get(info.lastInsertRowid);

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
});

export default router;
