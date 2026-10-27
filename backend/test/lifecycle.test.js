import assert from 'assert';
import db from '../src/db/db.js';

const BASE_URL = 'http://localhost:4000';

console.log('--- RUNNING TICKET LIFECYCLE & PENDING-RESPONSE WORKFLOW TEST SUITE ---');

async function runLifecycleTests() {
  // 1. Author login (Priya Sharma)
  const authorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya.sharma@email.com', password: 'author123' })
  });
  assert.strictEqual(authorLoginRes.status, 200);
  const { token: authorToken, user: authorUser } = await authorLoginRes.json();

  // 2. Admin login (Operations Admin)
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bookleafpublishing.com', password: 'admin123' })
  });
  assert.strictEqual(adminLoginRes.status, 200);
  const { token: adminToken } = await adminLoginRes.json();

  // 3. Record baseline stats
  const baselineStatsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const baselineStats = await baselineStatsRes.json();
  const initialTotal = baselineStats.metrics.total;
  const initialUnresolved = baselineStats.metrics.unresolved;

  // 4. Submit Ticket 1: Verify Initial Open / Pending Status & Draft Isolation
  const createTicketRes = await fetch(`${BASE_URL}/api/author/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`
    },
    body: JSON.stringify({
      book_id: 'BK001',
      subject: 'Lifecycle Audit: Royalties inquiry verification',
      description: 'Audit test query to inspect pending lifecycle and official admin response workflows.'
    })
  });
  assert.strictEqual(createTicketRes.status, 201);
  const { ticket: newTicket } = await createTicketRes.json();
  const ticketId = newTicket.id;

  assert(newTicket.ticket_number.startsWith('TICK-'), 'Ticket number must follow format TICK-xxxx');
  assert.strictEqual(newTicket.status, 'Open', 'Newly created ticket status must strictly be Open (pending response)');
  assert.strictEqual(newTicket.author_id, authorUser.author_id);
  assert(newTicket.ai_draft_response && newTicket.ai_draft_response.length >= 20, 'AI pre-drafted response must be generated');
  console.log(`✓ [Step 1] New ticket ${newTicket.ticket_number} created with pending status 'Open'.`);

  // 5. Verify AI Draft is NOT sent to author as a message
  const authorThreadRes = await fetch(`${BASE_URL}/api/author/tickets/${ticketId}`, {
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  assert.strictEqual(authorThreadRes.status, 200);
  const authorThread = await authorThreadRes.json();

  assert.strictEqual(authorThread.messages.length, 1, 'Only original author query must exist in thread');
  assert.strictEqual(authorThread.messages[0].sender_type, 'author');
  assert.strictEqual(authorThread.ticket.ai_draft_response, undefined, 'ai_draft_response must NEVER be exposed to author');
  assert.strictEqual(authorThread.notes, undefined, 'Internal notes must NEVER be exposed to author');
  console.log('✓ [Step 2] AI response draft confirmed as draft-only; not sent to author automatically.');

  // 6. Verify Admin Queue Visibility & Pending Filter
  const adminQueueRes = await fetch(`${BASE_URL}/api/admin/tickets?status=Pending`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminQueueRes.status, 200);
  const pendingQueue = await adminQueueRes.json();
  const foundInPending = pendingQueue.tickets.some((t) => t.id === ticketId);
  assert.strictEqual(foundInPending, true, 'Ticket must appear in Admin Pending / Unresolved backlog');

  const updatedStatsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const updatedStats = await updatedStatsRes.json();
  assert.strictEqual(updatedStats.metrics.total, initialTotal + 1, 'Total tickets count must increment by 1');
  assert.strictEqual(updatedStats.metrics.unresolved, initialUnresolved + 1, 'Unresolved backlog must increment by 1');
  console.log('✓ [Step 3] Admin queue visibility and pending metrics increment validated.');

  // 7. Verify Confidential Internal Note Isolation
  const addNoteRes = await fetch(`${BASE_URL}/api/admin/tickets/${ticketId}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ note: 'Confidential QA verification note - must remain strictly admin-only.' })
  });
  assert.strictEqual(addNoteRes.status, 201);

  // Verify author STILL cannot see internal notes
  const recheckAuthorThread = await fetch(`${BASE_URL}/api/author/tickets/${ticketId}`, {
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  const recheckThreadData = await recheckAuthorThread.json();
  assert.strictEqual(recheckThreadData.notes, undefined, 'Internal notes MUST remain completely hidden from authors');
  console.log('✓ [Step 4] Internal note isolation strictly verified against Author ticket inspection.');

  // 8. Admin Reviews and Explicitly Sends Official Reply
  const replyMessageText = 'Dear Priya, this is the official response reviewed and approved by BookLeaf Support.';
  const sendReplyRes = await fetch(`${BASE_URL}/api/admin/tickets/${ticketId}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      message: replyMessageText,
      status: 'Resolved'
    })
  });
  assert.strictEqual(sendReplyRes.status, 201);
  const replyResult = await sendReplyRes.json();
  assert.strictEqual(replyResult.status, 'Resolved');
  assert.strictEqual(replyResult.newMessage.sender_type, 'admin');

  // Verify message persisted in MySQL
  const [[{ count: adminMsgCount }]] = await db.query(
    "SELECT COUNT(*) as count FROM ticket_messages WHERE ticket_id = ? AND sender_type = 'admin'",
    [ticketId]
  );
  assert.strictEqual(Number(adminMsgCount), 1, 'Official reply must be persisted in ticket_messages table in MySQL');

  // Verify message is now visible to author
  const authorViewAfterReply = await fetch(`${BASE_URL}/api/author/tickets/${ticketId}`, {
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  const authorViewData = await authorViewAfterReply.json();
  assert.strictEqual(authorViewData.ticket.status, 'Resolved');
  assert.strictEqual(authorViewData.messages.length, 2);
  assert.strictEqual(authorViewData.messages[1].message, replyMessageText);
  assert.strictEqual(authorViewData.messages[1].sender_type, 'admin');
  console.log('✓ [Step 5] Admin official reply persisted in MySQL and visible in Author thread.');

  // 9. Author Follow-Up Message & Automatic Re-Open
  const followUpText = 'Thank you for the quick resolution! I have one minor follow-up.';
  const followUpRes = await fetch(`${BASE_URL}/api/author/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`
    },
    body: JSON.stringify({ message: followUpText })
  });
  assert.strictEqual(followUpRes.status, 201);
  const followUpData = await followUpRes.json();
  assert.strictEqual(followUpData.ticketStatus, 'In Progress', 'Author follow-up on resolved ticket must re-open to In Progress');

  const [dbTicketRows] = await db.query('SELECT status FROM tickets WHERE id = ?', [ticketId]);
  assert.strictEqual(dbTicketRows[0].status, 'In Progress', 'MySQL database status must reflect In Progress');
  console.log('✓ [Step 6] Author follow-up message transitions ticket from Resolved back to In Progress.');

  // 10. Multi-Ticket Sequential Collision-Proof Generation
  const secondTicketRes = await fetch(`${BASE_URL}/api/author/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`
    },
    body: JSON.stringify({
      book_id: 'BK002',
      subject: 'Second inquiry from same author',
      description: 'Verifying multiple ticket persistence and ID isolation for author.'
    })
  });
  assert.strictEqual(secondTicketRes.status, 201);
  const { ticket: secondTicket } = await secondTicketRes.json();
  assert.notStrictEqual(secondTicket.id, newTicket.id);
  assert.notStrictEqual(secondTicket.ticket_number, newTicket.ticket_number);

  const num1 = parseInt(newTicket.ticket_number.replace('TICK-', ''), 10);
  const num2 = parseInt(secondTicket.ticket_number.replace('TICK-', ''), 10);
  assert.strictEqual(num2, num1 + 1, 'Ticket numbers must be strictly sequential without collision');
  console.log(`✓ [Step 7] Multiple tickets created per author (${newTicket.ticket_number} and ${secondTicket.ticket_number}) with collision-proof IDs.`);

  console.log('\n--- ALL TICKET LIFECYCLE & PENDING WORKFLOW TESTS PASSED 100%! ---');
  await db.end();
}

runLifecycleTests().catch((err) => {
  console.error('Lifecycle test failure:', err);
  process.exit(1);
});
