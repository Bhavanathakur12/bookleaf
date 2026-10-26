import express from 'express';

const router = express.Router();

const API_SPEC = {
  openapi: '3.0.0',
  info: {
    title: 'BookLeaf Publishing Support & Communication Portal API',
    version: '1.0.0',
    description: 'REST API for Author and Admin operations, ticket lifecycle, and AI assistance.'
  },
  endpoints: [
    {
      group: 'Authentication',
      routes: [
        { method: 'POST', path: '/api/auth/login', desc: 'Authenticate author or admin', body: { email: 'string', password: 'string' } },
        { method: 'GET', path: '/api/auth/me', desc: 'Get current session profile', auth: 'Bearer JWT' },
        { method: 'GET', path: '/api/auth/demo-accounts', desc: 'List seeded test credentials for 1-click evaluation' }
      ]
    },
    {
      group: 'Author Portal',
      routes: [
        { method: 'GET', path: '/api/author/books', desc: "Fetch logged-in author's books and royalty metrics", auth: 'Bearer (Role: author)' },
        { method: 'GET', path: '/api/author/tickets', desc: 'List tickets raised by author', auth: 'Bearer (Role: author)' },
        { method: 'POST', path: '/api/author/tickets', desc: 'Create ticket with AI classification and priority scoring', auth: 'Bearer (Role: author)' },
        { method: 'GET', path: '/api/author/tickets/:id', desc: 'Get ticket thread (messages only, notes excluded)', auth: 'Bearer (Role: author)' },
        { method: 'POST', path: '/api/author/tickets/:id/messages', desc: 'Author sends follow-up reply', auth: 'Bearer (Role: author)' }
      ]
    },
    {
      group: 'Admin Portal',
      routes: [
        { method: 'GET', path: '/api/admin/stats', desc: 'Queue metrics (counts, criticals, oldest unresolved)', auth: 'Bearer (Role: admin)' },
        { method: 'GET', path: '/api/admin/tickets', desc: 'List all tickets with filters (status, category, priority, sort)', auth: 'Bearer (Role: admin)' },
        { method: 'GET', path: '/api/admin/tickets/:id', desc: 'Get complete ticket dossier + thread + internal notes', auth: 'Bearer (Role: admin)' },
        { method: 'PATCH', path: '/api/admin/tickets/:id/status', desc: 'Update status (Open, In Progress, Resolved, Closed)', auth: 'Bearer (Role: admin)' },
        { method: 'PATCH', path: '/api/admin/tickets/:id/classification', desc: 'Override AI category', auth: 'Bearer (Role: admin)' },
        { method: 'PATCH', path: '/api/admin/tickets/:id/priority', desc: 'Override AI priority score', auth: 'Bearer (Role: admin)' },
        { method: 'PATCH', path: '/api/admin/tickets/:id/assign', desc: 'Assign ticket to admin operator', auth: 'Bearer (Role: admin)' },
        { method: 'POST', path: '/api/admin/tickets/:id/notes', desc: 'Add private internal note', auth: 'Bearer (Role: admin)' },
        { method: 'POST', path: '/api/admin/tickets/:id/reply', desc: 'Send official response to author', auth: 'Bearer (Role: admin)' },
        { method: 'POST', path: '/api/admin/tickets/:id/ai-draft', desc: 'Generate/regenerate AI draft using Knowledge Base', auth: 'Bearer (Role: admin)' }
      ]
    },
    {
      group: 'Real-time & System',
      routes: [
        { method: 'GET', path: '/api/events', desc: 'Server-Sent Events (SSE) real-time stream', auth: 'Query token or auth header' },
        { method: 'GET', path: '/api/health', desc: 'Healthcheck and database status' }
      ]
    }
  ]
};

router.get('/spec', (req, res) => {
  res.json(API_SPEC);
});

export default router;
