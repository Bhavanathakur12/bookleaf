import dotenv from 'dotenv';
dotenv.config();
import { classifyAndScoreTicket, generateAiDraftResponse } from '../src/ai/aiService.js';

async function smokeTest() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.log('RESULT: NO_KEY_IN_ENV');
    return;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  console.log(`[Smoke Test] Target model: ${model}`);

  // Test 1: Direct endpoint connectivity
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with valid JSON: {"status": "ok"}' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal: AbortSignal.timeout(15000)
    });

    console.log(`[Smoke Test 1] Direct generateContent HTTP Status: ${res.status} (${res.statusText})`);
    const data = await res.json().catch(() => null);
    if (res.ok) {
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log('[Smoke Test 1] Direct generateContent Call Succeeded: true');
      console.log('[Smoke Test 1] Output snippet:', text?.trim()?.substring(0, 100));
    } else {
      console.log('[Smoke Test 1] Direct generateContent Call Succeeded: false');
      console.log('[Smoke Test 1] Safe Error Message:', data?.error?.message || 'Unknown error');
    }
  } catch (err) {
    console.log('[Smoke Test 1] Direct generateContent Call Succeeded: false');
    console.log('[Smoke Test 1] Exception:', err.message);
  }

  // Test 2: classifyAndScoreTicket live API integration
  try {
    console.log('[Smoke Test 2] Executing classifyAndScoreTicket() with live Gemini API...');
    const classification = await classifyAndScoreTicket({
      subject: 'Barcode ISBN mismatch on Flipkart',
      description: 'The physical copy ISBN does not match Flipkart catalog listing.',
      author: { name: 'Priya Sharma' },
      book: { title: 'Whispers of the Ganges', status: 'Published' }
    });
    console.log(`[Smoke Test 2] classifyAndScoreTicket Succeeded: true`);
    console.log(`[Smoke Test 2] Category: "${classification.category}", Priority: "${classification.priority}"`);
    console.log(`[Smoke Test 2] Reason: "${classification.reason}"`);
  } catch (err) {
    console.log(`[Smoke Test 2] classifyAndScoreTicket Exception:`, err.message);
  }

  // Test 3: generateAiDraftResponse live API integration
  try {
    console.log('[Smoke Test 3] Executing generateAiDraftResponse() with live Gemini API...');
    const draft = await generateAiDraftResponse({
      author: { name: 'Priya Sharma', email: 'priya@email.com' },
      book: { title: 'Whispers of the Ganges', status: 'Published', isbn: '978-93-12345-67-8' },
      ticket: {
        ticket_number: 'TICK-1099',
        category: 'ISBN & Metadata Issues',
        priority: 'High',
        subject: 'Barcode ISBN mismatch on Flipkart',
        description: 'The physical copy ISBN does not match Flipkart catalog listing.'
      }
    });
    console.log(`[Smoke Test 3] generateAiDraftResponse Succeeded: true`);
    console.log(`[Smoke Test 3] Draft length: ${draft.length} chars`);
    console.log(`[Smoke Test 3] Preview snippet:\n${draft.substring(0, 200)}...`);
  } catch (err) {
    console.log(`[Smoke Test 3] generateAiDraftResponse Exception:`, err.message);
  }

  console.log('\n--- REAL API SMOKE TEST COMPLETED ---');
}

smokeTest();

