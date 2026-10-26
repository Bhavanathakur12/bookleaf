import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import db, { initDatabase } from './db.js';
import { heuristicClassifyAndPrioritize, heuristicDraftResponse } from '../ai/aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runSeed() {
  console.log('[Seed] Initializing database schema...');
  initDatabase();

  const dataPath = path.resolve(__dirname, '../../../data/bookleaf_sample_data.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Sample dataset not found at ${dataPath}`);
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  const dataset = JSON.parse(raw);

  console.log(`[Seed] Found ${dataset.authors.length} authors in sample dataset.`);

  // Clear existing tables
  db.exec(`
    DELETE FROM ticket_internal_notes;
    DELETE FROM ticket_messages;
    DELETE FROM tickets;
    DELETE FROM users;
    DELETE FROM books;
    DELETE FROM authors;
  `);

  const passwordHash = bcrypt.hashSync('author123', 10);
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);

  // 1. Create Admin User
  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, role, author_id, name)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run('admin@bookleafpublishing.com', adminPasswordHash, 'admin', null, 'Operations Admin');
  insertUser.run('support@bookleafpublishing.com', adminPasswordHash, 'admin', null, 'Author Support Lead');

  // 2. Insert Authors & Author Users
  const insertAuthor = db.prepare(`
    INSERT INTO authors (author_id, name, email, phone, city, joined_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertBook = db.prepare(`
    INSERT INTO books (
      book_id, author_id, title, isbn, genre, publication_date,
      status, mrp, author_royalty_per_copy, total_copies_sold,
      total_royalty_earned, royalty_paid, royalty_pending,
      last_royalty_payout_date, print_partner, available_on
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalBooksCount = 0;

  for (const author of dataset.authors) {
    insertAuthor.run(
      author.author_id,
      author.name,
      author.email,
      author.phone || null,
      author.city || null,
      author.joined_date || null
    );

    // Create user login for this author
    insertUser.run(author.email, passwordHash, 'author', author.author_id, author.name);

    if (author.books && Array.isArray(author.books)) {
      for (const book of author.books) {
        insertBook.run(
          book.book_id,
          author.author_id,
          book.title,
          book.isbn || null,
          book.genre || null,
          book.publication_date || null,
          book.status,
          book.mrp ?? null,
          book.author_royalty_per_copy ?? null,
          book.total_copies_sold ?? 0,
          book.total_royalty_earned ?? 0,
          book.royalty_paid ?? 0,
          book.royalty_pending ?? 0,
          book.last_royalty_payout_date || null,
          book.print_partner || null,
          JSON.stringify(book.available_on || [])
        );
        totalBooksCount++;
      }
    }
  }

  console.log(`[Seed] Seeded ${dataset.authors.length} authors and ${totalBooksCount} books.`);

  // 3. Seed Realistic Sample Support Tickets
  const insertTicket = db.prepare(`
    INSERT INTO tickets (
      ticket_number, author_id, book_id, subject, description,
      status, category, ai_category, priority, ai_priority,
      ai_priority_reason, ai_draft_response, assigned_to,
      attachment_url, attachment_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMessage = db.prepare(`
    INSERT INTO ticket_messages (
      ticket_id, sender_type, sender_id, sender_name, message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertNote = db.prepare(`
    INSERT INTO ticket_internal_notes (
      ticket_id, admin_id, admin_name, note, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const sampleTickets = [
    {
      num: 'TICK-1001',
      authorId: 'AUTH001',
      bookId: 'BK001',
      subject: "Haven't received royalty for 4 months",
      desc: "I published my book 4 months ago and still haven't received any royalty. What's going on?",
      status: 'Open',
      assigned: null,
      created: '2026-03-01 10:15:00',
      messages: []
    },
    {
      num: 'TICK-1002',
      authorId: 'AUTH002',
      bookId: 'BK004',
      subject: 'Royalty amount seems too low',
      desc: 'My royalty amount seems too low. I sold 1,203 copies but only received ₹50,000.',
      status: 'In Progress',
      assigned: 'Operations Admin',
      created: '2026-03-02 11:30:00',
      messages: [
        {
          type: 'admin',
          id: 'admin@bookleafpublishing.com',
          name: 'Operations Admin',
          text: 'Hello Rohit, thank you for writing in. We calculated your net royalty based on MRP ₹499 less ₹145 printing cost, 45% marketplace commission, and shipping charges. I am compiling a full itemized audit sheet from Amazon India and Flipkart for you right now.',
          created: '2026-03-02 14:00:00'
        }
      ],
      notes: [
        'Finance verified: Amazon Q3 bulk remittance settled on Nov 15. Remaining ₹7,744 scheduled for upcoming payout cycle.'
      ]
    },
    {
      num: 'TICK-1003',
      authorId: 'AUTH007',
      bookId: 'BK011',
      subject: 'Amazon showing "Currently Unavailable"',
      desc: "My book is published and live but it's showing as 'Currently Unavailable' on Amazon India today.",
      status: 'Open',
      assigned: null,
      created: '2026-03-03 09:20:00',
      messages: []
    },
    {
      num: 'TICK-1004',
      authorId: 'AUTH004',
      bookId: 'BK006',
      subject: 'Terrible print quality on author copies',
      desc: 'I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.',
      status: 'Open',
      assigned: null,
      created: '2026-03-04 15:45:00',
      attachment: 'defect_sample_pages.jpg',
      messages: []
    },
    {
      num: 'TICK-1005',
      authorId: 'AUTH009',
      bookId: 'BK015',
      subject: 'Typesetting delay for Raising Roots',
      desc: "It's been 3 weeks and my book is still in typesetting. When will it be done?",
      status: 'Open',
      assigned: null,
      created: '2026-03-05 13:10:00',
      messages: []
    },
    {
      num: 'TICK-1006',
      authorId: 'AUTH010',
      bookId: 'BK017',
      subject: 'Amazon showing wrong ISBN',
      desc: "My book is showing a different ISBN on Amazon than what's on the physical copy.",
      status: 'Open',
      assigned: 'Author Support Lead',
      created: '2026-03-06 08:30:00',
      messages: []
    },
    {
      num: 'TICK-1007',
      authorId: 'AUTH006',
      bookId: null,
      subject: 'Can I update the description on Amazon?',
      desc: "Can I update the description of my book on Amazon after it's already live?",
      status: 'Resolved',
      assigned: 'Operations Admin',
      created: '2026-02-20 12:00:00',
      messages: [
        {
          type: 'admin',
          id: 'admin@bookleafpublishing.com',
          name: 'Operations Admin',
          text: 'Hi Arjun, yes absolutely! Metadata updates such as book descriptions or author biographies can be updated anytime through your portal or by providing the new text here. Changes typically reflect on Amazon and BookLeaf Store within 3–5 business days.',
          created: '2026-02-20 13:15:00'
        }
      ],
      notes: ['Description update submitted to Amazon Seller Central on Feb 20. Verified live.']
    }
  ];

  for (const st of sampleTickets) {
    const classification = heuristicClassifyAndPrioritize(st.subject, st.desc);
    const author = dataset.authors.find((a) => a.author_id === st.authorId);
    const book = st.bookId ? author?.books?.find((b) => b.book_id === st.bookId) : null;
    const draft = heuristicDraftResponse({
      author,
      book,
      ticket: { ...st, category: classification.category, priority: classification.priority }
    });

    const info = insertTicket.run(
      st.num,
      st.authorId,
      st.bookId,
      st.subject,
      st.desc,
      st.status,
      classification.category,
      classification.category,
      classification.priority,
      classification.priority,
      classification.reason,
      draft,
      st.assigned,
      st.attachment ? `/uploads/${st.attachment}` : null,
      st.attachment || null,
      st.created,
      st.created
    );

    const ticketId = info.lastInsertRowid;

    // Initial message from author
    insertMessage.run(ticketId, 'author', author.email, author.name, st.desc, st.created);

    // Seeded admin replies
    if (st.messages && st.messages.length > 0) {
      for (const msg of st.messages) {
        insertMessage.run(ticketId, msg.type, msg.id, msg.name, msg.text, msg.created);
      }
    }

    // Seeded internal notes
    if (st.notes && st.notes.length > 0) {
      for (const note of st.notes) {
        insertNote.run(ticketId, 'admin@bookleafpublishing.com', 'Operations Admin', note, st.created);
      }
    }
  }

  console.log(`[Seed] Seeded ${sampleTickets.length} realistic initial support tickets with messages and internal notes.`);
  console.log('[Seed] Database initialization and seeding completed successfully!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeed();
}
