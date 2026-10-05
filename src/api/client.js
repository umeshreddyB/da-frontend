const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  return `${API_BASE}/api${path}`;
}

const TOKEN_KEY = 'sd_token';
const TOKEN_EXPIRY_KEY = 'sd_token_expiry';
const USER_KEY = 'ds_user';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > Number(expiry)) {
    clearToken();
    return null;
  }
  return token;
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + SESSION_MS));
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function cacheUser(user) {
  if (!user?.phone) {
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify({
    id: user.id,
    name: user.name,
    phone: String(user.phone).replace(/\D/g, ''),
  }));
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(apiUrl(path), { ...options, headers });
  } catch {
    const error = new Error('Could not reach the server. Try again in a moment.');
    error.status = 0;
    throw error;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  getPlan: () => request('/plan'),
  getProgress: () => request('/progress'),
  saveProgress: (body) => request('/progress', { method: 'PUT', body: JSON.stringify(body) }),
  patchProgress: (body) => request('/progress', { method: 'PATCH', body: JSON.stringify(body) }),
  timer: (body) => request('/progress/timer', { method: 'POST', body: JSON.stringify(body) }),
  completeDay: (dayNum) => request('/progress/complete-day', { method: 'POST', body: JSON.stringify({ dayNum }) }),
  getAnalytics: () => request('/analytics'),
  exportReport: () => request('/analytics/export'),
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  uploadNoteFile: async (file) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(apiUrl('/progress/notes/upload'), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Upload failed');
    return data;
  },
};
