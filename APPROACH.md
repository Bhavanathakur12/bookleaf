# BookLeaf Author Support Portal — Architecture & Approach Note

**Candidate:** Full-Stack Developer Position  
**Deliverable:** 1-Page Approach Note (Assignment 1 of 2)

---

### 1. What I Prioritised

1. **AI Integration Quality & Grounding (25% Evaluation Weight):**
   - Rather than treating AI as a generic chatbot, I focused on deep **Knowledge Base grounding**. Every AI-drafted response strictly reflects BookLeaf's real operational rules: the 80/20 net profit split, quarterly cycles with 45-day payout windows, the ₹1,000 threshold, in-house vs. Repro/Epitome printing, and Amazon stock sync turnaround (24–48 hours).
   - I built a **dual-engine architecture**: when an LLM key (`GEMINI_API_KEY` / `OPENAI_API_KEY`) is present, it executes token-optimized contextual inference; when absent or rate-limited, an intelligent deterministic knowledge base engine ensures **100% graceful degradation** without ever failing or throwing 500 errors.

2. **Data Model Integrity (Zero Hardcoding):**
   - Dynamic schema design was prioritized. The 10 authors and 18 books from `bookleaf_sample_data.json` are seeded into relational tables (`authors`, `books`, `users`, `tickets`, `ticket_messages`, `ticket_internal_notes`).
   - Handled real-world edge cases: titles in production (*Midnight in Mysore*, *Raising Roots*) with null MRP and zero sales, multi-channel distribution arrays, and partial royalty payouts.

3. **Operational UX & Ticket Lifecycle:**
   - Designed the Admin Portal around high-stress support workflows: a visual alert immediately highlights the **oldest unresolved ticket** to prevent SLA breaches, urgency sorting surfaces Critical queries first, and administrators can override AI classifications and priority scores with one click.
   - Built strict RBAC data isolation: internal notes are visible only to admins and are filtered out of author-facing payloads.

---

### 2. Trade-offs Made

1. **Database Choice (SQLite in WAL mode vs. Managed PostgreSQL):**
   - *Trade-off:* Used SQLite (`better-sqlite3`) instead of spinning up an external PostgreSQL instance.
   - *Rationale:* For a technical evaluation, self-contained reproducibility is paramount. SQLite in WAL mode gives immediate zero-setup execution for the reviewer with relational rigor, foreign key cascades, and atomic transactions.

2. **Real-Time Architecture (SSE + Polling vs. Full WebSockets):**
   - *Trade-off:* Implemented Server-Sent Events (SSE) paired with resilient 3-4s short polling rather than a persistent WebSocket server.
   - *Rationale:* SSE is lightweight, firewall-friendly, and native to HTTP without protocol upgrade issues, while ensuring the author sees admin responses without page refreshes.

3. **File Attachments (UI Mock & Local Storage vs. Cloud Object Storage):**
   - *Trade-off:* Provided a full UI file dropzone and local mock upload handling rather than setting up an AWS S3 bucket.
   - *Rationale:* Keeps the evaluation self-contained and avoids requiring external cloud credentials from the reviewer.

---

### 3. How I'd Evolve This into a Production System

1. **RAG Pipeline & Vector Search:**
   - As BookLeaf's catalog and policies grow, integrate vector embeddings (e.g. `pgvector` or Pinecone) to chunk and retrieve relevant policy sections and past high-rated support responses dynamically.

2. **Multi-Channel Integration:**
   - Ingest queries directly via Zendesk/Freshdesk API, WhatsApp Business API (popular for Indian authors), and inbound email parsing (e.g. SendGrid Inbound Parse).

3. **Human-in-the-Loop Feedback & RLHF:**
   - Track admin edits to AI-drafted responses. When admins edit a draft before sending, capture the diff as fine-tuning data to continually improve the system's empathetic tone and policy accuracy.

4. **Automated SLA Escalation Engine:**
   - Background workers (BullMQ + Redis) that trigger alert notifications on Slack/PagerDuty if a Critical royalty ticket remains unaddressed after 24 hours.
