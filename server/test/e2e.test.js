import assert from 'assert';

const BASE_URL = 'http://localhost:4000';

async function runEndToEndTests() {
  console.log('--- STARTING COMPREHENSIVE END-TO-END HTTP INTEGRATION TEST ---');

  // 1. Healthcheck
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  assert.strictEqual(health.status, 'ok');
  assert.strictEqual(health.database, 'connected');
  console.log('✓ [1/14] Health check passed.');

  // 2. Demo accounts
  const demoRes = await fetch(`${BASE_URL}/api/auth/demo-accounts`);
  const demo = await demoRes.json();
  assert.strictEqual(demo.authors.length, 10);
  assert.strictEqual(demo.admins.length, 2);
  console.log('✓ [2/14] Demo accounts endpoint returned all 10 authors and 2 admins.');

  // 3. Author Login (Priya Sharma)
  const authorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya.sharma@email.com', password: 'author123' })
  });
  const authorAuth = await authorLoginRes.json();
  assert(authorAuth.token, 'Token should be returned');
  assert.strictEqual(authorAuth.user.role, 'author');
  assert.strictEqual(authorAuth.user.author_id, 'AUTH001');
  const authorToken = authorAuth.token;
  console.log('✓ [3/14] Author authentication successful.');

  // 4. Fetch Author Books
  const booksRes = await fetch(`${BASE_URL}/api/author/books`, {
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  const booksData = await booksRes.json();
  assert.strictEqual(booksData.books.length, 2);
  assert.strictEqual(booksData.summary.total_copies_sold, 342 + 189);
  assert.strictEqual(booksData.summary.total_royalty_earned, 11970 + 7938);
  console.log('✓ [4/14] Author books and royalty summary calculations verified.');

  // 5. Submit New Support Ticket
  const createTicketRes = await fetch(`${BASE_URL}/api/author/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`
    },
    body: JSON.stringify({
      book_id: 'BK001',
      subject: 'Urgent: Missing Q3 royalty payout remittance',
      description: 'I published Whispers of the Ganges and have not received any royalty payout for 4 months. Please investigate immediately.'
    })
  });
  const newTicketData = await createTicketRes.json();
  const newTicket = newTicketData.ticket;
  assert(newTicket.ticket_number.startsWith('TICK-'), 'Ticket number generated');
  assert.strictEqual(newTicket.category, 'Royalty & Payments', 'AI auto-classification should identify Royalty & Payments');
  assert.strictEqual(newTicket.priority, 'Critical', 'AI priority scoring should flag overdue royalty as Critical');
  assert(newTicket.ai_draft_response.length > 50, 'AI pre-drafted response should be generated');
  console.log(`✓ [5/14] Ticket ${newTicket.ticket_number} created with AI classification (${newTicket.category}) and Priority (${newTicket.priority}).`);

  // 6. Verify Ticket in Author Tickets List
  const authorTicketsRes = await fetch(`${BASE_URL}/api/author/tickets`, {
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  const authorTickets = await authorTicketsRes.json();
  const createdInList = authorTickets.tickets.find((t) => t.id === newTicket.id);
  assert(createdInList, 'Created ticket should appear in author list');
  console.log('✓ [6/14] Author tickets list correctly contains newly submitted query.');

  // 7. Author Adds Follow-up Message
  const authorMsgRes = await fetch(`${BASE_URL}/api/author/tickets/${newTicket.id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorToken}`
    },
    body: JSON.stringify({
      message: 'Attached my bank passbook details for confirmation.'
    })
  });
  const authorMsgData = await authorMsgRes.json();
  assert.strictEqual(authorMsgData.newMessage.sender_type, 'author');
  console.log('✓ [7/14] Author follow-up message added to conversation thread.');

  // 8. Admin Login
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bookleafpublishing.com', password: 'admin123' })
  });
  const adminAuth = await adminLoginRes.json();
  assert(adminAuth.token, 'Admin token returned');
  assert.strictEqual(adminAuth.user.role, 'admin');
  const adminToken = adminAuth.token;
  console.log('✓ [8/14] Operations Admin authentication successful.');

  // 9. Admin Queue & Metrics
  const adminStatsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminStats = await adminStatsRes.json();
  assert(adminStats.metrics.total >= 8);
  assert(adminStats.metrics.critical >= 1);
  assert(adminStats.oldestUnresolved !== null);
  console.log(`✓ [9/14] Admin queue metrics verified (Total: ${adminStats.metrics.total}, Critical: ${adminStats.metrics.critical}).`);

  // 10. Admin Overrides AI Priority
  const overridePriRes = await fetch(`${BASE_URL}/api/admin/tickets/${newTicket.id}/priority`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ priority: 'High' })
  });
  const priData = await overridePriRes.json();
  assert.strictEqual(priData.priority, 'High');
  console.log('✓ [10/14] Admin priority override validated.');

  // 11. Admin Adds Confidential Internal Note
  const noteRes = await fetch(`${BASE_URL}/api/admin/tickets/${newTicket.id}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ note: 'Checked with HDFC gateway: batch payout scheduled for Friday.' })
  });
  const noteData = await noteRes.json();
  assert.strictEqual(noteData.note.admin_name, 'Operations Admin');
  console.log('✓ [11/14] Internal note recorded in database.');

  // 12. Admin Sends Official Response to Author
  const replyRes = await fetch(`${BASE_URL}/api/admin/tickets/${newTicket.id}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      message: 'Dear Priya, we have audited your account and validated your pending royalty of ₹3,570. The transfer will be completed within 48 hours.',
      status: 'In Progress'
    })
  });
  const replyData = await replyRes.json();
  assert.strictEqual(replyData.status, 'In Progress');
  assert.strictEqual(replyData.newMessage.sender_type, 'admin');
  console.log('✓ [12/14] Admin official response dispatched and status transitioned to In Progress.');

  // 13. Author Reads Thread: Verify Admin Reply is Visible AND Internal Notes are ISOLATED
  const threadRes = await fetch(`${BASE_URL}/api/author/tickets/${newTicket.id}`, {
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  const threadData = await threadRes.json();
  assert.strictEqual(threadData.ticket.status, 'In Progress');
  assert(threadData.messages.some((m) => m.sender_type === 'admin'), 'Author must see admin message');
  assert.strictEqual(threadData.notes, undefined, 'RBAC Security: Internal notes MUST NEVER be returned to author!');
  console.log('✓ [13/14] RBAC security verified: Author sees admin reply, internal notes strictly omitted.');

  // 14. RBAC Access Denial: Author attempting to call Admin endpoint
  const unauthorizedAdminCall = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  assert.strictEqual(unauthorizedAdminCall.status, 403, 'Author must receive 403 Forbidden on admin endpoint');
  console.log('✓ [14/14] RBAC enforcement verified: Author blocked from admin route with 403 Forbidden.');

  console.log('\n=============================================================');
  console.log('ALL 14 END-TO-END HTTP INTEGRATION TEST SCENARIOS PASSED 100%!');
  console.log('=============================================================\n');
}

runEndToEndTests().catch((err) => {
  console.error('E2E TEST FAILURE:', err);
  process.exit(1);
});
