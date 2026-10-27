# BookLeaf Technical Write-Up: Approach, Trade-Offs & Production Evolution

> **Author Support & Communication Portal — Assignment Deliverable 4**  
> *Target Length: Maximum 1 Page*

---

### 1. Approach & Priorities

When designing the **BookLeaf Author Support & Communication Portal**, my primary focus was delivering a high-trust, resilient full-stack platform that resolves operational bottlenecks for both authors and the BookLeaf operations team:

1. **Normalized MySQL Relational Architecture:** The application runs on a fully normalized MySQL 8.x relational schema (`mysql2/promise` with connection pooling, transactional integrity, foreign key cascades, and B-tree indexes) seeded strictly from `bookleaf_sample_data.json` (10 authors, 18 books). All figures (sales, earned, paid, and pending royalties) are dynamically computed.
2. **Knowledge Base–Grounded AI System:** Instead of generic AI output, incoming tickets are automatically classified into the 6 canonical assignment categories with 4-level priority scoring (Critical, High, Medium, Low) and contextual response drafts grounded in official BookLeaf policies (80/20 net profit split, quarterly cycle with 45-day payout, ₹1,000 threshold, 5–7 day free reprint guarantee, and 24–48 hour Amazon stock re-sync).
3. **Strict RBAC & Confidentiality:** Security is enforced server-side. Authors can only access their own catalog and tickets. Admin operations, queue metrics, and confidential internal notes are architecturally isolated and strictly forbidden (`403 Forbidden`) from author-facing endpoints.
4. **Resilient Near-Real-Time Synchronization:** Ticket threads synchronize without hard refreshes using Server-Sent Events (SSE) backed by short-interval polling (3–4s) to guarantee responsiveness across diverse client networks.

---

### 2. Architectural Trade-Offs

- **MySQL 8.x vs. MongoDB / File-Based DBs:** MySQL 8.x was selected as an allowed assignment database engine to guarantee ACID transaction boundaries, relational integrity across authors/books/tickets/notes, and enterprise-grade concurrency via connection pooling (`InnoDB`, `utf8mb4`), eliminating single-file concurrency bottlenecks.
- **AI Dual-Engine (Live LLM + Knowledge Base Heuristic Fallback):** Calling external LLM APIs (`gemini-3.6-flash` / `gpt-4o-mini`) introduces latency and outage risks. To achieve 100% availability, API keys are kept strictly server-side in `.env`, and the service gracefully falls back to an intelligent semantic Knowledge Base engine upon timeouts or errors—never returning a 500 error or generic placeholder.
- **Token Economy & Cost Control:** Prompts avoid dumping entire ticket histories. Bounded context (author metadata, financial facts, specific policy clauses) and low temperatures (0.1 for classification, 0.3 for drafting) guarantee minimal, predictable token consumption.
- **Hybrid Real-Time (SSE + Polling) vs. Stateful WebSockets:** WebSockets add stateful connection overhead and heartbeat complexity across load balancers. SSE combined with lightweight polling delivers near-zero latency for conversation updates while retaining stateless HTTP scalability.

---

### 3. Production Evolution Plan

For deployment across BookLeaf's catalog of 22,000+ titles and 1,200+ monthly books:
1. **Cloud File Storage & Anti-Virus:** Connect ticket attachments to AWS S3 / Cloudflare R2 using presigned upload URLs and asynchronous ClamAV virus scanning.
2. **Inbound Email Webhooks:** Support email-based replies via SendGrid / Postmark webhooks, appending inbound messages directly to existing ticket threads.
3. **Multi-Agent RAG Search:** Integrate vector search (pgvector / Pinecone) for multi-region tax imprints, foreign rights, and policy clauses.
4. **Automated SLA Escalation Worker:** Deploy BullMQ / Redis background jobs to monitor unresolved High/Critical tickets and escalate SLA-breaching queries before the 48-hour deadline.
