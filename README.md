# BookLeaf Publishing — Author Support & Communication Portal

> **Full-Stack Technical Assignment**  
> An intelligent, dual-interface support platform connecting BookLeaf authors and operations personnel, powered by Knowledge Base–grounded AI response generation and real-time query lifecycle management.

---

## 📑 Table of Contents
1. [Executive Overview](#executive-overview)
2. [Key Capabilities & Requirements Coverage](#key-capabilities--requirements-coverage)
3. [Architecture Decisions & Tech Stack Rationale](#architecture-decisions--tech-stack-rationale)
4. [AI Integration Design & Prompt Strategy](#ai-integration-design--prompt-strategy)
5. [Quickstart & Setup Instructions](#quickstart--setup-instructions)
6. [Pre-Seeded Test Credentials](#pre-seeded-test-credentials)
7. [REST API Documentation](#rest-api-documentation)
8. [Edge Case Handling](#edge-case-handling)
9. [Limitations & Production Evolution](#limitations--production-evolution)

---

## 1. Executive Overview

BookLeaf Publishing handles 1,200+ books monthly across a catalog of 22,000+ titles. Author communication at scale is a critical operational bottleneck.

This system delivers a purpose-built solution featuring:
- **Author Portal (Author-Facing):** Email authentication, book catalog inspection with sales and royalty tracking, query submission with AI auto-tagging, and live conversation thread updates.
- **Admin Operations Portal (Admin-Facing):** Unified queue with smart urgency prioritization, visual markers for SLA-breaching and oldest unresolved tickets, AI auto-classification, AI priority scoring, BookLeaf Knowledge Base–grounded response drafting, confidential internal notes, and one-click classification/priority overrides.
- **Full Data Integrity (No Hardcoded Data):** Fully normalized SQLite relational database dynamically seeded from `bookleaf_sample_data.json` (10 authors, 18 books).

---

## 2. Key Capabilities & Requirements Coverage

| Requirement | Implementation | Location |
|---|---|---|
| **Author Authentication** | Email/Password login, JWT session tokens, RBAC middleware | `server/src/routes/auth.js` |
| **Author "My Books"** | Displays title, ISBN, genre, pub date, status, MRP, sold copies, earned/paid/pending royalties, platforms, and print partners | `client/src/components/AuthorPortal/MyBooks.jsx` |
| **Submit Support Query** | Dynamic book dropdown + General Level, subject, description, file attachment preview | `client/src/components/AuthorPortal/SubmitTicketModal.jsx` |
| **Real-Time Ticket Threads** | Near-real-time polling + Server-Sent Events (SSE). Authors see admin replies without refreshing | `client/src/components/AuthorPortal/TicketThreadModal.jsx` |
| **Admin Ticket Queue** | Filterable by status, category, priority, and submission date. Urgency sorting spots critical/oldest unresolved queries | `client/src/components/AdminPortal/AdminDashboard.jsx` |
| **AI Auto-Classification** | Classifies incoming tickets into one of the 6 canonical categories with admin override | `server/src/ai/aiService.js` |
| **AI Priority Scoring** | Computes Critical / High / Medium / Low score with transparent rationale and admin override | `server/src/ai/aiService.js` |
| **AI-Drafted Response** | Grounded strictly in official BookLeaf policies (80/20 split, quarterly cycle, reprint guarantee, stock sync) | `server/src/ai/aiService.js` |
| **Ticket Management** | Status transitions, assignee management, and confidential internal notes (strictly hidden from authors) | `client/src/components/AdminPortal/AdminTicketWorkspace.jsx` |
| **API Layer & Security** | RESTful conventions, role-based middleware, input validation, and interactive OpenAPI modal | `server/src/routes/` |

---

## 3. Architecture Decisions & Tech Stack Rationale

### 3.1 Backend: Node.js + Express
- **Framework:** Express 4.x chosen for predictable middleware composition, native REST routing, and zero overhead.
- **Database:** `better-sqlite3` (SQLite in WAL mode). SQLite was selected because:
  - It runs in-process with zero external service dependencies (no Docker or external database instance required to evaluate).
  - It enforces strict relational integrity with foreign keys, cascaded deletes, and transactions.
  - It eliminates all hardcoded data: every single author, book, platform, ticket, message, and note is dynamically queried from relational tables.
- **Security:** `bcryptjs` for salted password hashing; `jsonwebtoken` (JWT) for stateless role-based authentication.

### 3.2 Frontend: React + Vite + Vanilla CSS
- **Framework:** React 19 with Vite for instant Hot Module Replacement (HMR).
- **Styling:** Custom Vanilla CSS design system (`Outfit` for editorial brand headers, `Plus Jakarta Sans` for body, `JetBrains Mono` for IDs) with glassmorphism, glowing urgency pills, and smooth transitions. Avoided heavy component frameworks to maintain maximum design control and zero bundle bloat.
- **Real-Time Strategy:** Hybrid model combining Server-Sent Events (SSE) `/api/events` and resilient short polling (every 3-4s) so updates arrive with zero latency across all network conditions.

---

## 4. AI Integration Design & Prompt Strategy

### 4.1 Knowledge Base Grounding
Prompts and fallback engines are grounded directly in official BookLeaf policies:
- **Royalty Formula:** Net Profit = MRP − Printing Cost − Platform Commission (Amazon/Flipkart ~45-50%) − Shipping.
- **Royalty Split:** 80% to Author, 20% to BookLeaf.
- **Payout Schedule:** Quarterly, within 45 days of quarter end; ₹1,000 minimum rollover threshold.
- **Print Quality Guarantee:** 100% free reprint arranged within 5–7 business days upon receiving photos of defects.
- **Distribution Availability:** Amazon "Currently Unavailable" treated as stock sync issue resolved within 24–48 hours.
- **ISBN Catalog Issues:** High priority, escalated with 48-hour SLA.
- **Communication Tone:** Empathetic, professional, owning BookLeaf faults directly, providing specific numbers and concrete next steps.

### 4.2 Graceful Degradation & Zero-Key Fallback
- **API Key Security:** API keys (`GEMINI_API_KEY` / `OPENAI_API_KEY`) are read strictly server-side from environment variables. They are never exposed to the frontend.
- **Graceful Error Handling:** If an API key is not configured, or if the external LLM provider experiences rate limits or network downtime, the system **never crashes or throws 500**. It smoothly transitions to a built-in semantic Knowledge Base reasoning engine that produces tailored, policy-compliant responses using the exact author and book figures.

### 4.3 Cost-Conscious Token Management
- Prompts do **not** dump entire database histories.
- Context injection is surgical: only the relevant author metadata, linked book financial figures, and specific policy guidance are sent.
- Structured JSON outputs (`temperature: 0.1` for classification; `0.3` for draft generation) keep token usage minimal and predictable.

### 4.4 Model Choice Justification
- **Gemini 1.5 Flash / GPT-4o-mini:** Ideal balance of low latency (<600ms), sub-cent cost per inquiry, and exceptional instruction-following capability for policy-grounded drafting.

---

## 5. Quickstart & Setup Instructions

### Prerequisites
- Node.js v18+ (tested on Node v22.14)
- npm v9+

### 1-Step Dev Launch
From the root directory:
```bash
# 1. Install all dependencies (root, server, and client)
npm run install:all # or run npm install in root, server, and client

# 2. Seed database with the 10 authors and 18 books
npm run seed

# 3. Start development server (both backend on :4000 and frontend on :5173)
npm run dev
```

### Accessing the Application
- **Frontend App:** [http://localhost:5173](http://localhost:5173) (or [http://localhost:4000](http://localhost:4000) for production build)
- **API Health:** [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **API Specification:** [http://localhost:4000/api/docs/spec](http://localhost:4000/api/docs/spec)

### Running Verification Tests
```bash
# Run unit & heuristic verification
npm run test --prefix server

# Run end-to-end integration test (14 automated scenarios)
node server/test/e2e.test.js
```

---

## 6. Pre-Seeded Test Credentials

Use the **"Instant 1-Click Evaluator Logins"** buttons on the login page or the **"Switch Role"** menu in the top bar to test any account instantly.

| Account Type | Email | Password | Details |
|---|---|---|---|
| **Operations Admin** | `admin@bookleafpublishing.com` | `admin123` | Full queue management, AI overrides, internal notes |
| **Support Lead** | `support@bookleafpublishing.com` | `admin123` | Operational support management |
| **Author (Priya Sharma)** | `priya.sharma@email.com` | `author123` | 2 books (*Whispers of the Ganges*, *The Saffron Diaries*) |
| **Author (Rohit Kapoor)** | `rohit.kapoor@email.com` | `author123` | 2 books (*Code & Karma*, *Startup Sutra*) |
| **Author (Sneha Kulkarni)** | `sneha.kulkarni@email.com` | `author123` | 3 books including in-production title |
| **Author (Vikram Joshi)** | `vikram.joshi@email.com` | `author123` | 2 books (*Debugging Life*, *The Last Monsoon*) |
| **Author (Kavita Deshmukh)**| `kavita.deshmukh@email.com` | `author123` | In-production typesetting title (*Raising Roots*) |
| *All Other Authors* | `<firstname>.<lastname>@email.com` | `author123` | AUTH003, AUTH005, AUTH006, AUTH008, AUTH010 |

---

## 7. REST API Documentation

All routes under `/api/author` and `/api/admin` are protected by JWT Bearer tokens.

### Authentication
- `POST /api/auth/login`: `{ email, password }` -> `{ token, user }`
- `GET /api/auth/me`: Validates session and returns profile.
- `GET /api/auth/demo-accounts`: Returns available test logins for quick evaluation.

### Author Portal Endpoints
- `GET /api/author/books`: Returns books for authenticated author, with parsed distribution platforms and calculated royalty summary.
- `GET /api/author/tickets`: Returns tickets submitted by this author.
- `POST /api/author/tickets`: Creates a ticket. Triggers AI classification, priority scoring, and draft generation.
- `GET /api/author/tickets/:id`: Retrieves ticket and chronological message thread (**excludes internal notes**).
- `POST /api/author/tickets/:id/messages`: Author sends follow-up reply in thread.

### Admin Operations Endpoints
- `GET /api/admin/stats`: Queue metrics (total, open, in-progress, critical, oldest unresolved).
- `GET /api/admin/tickets`: Filterable queue by `status`, `category`, `priority`, `sort` (`urgency`, `oldest`, `newest`), and `search`.
- `GET /api/admin/tickets/:id`: Complete ticket dossier (author profile, book economics, message thread, and internal notes).
- `PATCH /api/admin/tickets/:id/status`: Updates status (`Open`, `In Progress`, `Resolved`, `Closed`).
- `PATCH /api/admin/tickets/:id/classification`: Admin overrides AI category.
- `PATCH /api/admin/tickets/:id/priority`: Admin overrides AI priority score.
- `PATCH /api/admin/tickets/:id/assign`: Assigns ticket to operator.
- `POST /api/admin/tickets/:id/notes`: Adds confidential internal note.
- `POST /api/admin/tickets/:id/reply`: Sends official response to author.
- `POST /api/admin/tickets/:id/ai-draft`: Regenerates AI draft grounded in BookLeaf Knowledge Base.

---

## 8. Edge Case Handling

1. **Books in Production:** Handles books such as *Midnight in Mysore* (`In Production - Cover Design`) and *Raising Roots* (`In Production - Typesetting`) with `null` MRP, `null` royalties, and `0` copies sold without crashing.
2. **Account-Level Queries:** Authors can raise queries without selecting a specific book ("General / Account Level").
3. **Role-Based Isolation:** Authors attempting to access `/api/admin/*` receive `403 Forbidden`. Internal admin notes are never included in author API responses.
4. **Re-opening Resolved Tickets:** When an author replies to a "Resolved" ticket, the system automatically transitions the status back to "In Progress".

---

## 9. Limitations & Production Evolution

- **Attachments:** Currently supports UI dropzone and mock static file storage. In production, this would integrate with AWS S3 / Cloudflare R2 with signed upload URLs and anti-virus scanning.
- **WebSocket Gateway:** While SSE and responsive polling deliver low-latency real-time updates, a dedicated WebSocket gateway (e.g. Socket.io with Redis adapter) would support high-volume bi-directional typing indicators.
- **Email Webhooks:** Integrating SendGrid / Postmark inbound webhooks to allow authors to reply directly via email.
