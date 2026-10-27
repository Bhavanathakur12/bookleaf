import assert from 'assert';
import { heuristicClassifyAndPrioritize, heuristicDraftResponse } from '../src/ai/aiService.js';

console.log('--- RUNNING 7 CORE ASSIGNMENT SCENARIOS TEST SUITE (PDF Pages 6-7) ---');

const SCENARIOS = [
  {
    id: 'A',
    name: 'Royalty Delay',
    subject: 'Delayed royalties payout',
    description: "I published my book 4 months ago and still haven't received any royalty.",
    expectedCategory: 'Royalty & Payments',
    expectedPriority: 'Critical',
    requiredKeyPhrases: ['quarterly', '45 days', '1,000'],
    author: { name: 'Priya Sharma', email: 'priya.sharma@email.com' },
    book: { title: 'Whispers of the Ganges', status: 'Published', total_royalty_earned: 3500, royalty_pending: 3500 }
  },
  {
    id: 'B',
    name: 'Royalty Calculation',
    subject: 'Explain royalty calculation',
    description: 'I sold 200 copies but received only ₹3,000. Please explain my royalty calculation.',
    expectedCategory: 'Royalty & Payments',
    expectedPriority: 'High',
    requiredKeyPhrases: ['80/20', 'Net Profit', 'Printing Cost', 'Platform Commission'],
    author: { name: 'Aarav Mehta', email: 'aarav.mehta@email.com' },
    book: { title: 'Beyond the Horizon', status: 'Published', total_copies_sold: 200, total_royalty_earned: 3000 }
  },
  {
    id: 'C',
    name: 'ISBN Mismatch',
    subject: 'ISBN mismatch on Amazon listing',
    description: 'The ISBN on Amazon does not match the ISBN on my physical book.',
    expectedCategory: 'ISBN & Metadata Issues',
    expectedPriority: 'High',
    requiredKeyPhrases: ['ISBN', '48 hours', 'escalated'],
    author: { name: 'Sneha Kapoor', email: 'sneha.kapoor@email.com' },
    book: { title: 'The Silent Melody', status: 'Published', isbn: '978-93-12345-02-1' }
  },
  {
    id: 'D',
    name: 'Printing Quality',
    subject: 'Defective author copies received',
    description: 'My author copies have blurry images and misaligned pages.',
    expectedCategory: 'Printing & Quality',
    expectedPriority: 'High',
    requiredKeyPhrases: ['reprint', 'photographs', '5–7 business days'],
    author: { name: 'Vikram Malhotra', email: 'vikram.malhotra@email.com' },
    book: { title: 'Echoes of Silence', status: 'Published', isbn: '978-93-12345-03-8' }
  },
  {
    id: 'E',
    name: 'Distribution & Availability',
    subject: 'Listing unavailable on Amazon',
    description: 'My published book is showing Currently Unavailable on Amazon.',
    expectedCategory: 'Distribution & Availability',
    expectedPriority: 'High',
    requiredKeyPhrases: ['Currently Unavailable', 'stock sync', '24 to 48 hours'],
    author: { name: 'Ananya Iyer', email: 'ananya.iyer@email.com' },
    book: { title: 'Cryptic Shadows', status: 'Published', isbn: '978-93-12345-05-2' }
  },
  {
    id: 'F',
    name: 'Production Delay',
    subject: 'Typesetting stage timeline update',
    description: 'My book has been in typesetting for 3 weeks. What is the updated timeline?',
    expectedCategory: 'Book Status & Production Updates',
    expectedPriority: 'High',
    requiredKeyPhrases: ['production pipeline', 'Typesetting', 'business days'],
    author: { name: 'Rohan Verma', email: 'rohan.verma@email.com' },
    book: { title: 'Raising Roots', status: 'In Production', isbn: null }
  },
  {
    id: 'G',
    name: 'General Metadata / Description Update',
    subject: 'Update Amazon book description',
    description: 'Can I update my Amazon book description after publication?',
    expectedCategory: 'General Inquiry',
    expectedPriority: 'Low',
    requiredKeyPhrases: ['description', '3 to 5 business days'],
    author: { name: 'Pooja Nair', email: 'pooja.nair@email.com' },
    book: { title: 'Taste of Kerala', status: 'Published', isbn: '978-93-12345-07-6' }
  }
];

function runScenarioTests() {
  for (const s of SCENARIOS) {
    // 1. Classification & Priority
    const classification = heuristicClassifyAndPrioritize(s.subject, s.description);
    assert.strictEqual(
      classification.category,
      s.expectedCategory,
      `Scenario ${s.id} (${s.name}): Expected category "${s.expectedCategory}", got "${classification.category}"`
    );
    assert.strictEqual(
      classification.priority,
      s.expectedPriority,
      `Scenario ${s.id} (${s.name}): Expected priority "${s.expectedPriority}", got "${classification.priority}"`
    );
    assert(classification.reason && classification.reason.length > 10, `Scenario ${s.id}: Reason must be substantive`);

    // 2. Draft Response Grounding
    const draft = heuristicDraftResponse({
      author: s.author,
      book: s.book,
      ticket: {
        ticket_number: `TICK-200${s.id}`,
        category: classification.category,
        priority: classification.priority,
        subject: s.subject,
        description: s.description
      }
    });

    assert(draft && draft.length >= 150, `Scenario ${s.id}: Draft response is too short (${draft?.length} chars)`);
    assert(draft.includes(s.author.name.split(' ')[0]), `Scenario ${s.id}: Draft must address author by name`);

    for (const phrase of s.requiredKeyPhrases) {
      assert(
        draft.toLowerCase().includes(phrase.toLowerCase()),
        `Scenario ${s.id} (${s.name}): Draft must include Knowledge Base phrase "${phrase}".\nDraft snippet: ${draft.substring(0, 200)}...`
      );
    }

    console.log(`✓ Scenario ${s.id} [${s.name}]: Category='${classification.category}', Priority='${classification.priority}', Draft=${draft.length} chars (All required KB facts present)`);
  }

  console.log('\n--- ALL 7 ASSIGNMENT SCENARIOS PASSED WITH 100% KNOWLEDGE BASE COMPLIANCE! ---');
}

runScenarioTests();
