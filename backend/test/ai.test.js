import assert from 'assert';
import { heuristicClassifyAndPrioritize, heuristicDraftResponse } from '../src/ai/aiService.js';

console.log('--- RUNNING AI SERVICE UNIT & FALLBACK TEST SUITE ---');

// 1. Test canonical category heuristic mappings across all 6 PDF categories
const cat1 = heuristicClassifyAndPrioritize("Haven't received royalty", "Overdue for 4 months");
assert.strictEqual(cat1.category, 'Royalty & Payments');
assert.strictEqual(cat1.priority, 'Critical');

const cat2 = heuristicClassifyAndPrioritize("Barcode ISBN mismatch", "Physical copy has different ISBN from Amazon");
assert.strictEqual(cat2.category, 'ISBN & Metadata Issues');
assert.strictEqual(cat2.priority, 'High');

const cat3 = heuristicClassifyAndPrioritize("Blurry misprinted pages", "Author copies arrived with binding and print defect");
assert.strictEqual(cat3.category, 'Printing & Quality');
assert.strictEqual(cat3.priority, 'High');

const cat4 = heuristicClassifyAndPrioritize("Currently Unavailable", "Amazon India shows currently unavailable buy box");
assert.strictEqual(cat4.category, 'Distribution & Availability');
assert.strictEqual(cat4.priority, 'High');

const cat5 = heuristicClassifyAndPrioritize("Typesetting timeline", "Still in typesetting for 3 weeks");
assert.strictEqual(cat5.category, 'Book Status & Production Updates');

const cat6 = heuristicClassifyAndPrioritize("Author biography update", "Can I update my bio and photo?");
assert.strictEqual(cat6.category, 'General Inquiry');
assert.strictEqual(cat6.priority, 'Low');

console.log('✓ All 6 canonical categories and priorities accurately mapped in fallback engine.');

// 2. Test Knowledge Base draft grounding with author context
const draft = heuristicDraftResponse({
  author: { name: 'Priya Sharma' },
  book: { title: 'Whispers of the Ganges', status: 'Published' },
  ticket: {
    subject: 'Overdue royalty',
    description: '4 months no payment',
    category: 'Royalty & Payments',
    priority: 'Critical'
  }
});

assert(draft.includes('Priya'), 'Draft must address author by name');
assert(draft.includes('quarterly') || draft.includes('80/20'), 'Draft must cite official royalty policy');
assert(draft.includes('48 hours'), 'Draft must offer specific resolution timeline');
assert(draft.includes('₹1,000') || draft.includes('threshold'), 'Draft must cite payout threshold');
console.log('✓ Knowledge Base grounded draft generation verified.');

// 3. Test handling of malformed and out-of-spec model output simulation
const VALID_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
];
const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

function validateModelClassification(parsed, fallbackSubject, fallbackDescription) {
  if (parsed && VALID_CATEGORIES.includes(parsed.category) && VALID_PRIORITIES.includes(parsed.priority)) {
    return parsed;
  }
  return heuristicClassifyAndPrioritize(fallbackSubject, fallbackDescription);
}

// Case A: Valid model output passes validation
const validOutput = validateModelClassification(
  { category: 'Royalty & Payments', priority: 'Critical', reason: 'Overdue payout' },
  'Sample',
  'Sample'
);
assert.strictEqual(validOutput.category, 'Royalty & Payments');
assert.strictEqual(validOutput.priority, 'Critical');

// Case B: Model returns invalid category (hallucination) -> recovers with heuristic
const invalidCatOutput = validateModelClassification(
  { category: 'Billing & Invoices', priority: 'Critical' },
  "Haven't received royalty",
  'Overdue for 4 months'
);
assert.strictEqual(invalidCatOutput.category, 'Royalty & Payments');
assert(VALID_CATEGORIES.includes(invalidCatOutput.category));

// Case C: Model returns invalid priority (e.g. Urgent/P1 instead of Critical/High) -> recovers with heuristic
const invalidPriOutput = validateModelClassification(
  { category: 'General Inquiry', priority: 'Urgent' },
  'Author biography update',
  'Can I update my bio and photo?'
);
assert.strictEqual(invalidPriOutput.priority, 'Low');
assert(VALID_PRIORITIES.includes(invalidPriOutput.priority));

// Case D: Empty or null model output -> recovers with heuristic
const nullOutput = validateModelClassification(
  null,
  'Typesetting timeline',
  'Still in typesetting for 3 weeks'
);
assert.strictEqual(nullOutput.category, 'Book Status & Production Updates');

console.log('✓ Malformed & hallucinated model response recovery verified.');

// 4. Test classifyAndScoreTicket and generateAiDraftResponse with mocked Gemini responses and fallbacks
import { classifyAndScoreTicket, generateAiDraftResponse } from '../src/ai/aiService.js';

const originalFetch = global.fetch;
const originalKey = process.env.GEMINI_API_KEY;

try {
  // Scenario 4A: Gemini API returns valid JSON classification
  process.env.GEMINI_API_KEY = 'mock-key-for-unit-test';
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              category: 'ISBN & Metadata Issues',
              priority: 'High',
              reason: 'Mocked Gemini response: ISBN mismatch between physical and online store'
            })
          }]
        }
      }]
    })
  });

  const geminiClassifyResult = await classifyAndScoreTicket({
    subject: 'ISBN mismatch on Amazon',
    description: 'The physical copy ISBN does not match Amazon listing',
    author: { name: 'Priya Sharma' },
    book: { title: 'Whispers of the Ganges' }
  });

  assert.strictEqual(geminiClassifyResult.category, 'ISBN & Metadata Issues');
  assert.strictEqual(geminiClassifyResult.priority, 'High');
  assert(geminiClassifyResult.reason.includes('Mocked Gemini response'));
  console.log('✓ classifyAndScoreTicket(): Successfully parses and validates Gemini API response.');

  // Scenario 4B: Gemini API returns HTTP 503 error -> falls back to heuristic safely
  global.fetch = async () => ({
    ok: false,
    status: 503,
    statusText: 'Service Unavailable',
    json: async () => ({ error: { message: 'High demand spike' } })
  });

  const fallbackClassifyResult = await classifyAndScoreTicket({
    subject: "Haven't received royalty for 6 months",
    description: 'Overdue payment for 6 months',
    author: { name: 'Priya Sharma' },
    book: { title: 'Whispers of the Ganges' }
  });

  assert.strictEqual(fallbackClassifyResult.category, 'Royalty & Payments');
  assert.strictEqual(fallbackClassifyResult.priority, 'Critical');
  console.log('✓ classifyAndScoreTicket(): Safely handles Gemini HTTP 503 with heuristic fallback.');

  // Scenario 4C: Gemini API returns invalid/hallucinated category -> falls back to heuristic safely
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              category: 'NonExistentCategory',
              priority: 'Critical',
              reason: 'Hallucination'
            })
          }]
        }
      }]
    })
  });

  const invalidCatResult = await classifyAndScoreTicket({
    subject: 'Defective misprinted pages',
    description: 'Blurry printing and binding defect',
    author: { name: 'Priya Sharma' },
    book: { title: 'Whispers of the Ganges' }
  });

  assert.strictEqual(invalidCatResult.category, 'Printing & Quality');
  assert.strictEqual(invalidCatResult.priority, 'High');
  console.log('✓ classifyAndScoreTicket(): Safely catches hallucinated category and falls back to heuristic.');

  // Scenario 4D: Gemini API returns valid draft response
  const mockAiDraft = 'Dear Priya,\n\nWe apologize for the ISBN discrepancy. Our production team is updating the Amazon catalog within 48 hours.\n\nWarm regards,\nBookLeaf Support';
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{ text: mockAiDraft }]
        }
      }]
    })
  });

  const draftResult = await generateAiDraftResponse({
    author: { name: 'Priya Sharma' },
    book: { title: 'Whispers of the Ganges' },
    ticket: {
      ticket_number: 'TICK-9999',
      category: 'ISBN & Metadata Issues',
      priority: 'High',
      subject: 'ISBN mismatch',
      description: 'Physical ISBN does not match Amazon'
    }
  });

  assert.strictEqual(draftResult, mockAiDraft);
  console.log('✓ generateAiDraftResponse(): Successfully returns Gemini draft response.');

  // Scenario 4E: Gemini API returns empty or short draft -> falls back to grounded heuristic
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{ text: 'Too short' }]
        }
      }]
    })
  });

  const shortDraftResult = await generateAiDraftResponse({
    author: { name: 'Priya Sharma' },
    book: { title: 'Whispers of the Ganges' },
    ticket: {
      ticket_number: 'TICK-9999',
      category: 'Royalty & Payments',
      priority: 'Critical',
      subject: 'Overdue royalty',
      description: '4 months no payment'
    }
  });

  assert(shortDraftResult.length >= 50, 'Draft should be grounded fallback draft');
  assert(shortDraftResult.includes('Priya'));
  console.log('✓ generateAiDraftResponse(): Safely falls back to grounded heuristic when draft is too short.');

  // Scenario 4F: Missing API key -> immediate fallback without calling fetch
  delete process.env.GEMINI_API_KEY;
  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    throw new Error('Fetch should not be called when GEMINI_API_KEY is not set');
  };

  const noKeyClassify = await classifyAndScoreTicket({
    subject: 'Book currently unavailable on Amazon',
    description: 'Out of stock on Amazon India',
    author: { name: 'Priya Sharma' },
    book: { title: 'Whispers of the Ganges' }
  });
  assert.strictEqual(fetchCalled, false, 'Fetch must not be called when API key is missing');
  assert.strictEqual(noKeyClassify.category, 'Distribution & Availability');
  assert.strictEqual(noKeyClassify.priority, 'High');

  const noKeyDraft = await generateAiDraftResponse({
    author: { name: 'Priya Sharma' },
    book: { title: 'Whispers of the Ganges' },
    ticket: {
      ticket_number: 'TICK-8888',
      category: 'Distribution & Availability',
      priority: 'High',
      subject: 'Unavailable',
      description: 'Out of stock'
    }
  });
  assert.strictEqual(fetchCalled, false, 'Fetch must not be called when API key is missing');
  assert(noKeyDraft.includes('Amazon') || noKeyDraft.includes('Priya'));
  console.log('✓ Both functions execute heuristic fallback immediately when API key is missing.');

} finally {
  global.fetch = originalFetch;
  if (originalKey !== undefined) {
    process.env.GEMINI_API_KEY = originalKey;
  } else {
    delete process.env.GEMINI_API_KEY;
  }
}

console.log('\n--- ALL AI TESTS PASSED SUCCESSFULLY! ---');

