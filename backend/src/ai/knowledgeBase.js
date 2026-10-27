/**
 * BookLeaf Publishing Knowledge Base & Tone Guidelines
 * Extracted directly from official company specification.
 */

export const BOOKLEAF_KNOWLEDGE_BASE = {
  company: {
    name: "BookLeaf Publishing",
    description: "Self-publishing company operating in India and the US, processing 1,200+ books monthly across a catalog of 22,000+ titles.",
    facilities: "In-house printing facility and warehouse located in Delhi. Also partners with Repro India and Epitome Books.",
    packages: [
      { name: "Standard Free", details: "No upfront cost, core publishing services." },
      { name: "Bestseller Breakthrough", details: "Premium paid package with marketing and distribution add-ons." }
    ],
    services: ["Cover design", "Typesetting", "ISBN assignment", "Printing", "Distribution", "Royalty management"]
  },
  royalty_policy: {
    split: "80/20 split: 80% of net profit per book goes to author, 20% to BookLeaf.",
    net_profit_formula: "Net Profit = MRP - Printing Cost - Platform Commission (Amazon/Flipkart) - Shipping Charges.",
    calculation_cycle: "Royalties calculated quarterly and paid within 45 days of the quarter ending.",
    minimum_payout_threshold: "₹1,000. If accumulated royalties are below ₹1,000, they roll over to the next quarter.",
    payout_method: "Bank transfer to the account linked in the author's dashboard.",
    transparency: "Authors can view detailed royalty breakdown showing sales figures per platform in their dashboard."
  },
  isbn_policy: {
    assignment: "Every book published through BookLeaf receives a unique ISBN assigned by BookLeaf registered under BookLeaf's publisher imprint.",
    custom_imprint: "If author wants an ISBN under their own imprint, they need to obtain it independently.",
    errors: "ISBN errors (duplicate, wrong book linked) are treated as high priority and escalated immediately to the production team with a 48-hour resolution timeline."
  },
  printing_quality: {
    facilities: "In-house printing handles most orders; overflow or specific format requirements go to Repro India or Epitome Books.",
    standard_turnaround: "5-7 business days from order confirmation.",
    quality_defect_policy: "If author reports quality issues (misprints, binding defects, color inconsistency), BookLeaf arranges a free reprint after verification upon receipt of photos of defective copy. Turnaround: 5-7 business days."
  },
  distribution_availability: {
    channels: ["Amazon India", "Flipkart", "Amazon US", "Amazon UK", "BookLeaf Store"],
    listing_turnaround: "New listings typically go live within 7-10 business days after publication is complete.",
    availability_glitches: "If a book displays as 'Currently Unavailable' on a platform, it usually indicates a stock sync issue. BookLeaf's team triggers a re-sync with distribution partners within 24-48 hours."
  },
  production_stages: {
    workflow: [
      "Manuscript Received",
      "Editing (if opted)",
      "Cover Design",
      "Typesetting",
      "Proofreading",
      "ISBN Assignment",
      "Printing",
      "Distribution Setup",
      "Published & Live"
    ],
    delays_context: "Delays typically occur at Cover Design (waiting for author approval) and Proofreading (revision rounds). Delays should be framed collaboratively without blaming the author."
  },
  tone_guidelines: [
    "Always empathetic and professional. Authors are our partners, not customers to be managed.",
    "Acknowledge the author's concern before jumping to solutions.",
    "Be specific: include actual numbers, dates, and statuses wherever possible rather than vague reassurances.",
    "If something is BookLeaf's fault (delayed royalties, ISBN error), own it directly. No corporate deflection.",
    "If the issue requires escalation or investigation, give a clear timeline ('Our team will look into this and get back to you within 48 hours') rather than open-ended promises.",
    "Always end with a clear next step for the author and/or the BookLeaf team."
  ],
  sample_scenarios: [
    {
      category: "Royalty & Payments",
      trigger: "Haven't received royalty for 4-6 months",
      guidance: "Acknowledge frustration. Explain quarterly cycle and 45-day payout window. Check if bank details are linked. Provide specific next payout date. If overdue, escalate with 48-hour resolution."
    },
    {
      category: "Royalty & Payments",
      trigger: "Royalty amount feels too low compared to sales",
      guidance: "Explain net profit calculation (MRP - print - platform commission - shipping). Offer detailed line-by-line royalty breakdown with full transparency."
    },
    {
      category: "ISBN & Metadata Issues",
      trigger: "Different ISBN on Amazon vs physical copy or wrong metadata",
      guidance: "Treat as high priority. Acknowledge as serious data issue. Escalate to production immediately with 48-hour resolution."
    },
    {
      category: "Printing & Quality",
      trigger: "Received author copies with defects / blurry images / misaligned pages",
      guidance: "Apologize sincerely. Request photos of defective copies. Confirm BookLeaf arranges free reprint once verified (5-7 business days)."
    },
    {
      category: "Distribution & Availability",
      trigger: "Book showing 'Currently Unavailable' on Amazon / Flipkart",
      guidance: "Explain this is typically a stock sync issue. Confirm triggering re-sync with distribution team with 24-48 hours expectation."
    },
    {
      category: "Book Status & Production Updates",
      trigger: "Book delayed in typesetting / proofreading / cover design",
      guidance: "Check actual stage. Be honest and frame collaboratively. Provide specific updated timeline."
    },
    {
      category: "General Inquiry",
      trigger: "Updating description, bio, or general inquiries",
      guidance: "Metadata updates submitted via dashboard reflect within 3-5 business days."
    }
  ]
};
