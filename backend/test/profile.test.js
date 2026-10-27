import assert from 'assert';
import db from '../src/db/db.js';

const BASE_URL = process.env.TEST_API_URL || 'http://127.0.0.1:4000';

console.log('--- RUNNING USER PROFILE & AVATAR POPUP VERIFICATION SUITE ---');

// Helper function that mirrors the single-initial derivation logic in Navbar.jsx
function computeUserInitial(name) {
  return (name?.trim()?.[0] || 'U').toUpperCase();
}

// Helper function that mirrors the display role formatting in Navbar.jsx
function computeDisplayRole(role) {
  return role === 'admin' ? 'Admin' : 'Author';
}

async function runProfileTests() {
  // 1. Test Initial Extraction Algorithm & Invariants
  assert.strictEqual(computeUserInitial('Priya Sharma'), 'P');
  assert.strictEqual(computeUserInitial('Aarav Mehta'), 'A');
  assert.strictEqual(computeUserInitial('  sneha kapoor  '), 'S');
  assert.strictEqual(computeUserInitial('Operations Admin'), 'O');
  assert.strictEqual(computeUserInitial('Editorial Admin'), 'E');
  assert.strictEqual(computeUserInitial(''), 'U');
  assert.strictEqual(computeUserInitial(null), 'U');
  assert.strictEqual(computeUserInitial(undefined), 'U');

  // Verify exactly 1 character is produced
  ['Priya Sharma', 'Operations Admin', 'Vikram Seth', 'Dr. APJ'].forEach((name) => {
    const initial = computeUserInitial(name);
    assert.strictEqual(initial.length, 1, `Initial for ${name} must be exactly 1 character`);
    assert.strictEqual(initial, initial.toUpperCase(), `Initial for ${name} must be uppercase`);
  });
  console.log('✓ Invariant 1: Single-letter uppercase initial derivation verified for authors and admins.');

  // 2. Test Role Label Mapping
  assert.strictEqual(computeDisplayRole('admin'), 'Admin');
  assert.strictEqual(computeDisplayRole('author'), 'Author');
  assert.strictEqual(computeDisplayRole(undefined), 'Author');
  console.log('✓ Invariant 2: Role normalization accurately distinguishes Author and Admin.');

  // 3. Test Author Authentication & Profile Payload
  const authorLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya.sharma@email.com', password: 'author123' })
  });
  assert.strictEqual(authorLoginRes.status, 200);
  const authorData = await authorLoginRes.json();
  const authorToken = authorData.token;

  const authorMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${authorToken}` }
  });
  assert.strictEqual(authorMeRes.status, 200);
  const authorMe = await authorMeRes.json();
  const authorUser = authorMe.user;

  assert.strictEqual(authorUser.name, 'Priya Sharma');
  assert.strictEqual(authorUser.email, 'priya.sharma@email.com');
  assert.strictEqual(authorUser.role, 'author');
  assert.strictEqual(computeUserInitial(authorUser.name), 'P');
  assert.strictEqual(computeDisplayRole(authorUser.role), 'Author');
  console.log('✓ Invariant 3: Live Author profile payload validated (Priya Sharma → initial "P", role "Author").');

  // 4. Test Admin Authentication & Profile Payload
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@bookleafpublishing.com', password: 'admin123' })
  });
  assert.strictEqual(adminLoginRes.status, 200);
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;

  const adminMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminMeRes.status, 200);
  const adminMe = await adminMeRes.json();
  const adminUser = adminMe.user;

  assert.strictEqual(adminUser.name, 'Operations Admin');
  assert.strictEqual(adminUser.email, 'admin@bookleafpublishing.com');
  assert.strictEqual(adminUser.role, 'admin');
  assert.strictEqual(computeUserInitial(adminUser.name), 'O');
  assert.strictEqual(computeDisplayRole(adminUser.role), 'Admin');
  console.log('✓ Invariant 4: Live Admin profile payload validated (Operations Admin → initial "O", role "Admin").');

  // 5. Verify User Data Isolation in Database
  const [userRows] = await db.query('SELECT name, email, role FROM users ORDER BY role, name');
  assert(userRows.length >= 12, 'Expected 10 authors and 2 admins in users table');
  for (const u of userRows) {
    assert(u.name && u.name.trim().length > 0, 'Every user must have a non-empty name');
    assert(u.email && u.email.includes('@'), 'Every user must have a valid email');
    assert(['author', 'admin'].includes(u.role), 'Role must be strictly author or admin');
  }
  console.log('✓ Invariant 5: Database user entities validated across all author and admin records.');

  console.log('\n--- ALL PROFILE & POPUP VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  await db.end();
}

runProfileTests().catch((err) => {
  console.error('Profile test failure:', err);
  process.exit(1);
});
