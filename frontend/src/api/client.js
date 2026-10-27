const BASE_URL = '';

export function getAuthToken() {
  return localStorage.getItem('bookleaf_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('bookleaf_token', token);
  } else {
    localStorage.removeItem('bookleaf_token');
  }
}

export async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `HTTP ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/api/auth/me'),
  getDemoAccounts: () => request('/api/auth/demo-accounts'),

  // Author
  getAuthorBooks: () => request('/api/author/books'),
  getAuthorTickets: () => request('/api/author/tickets'),
  getAuthorTicket: (id) => request(`/api/author/tickets/${id}`),
  createTicket: (data) => request('/api/author/tickets', { method: 'POST', body: JSON.stringify(data) }),
  sendAuthorMessage: (ticketId, message) =>
    request(`/api/author/tickets/${ticketId}/messages`, { method: 'POST', body: JSON.stringify({ message }) }),

  // Admin
  getAdminStats: () => request('/api/admin/stats'),
  getAdminTickets: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== 'All' && v !== '') {
        searchParams.append(k, v);
      }
    });
    const qs = searchParams.toString();
    return request(`/api/admin/tickets${qs ? `?${qs}` : ''}`);
  },
  getAdminTicket: (id) => request(`/api/admin/tickets/${id}`),
  updateTicketStatus: (id, status) =>
    request(`/api/admin/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  overrideClassification: (id, category) =>
    request(`/api/admin/tickets/${id}/classification`, { method: 'PATCH', body: JSON.stringify({ category }) }),
  overridePriority: (id, priority) =>
    request(`/api/admin/tickets/${id}/priority`, { method: 'PATCH', body: JSON.stringify({ priority }) }),
  assignTicket: (id, assigned_to) =>
    request(`/api/admin/tickets/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ assigned_to }) }),
  addInternalNote: (id, note) =>
    request(`/api/admin/tickets/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),
  sendAdminReply: (id, message, status) =>
    request(`/api/admin/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify({ message, status }) }),
  generateAiDraft: (id) => request(`/api/admin/tickets/${id}/ai-draft`, { method: 'POST' }),

  // Docs
  getApiSpec: () => request('/api/docs/spec')
};
