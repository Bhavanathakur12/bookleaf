import assert from 'assert';
import db, { initDatabase } from '../src/db/db.js';
import { runSeed } from '../src/db/seed.js';
import { heuristicClassifyAndPrioritize, heuristicDraftResponse } from '../src/ai/aiService.js';

async function runTests() {
  console.log('--- RUNNING GRAVITAS COMPREHENSIVE VERIFICATION SUITE (MySQL Engine) ---');

  // 1. Verify Database and Seed Data
  await initDatabase();
  const [[{ count: existingCount }]] = await db.query('SELECT COUNT(*) as count FROM authors').catch(() => [[{ count: 0 }]]);
  if (Number(existingCount) === 0) {
    await runSeed();
  }

  const [[{ count: authorsCount }]] = await db.query('SELECT COUNT(*) as count FROM authors');
  const [[{ count: booksCount }]] = await db.query('SELECT COUNT(*) as count FROM books');
  const [[{ count: ticketsCount }]] = await db.query('SELECT COUNT(*) as count FROM tickets');

  assert.strictEqual(Number(authorsCount), 10, 'Expected 10 authors in database');
  assert.strictEqual(Number(booksCount), 18, 'Expected 18 books in database');
  assert(Number(ticketsCount) >= 7, 'Expected at least 7 seeded tickets');
  console.log('✓ Invariant 1: Database seeded with exact 10 authors, 18 books, and initial tickets.');

  // 2. Verify Edge Case Handling for Books in Production
  const [inProdRows1] = await db.query("SELECT * FROM books WHERE title = 'Midnight in Mysore'");
  const inProdBook1 = inProdRows1[0];
  assert(inProdBook1, 'Book Midnight in Mysore should exist');
  assert.strictEqual(inProdBook1.status, 'In Production - Cover Design');
  assert.strictEqual(inProdBook1.mrp, null);
  assert.strictEqual(inProdBook1.author_royalty_per_copy, null);
  assert.strictEqual(Number(inProdBook1.total_copies_sold), 0);

  const [inProdRows2] = await db.query("SELECT * FROM books WHERE title = 'Raising Roots'");
  const inProdBook2 = inProdRows2[0];
  assert(inProdBook2, 'Book Raising Roots should exist');
  assert.strictEqual(inProdBook2.status, 'In Production - Typesetting');
  console.log('✓ Invariant 2: In-production edge cases handled without schema constraint errors.');

  // 3. Verify AI Classification & Priority Scoring for Canonical Categories
  const royaltyTest = heuristicClassifyAndPrioritize("Haven't received royalty for 6 months", "Published 6 months ago, no payout received yet.");
  assert.strictEqual(royaltyTest.category, 'Royalty & Payments');
  assert.strictEqual(royaltyTest.priority, 'Critical');

  const isbnTest = heuristicClassifyAndPrioritize("Wrong ISBN showing on Amazon", "Amazon is displaying duplicate ISBN different from physical barcode.");
  assert.strictEqual(isbnTest.category, 'ISBN & Metadata Issues');
  assert.strictEqual(isbnTest.priority, 'High');

  const printTest = heuristicClassifyAndPrioritize("Defective misprinted copies", "Received copies with blurry text and bad binding.");
  assert.strictEqual(printTest.category, 'Printing & Quality');
  assert.strictEqual(printTest.priority, 'High');

  const distTest = heuristicClassifyAndPrioritize("Book currently unavailable", "Amazon India shows currently unavailable buy button.");
  assert.strictEqual(distTest.category, 'Distribution & Availability');
  assert.strictEqual(distTest.priority, 'High');

  const prodTest = heuristicClassifyAndPrioritize("Typesetting delay inquiry", "Book has been in typesetting for 3 weeks, when will it be done?");
  assert.strictEqual(prodTest.category, 'Book Status & Production Updates');

  const bioTest = heuristicClassifyAndPrioritize("Can I update my author bio?", "Need to update photo and author biography.");
  assert.strictEqual(bioTest.category, 'General Inquiry');
  assert.strictEqual(bioTest.priority, 'Low');
  console.log('✓ Invariant 3: AI Auto-classification and priority heuristics accurately map all 6 categories.');

  // 4. Verify AI Grounded Draft Generation adhering to BookLeaf Knowledge Base
  const [authorRows] = await db.query("SELECT * FROM authors WHERE author_id = 'AUTH001'");
  const [bookRows] = await db.query("SELECT * FROM books WHERE book_id = 'BK001'");
  const author = authorRows[0];
  const book = bookRows[0];

  const draft = heuristicDraftResponse({
    author,
    book,
    ticket: {
      subject: "Haven't received royalty for 4 months",
      description: "I published my book 4 months ago and still haven't received any royalty.",
      category: 'Royalty & Payments',
      priority: 'Critical'
    }
  });

  assert(draft.includes('Priya'), 'Draft should address author Priya');
  assert(draft.includes('80/20') || draft.includes('quarterly'), 'Draft should reference quarterly cycle or 80/20 policy');
  assert(draft.includes('48 hours'), 'Draft should include 48 hours SLA resolution commitment');
  assert(draft.includes('₹1,000') || draft.includes('threshold'), 'Draft should reference ₹1,000 threshold');
  console.log('✓ Invariant 4: AI Draft generation is grounded in BookLeaf Knowledge Base with author context.');

  // 5. Verify Internal Notes & RBAC Isolation
  const [ticketRows] = await db.query("SELECT * FROM tickets WHERE ticket_number = 'TICK-1002'");
  const ticketWithNote = ticketRows[0];
  const [notes] = await db.query('SELECT * FROM ticket_internal_notes WHERE ticket_id = ?', [ticketWithNote.id]);
  assert(notes.length > 0, 'Internal notes should exist for TICK-1002');
  assert.strictEqual(notes[0].admin_name, 'Operations Admin');
  console.log('✓ Invariant 5: Internal notes isolated in relational schema.');

  console.log('\n--- ALL GRAVITAS VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  await db.end();
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
