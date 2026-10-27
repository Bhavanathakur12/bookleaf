import dotenv from 'dotenv';
dotenv.config();
import { BOOKLEAF_KNOWLEDGE_BASE } from './knowledgeBase.js';

const VALID_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
];

const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

/**
 * Heuristic Knowledge Base Grounded Classifier & Priority Scorer (Fallback Engine)
 */
export function heuristicClassifyAndPrioritize(subject, description) {
  const combined = `${subject} ${description}`.toLowerCase();

  let category = 'General Inquiry';
  let priority = 'Medium';
  let reason = 'Standard inquiry requiring general review';

  // 1. Royalty & Payments
  if (
    combined.includes('royalt') ||
    combined.includes('payout') ||
    combined.includes('payment') ||
    combined.includes('unpaid') ||
    combined.includes('bank') ||
    combined.includes('threshold') ||
    combined.includes('money') ||
    combined.includes('earnings')
  ) {
    category = 'Royalty & Payments';
    if (
      combined.includes('not received') ||
      combined.includes("haven't received") ||
      combined.includes('overdue') ||
      combined.includes('months') ||
      combined.includes('missing') ||
      combined.includes('never got') ||
      combined.includes('fraud') ||
      combined.includes('urgent')
    ) {
      priority = 'Critical';
      reason = 'Potential overdue royalty payout affecting author compensation SLA';
    } else if (combined.includes('wrong') || combined.includes('discrepancy') || combined.includes('low') || combined.includes('calculation')) {
      priority = 'High';
      reason = 'Royalty calculation discrepancy reported by author';
    } else {
      priority = 'Medium';
      reason = 'Standard royalty schedule or banking question';
    }
  }
  // 2. ISBN & Metadata
  else if (
    combined.includes('isbn') ||
    combined.includes('metadata') ||
    combined.includes('imprint') ||
    combined.includes('barcode')
  ) {
    category = 'ISBN & Metadata Issues';
    if (combined.includes('wrong') || combined.includes('duplicate') || combined.includes('mismatch') || combined.includes('different') || combined.includes('error')) {
      priority = 'High';
      reason = 'ISBN catalog integrity issue; risk of incorrect sales linkage';
    } else {
      priority = 'Medium';
      reason = 'General ISBN or metadata inquiry';
    }
  }
  // 3. Printing & Quality
  else if (
    combined.includes('print') ||
    combined.includes('quality') ||
    combined.includes('blurry') ||
    combined.includes('binding') ||
    combined.includes('pages') ||
    combined.includes('defect') ||
    combined.includes('damaged') ||
    combined.includes('misprint') ||
    combined.includes('misalign')
  ) {
    category = 'Printing & Quality';
    if (combined.includes('terrible') || combined.includes('defect') || combined.includes('damaged') || combined.includes('blurry') || combined.includes('misalign')) {
      priority = 'High';
      reason = 'Defective physical copies received by author; reprint evaluation required';
    } else {
      priority = 'Medium';
      reason = 'General print turnaround inquiry';
    }
  }
  // 4. Description / Bio / Profile updates (check before generic marketplace terms)
  else if (
    (combined.includes('description') || combined.includes('bio') || combined.includes('blurb') || combined.includes('synopsis') || combined.includes('photo') || combined.includes('profile')) &&
    (combined.includes('update') || combined.includes('change') || combined.includes('edit') || combined.includes('modify') || combined.includes('can i'))
  ) {
    category = 'General Inquiry';
    priority = 'Low';
    reason = 'Minor metadata, book description, or author profile update (3-5 day SLA)';
  }
  // 5. Distribution & Availability
  else if (
    combined.includes('unavailable') ||
    combined.includes('out of stock') ||
    combined.includes('not available') ||
    combined.includes('buy link') ||
    combined.includes('distribution') ||
    combined.includes('delisted') ||
    ((combined.includes('amazon') || combined.includes('flipkart') || combined.includes('store')) &&
      (combined.includes('stock') || combined.includes('listing') || combined.includes('live') || combined.includes('buy') || combined.includes('find') || combined.includes('search')))
  ) {
    category = 'Distribution & Availability';
    if (combined.includes('currently unavailable') || combined.includes('out of stock') || combined.includes('delisted')) {
      priority = 'High';
      reason = 'Platform listing showing unavailable; stock sync required within 24-48 hrs';
    } else {
      priority = 'Medium';
      reason = 'Distribution timeline or channel addition request';
    }
  }
  // 6. Book Status & Production Updates
  else if (
    combined.includes('typesetting') ||
    combined.includes('proofreading') ||
    combined.includes('cover design') ||
    combined.includes('manuscript') ||
    combined.includes('production') ||
    combined.includes('when will') ||
    combined.includes('stage') ||
    combined.includes('progress')
  ) {
    category = 'Book Status & Production Updates';
    if (combined.includes('delay') || combined.includes('weeks') || combined.includes('months') || combined.includes('stuck')) {
      priority = 'High';
      reason = 'Production milestone exceeding standard turnaround';
    } else {
      priority = 'Medium';
      reason = 'Routine production workflow query';
    }
  }
  // 7. General Inquiry
  else {
    category = 'General Inquiry';
    if (combined.includes('bio') || combined.includes('photo') || combined.includes('profile') || combined.includes('typo') || combined.includes('description')) {
      priority = 'Low';
      reason = 'Minor author profile or metadata update';
    } else {
      priority = 'Low';
      reason = 'General author informational query';
    }
  }

  return { category, priority, reason };
}

/**
 * Intelligent Knowledge Base Grounded Response Generator (Fallback Engine)
 */
export function heuristicDraftResponse({ author, book, ticket }) {
  const authorFirstName = (author?.name || 'Author').split(' ')[0];
  const bookTitle = book?.title ? `"${book.title}"` : 'your book';
  const sub = (ticket.subject || '').toLowerCase();
  const desc = (ticket.description || '').toLowerCase();
  const combined = `${sub} ${desc}`;

  // Scenario 1: Unpaid / missing royalty
  if (
    ticket.category === 'Royalty & Payments' &&
    (combined.includes('not received') || combined.includes("haven't received") || combined.includes('overdue') || combined.includes('when will') || combined.includes('where is'))
  ) {
    const pendingAmount = book?.royalty_pending ? `₹${book.royalty_pending.toLocaleString('en-IN')}` : 'your pending balance';
    const lastPayout = book?.last_royalty_payout_date ? `(last disbursed on ${book.last_royalty_payout_date})` : '';

    return `Dear ${authorFirstName},

Thank you for reaching out to BookLeaf Publishing. I completely understand your concern regarding your royalty payout for ${bookTitle}, and I sincerely apologize for any stress this delay has caused.

At BookLeaf, royalties are calculated on a quarterly cycle and disbursed within 45 days of the quarter ending via direct bank transfer. The minimum payout threshold is ₹1,000; any balance below this rolls forward to the following quarter.

According to our live records:
• Current Royalty Pending: ${pendingAmount} ${lastPayout}
• Payment Status: Scheduled for processing

I have personally flagged this to our finance desk to verify that your linked bank details and IFSC code are validated in our payout portal. We are actively auditing the remittance, and I will follow up with an official transaction update within 48 hours.

Could you please confirm if your bank account details on your author dashboard remain up-to-date?

Warm regards,  
BookLeaf Support Team`;
  }

  // Scenario 2: Royalty calculation discrepancy / low royalty
  if (ticket.category === 'Royalty & Payments') {
    const copiesSold = book?.total_copies_sold ? `${book.total_copies_sold} copies` : 'reported sales';
    const totalEarned = book?.total_royalty_earned ? `₹${book.total_royalty_earned.toLocaleString('en-IN')}` : 'total earnings';

    return `Dear ${authorFirstName},

Thank you for contacting us regarding the royalty figures for ${bookTitle}. We deeply value total transparency with our authors, and I am glad to clarify how your earnings are calculated.

BookLeaf follows an industry-leading 80/20 profit split where 80% of net profits go directly to the author. 
As detailed in our author agreement:
• Net Profit = MRP minus Printing Cost, Platform Commission (Amazon/Flipkart ~45-50%), and Shipping charges.
• For ${bookTitle}, you have recorded ${copiesSold} sold with ${totalEarned} earned to date.

Because marketplace commissions and shipping vary per order format and destination, flat percentage math on MRP can often look counter-intuitive at first glance. 

I am generating a line-by-line breakdown showing retail discounts, print deductions, and marketplace fees per order. Would you like me to email this audit sheet directly to ${author?.email || 'your email'}?

Warm regards,  
BookLeaf Author Relations`;
  }

  // Scenario 3: ISBN & Metadata
  if (ticket.category === 'ISBN & Metadata Issues') {
    const isbnVal = book?.isbn || 'assigned ISBN';
    return `Dear ${authorFirstName},

Thank you for bringing this to our attention. We treat any ISBN or catalog data discrepancy as a critical issue, and I sincerely apologize for the inconvenience regarding ${bookTitle}.

Our official record shows ${bookTitle} registered under ISBN ${isbnVal} under BookLeaf's publisher imprint. If Amazon or any retail partner is displaying an incorrect or duplicate ISBN, it can jeopardize sales attribution and catalog discoverability.

I have escalated this ticket immediately to our Production & Catalog Integrity team (Ticket Reference: ${ticket.ticket_number || 'URGENT'}). We are issuing an authoritative feed correction directly to Amazon's catalog operations desk.

Timeline: We will have this verified and resolved within 48 hours. You do not need to take any additional action on your end.

Warm regards,  
BookLeaf Production Support`;
  }

  // Scenario 4: Printing & Quality Defect
  if (ticket.category === 'Printing & Quality') {
    return `Dear ${authorFirstName},

I am truly sorry to hear that your author copies of ${bookTitle} did not arrive in immaculate condition. We take immense pride in our print standards, and having misprints or binding defects reach you is completely unacceptable.

Under BookLeaf's Quality Guarantee Policy:
• Any copy exhibiting misprints, binding defects, or color inconsistency qualifies for a 100% free reprint.
• Standard reprint turnaround is 5–7 business days once verified.

To initiate the complimentary reprint immediately, could you kindly reply to this ticket with 2–3 clear photographs highlighting the defect (pages, spine, or cover)? As soon as our print quality manager reviews the images, we will place the priority print order with our Delhi facility.

Thank you for your patience as we make this right.

Warm regards,  
BookLeaf Print & Fulfillment Team`;
  }

  // Scenario 5: Distribution & Availability (Out of stock / unavailable)
  if (ticket.category === 'Distribution & Availability') {
    return `Dear ${authorFirstName},

Thank you for alerting us about the listing status for ${bookTitle}. Seeing your title listed as "Currently Unavailable" is understandably frustrating, but please rest assured this is almost always a temporary marketplace stock sync issue.

When retail channels like Amazon India or Flipkart refresh inventory feeds or reassign fulfillment centers, their frontend temporarily shows an unavailable status while backend inventory re-indexes.

Action Taken:
• Our distribution team has initiated an automated inventory sync feed with Amazon and Flipkart for ISBN ${book?.isbn || 'your title'}.
• Marketplace indexing typically completes within 24 to 48 hours.

We are monitoring the product page and will verify when the "Buy Now" button is live again.

Warm regards,  
BookLeaf Distribution Desk`;
  }

  // Scenario 6: Book Status & Production Updates
  if (ticket.category === 'Book Status & Production Updates') {
    const stage = book?.status || 'In Production';
    return `Dear ${authorFirstName},

Thank you for checking in on the progress of ${bookTitle}. We know how eager you are to see your work published and shared with readers!

Our production pipeline follows nine sequential milestones: Manuscript Received → Editing → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.

Your book is currently in the ${stage} stage. To ensure the highest literary and typographical quality, typesetting and proofing involve thorough multi-point checks. 

Our production editor is completing the current round, and you can expect the updated proofs for your review within 3–4 business days. We will notify you via email the moment they are uploaded to your portal.

Warm regards,  
BookLeaf Editorial & Production Team`;
  }

  // Default: General Inquiry
  return `Dear ${authorFirstName},

Thank you for reaching out to BookLeaf Publishing regarding ${bookTitle}. We are always happy to support our authors.

Regarding your request: Updates to book descriptions, blurb adjustments, and author biographies can be made seamlessly. Once requested, metadata updates reflect across major platforms (Amazon, Flipkart, BookLeaf Store) within 3 to 5 business days.

I have recorded your request and our operations desk is processing it. If you have any specific wording or attachments to incorporate, please reply directly to this ticket.

Warm regards,  
BookLeaf Author Support Team`;
}

/**
 * Token-efficient, production-grade AI Service
 * Supports Gemini API / OpenAI API when key configured, with seamless graceful fallback.
 */
export async function classifyAndScoreTicket({ subject, description, book, author }) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

  // If no external API key, use instant grounded heuristic
  if (!geminiKey && !openaiKey) {
    return heuristicClassifyAndPrioritize(subject, description);
  }

  const prompt = `You are an AI Support Classifier for BookLeaf Publishing (self-publishing platform in India & US).
Classify the following author support query into exactly ONE category and assign a priority score.

Categories:
1. Royalty & Payments
2. ISBN & Metadata Issues
3. Printing & Quality
4. Distribution & Availability
5. Book Status & Production Updates
6. General Inquiry

Priorities:
- Critical: Overdue unpaid royalty > 4 months, acute financial or legal blocks
- High: Wrong ISBN, defective physical author copies, book unexpectedly unavailable on Amazon
- Medium: General royalty explanation, standard turnaround questions, production proof questions
- Low: Updating author bio, blurb tweaks, general questions

Author: ${author?.name || 'Author'}
Book: ${book?.title || 'General Account Level'} (${book?.status || 'N/A'})
Subject: "${subject}"
Description: "${description}"

Respond ONLY with valid JSON in this exact format:
{
  "category": "one of the 6 categories",
  "priority": "Critical|High|Medium|Low",
  "reason": "short 1-sentence reason"
}`;

  try {
    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
          }),
          signal: AbortSignal.timeout(15000)
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          try {
            const parsed = JSON.parse(text);
            if (VALID_CATEGORIES.includes(parsed.category) && VALID_PRIORITIES.includes(parsed.priority)) {
              return {
                category: parsed.category,
                priority: parsed.priority,
                reason: parsed.reason || 'Auto-classified based on author query context'
              };
            } else {
              console.warn('[AI Service] Gemini returned unexpected category/priority, falling back:', parsed);
            }
          } catch (jsonErr) {
            console.warn('[AI Service] Failed to parse Gemini classification JSON:', jsonErr.message);
          }
        }
      } else {
        const errData = await response.json().catch(() => null);
        const safeMessage = errData?.error?.message || response.statusText || 'Request failed';
        console.warn(`[AI Service] Gemini classification API returned status ${response.status}: ${safeMessage}`);
      }
    } else if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        if (VALID_CATEGORIES.includes(parsed.category) && VALID_PRIORITIES.includes(parsed.priority)) {
          return parsed;
        }
      } else {
        const errData = await response.json().catch(() => null);
        const safeMessage = errData?.error?.message || response.statusText || 'Request failed';
        console.warn(`[AI Service] OpenAI classification API returned status ${response.status}: ${safeMessage}`);
      }
    }
  } catch (err) {
    console.warn('[AI Service] LLM call failed, gracefully falling back to Knowledge Base heuristic:', err.message);
  }

  // Graceful degradation fallback
  return heuristicClassifyAndPrioritize(subject, description);
}

/**
 * Generate AI Draft Response grounded in BookLeaf Knowledge Base
 */
export async function generateAiDraftResponse({ author, book, ticket, messages = [] }) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

  if (!geminiKey && !openaiKey) {
    return heuristicDraftResponse({ author, book, ticket });
  }

  const prompt = `You are a Senior Author Support Representative at BookLeaf Publishing.
Draft an empathetic, professional response grounded STRICTLY in BookLeaf policies.

BOOKLEAF POLICIES & KNOWLEDGE BASE:
- Split: 80/20 (80% net profit to author, 20% to BookLeaf).
- Net Profit = MRP - Printing Cost - Platform Commission (Amazon/Flipkart) - Shipping Charges.
- Royalties calculated quarterly, paid within 45 days of quarter ending. Minimum payout: ₹1,000 (rolls over if below).
- Print quality defects (misprints, binding, blurry): 100% free reprint arranged in 5-7 business days once author shares photos.
- Amazon 'Currently Unavailable': stock sync issue; BookLeaf triggers re-sync with distribution within 24-48 hours.
- ISBN errors: High priority, escalated immediately to production with 48-hour SLA.
- Production stages: Manuscript -> Editing -> Cover Design -> Typesetting -> Proofreading -> ISBN -> Printing -> Distribution -> Published.
- Tone: Empathetic, professional, specific numbers and dates, own faults directly, give clear timeline & next step.

CONTEXT:
Author: ${author?.name || 'Author'} (Email: ${author?.email || 'N/A'}, City: ${author?.city || 'N/A'})
Book Linked: ${book?.title || 'General Account Query'}
Book Status: ${book?.status || 'N/A'}
Book ISBN: ${book?.isbn || 'N/A'}
Total Copies Sold: ${book?.total_copies_sold ?? 'N/A'}
Total Royalty Earned: ₹${book?.total_royalty_earned ?? 'N/A'}
Royalty Paid: ₹${book?.royalty_paid ?? 'N/A'}
Royalty Pending: ₹${book?.royalty_pending ?? 'N/A'}
Last Payout Date: ${book?.last_royalty_payout_date || 'None'}

TICKET:
Number: ${ticket.ticket_number}
Category: ${ticket.category}
Priority: ${ticket.priority}
Subject: ${ticket.subject}
Original Query: ${ticket.description}

Write the response directly to the author. Do not include markdown meta-chatter, only the letter.`;

  try {
    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 }
          }),
          signal: AbortSignal.timeout(25000)
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === 'string' && text.trim().length >= 20) {
          return text.trim();
        } else {
          console.warn('[AI Service] Gemini draft response was empty or too short, falling back to heuristic');
        }
      } else {
        const errData = await response.json().catch(() => null);
        const safeMessage = errData?.error?.message || response.statusText || 'Request failed';
        console.warn(`[AI Service] Gemini draft generation API returned status ${response.status}: ${safeMessage}`);
      }
    } else if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices[0]?.message?.content;
        if (text && typeof text === 'string' && text.trim().length >= 20) {
          return text.trim();
        }
      } else {
        const errData = await response.json().catch(() => null);
        const safeMessage = errData?.error?.message || response.statusText || 'Request failed';
        console.warn(`[AI Service] OpenAI draft generation API returned status ${response.status}: ${safeMessage}`);
      }
    }
  } catch (err) {
    console.warn('[AI Service] LLM generation failed, gracefully falling back to Knowledge Base heuristic:', err.message);
  }

  return heuristicDraftResponse({ author, book, ticket });
}
