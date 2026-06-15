// ─── API CONFIG ──────────────────────────────────────────────────────────────
const API_URL = 'http://localhost:3001';

// ─── SESSION (JWT dans localStorage) ─────────────────────────────────────────
const Session = {
  get()            { try { return JSON.parse(localStorage.getItem('ple_session')); } catch { return null; } },
  set(data)        { localStorage.setItem('ple_session', JSON.stringify(data)); },
  clear()          { localStorage.removeItem('ple_session'); },
  getToken()       { const s = this.get(); return s ? s.token : null; },
};

// ─── FETCH HELPER ─────────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = Session.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw { status: res.status, message: data.message || 'Erreur serveur' };
  return data;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
const Auth = {
  async register(username, email, password) {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    return data;
  },

  async login(identifier, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    // Stocker le token et les infos user en session
    Session.set({ token: data.token, ...data.user });
    return data;
  },

  logout() {
    Session.clear();
    window.location.href = 'index.html';
  },
};

// ─── TOPICS ───────────────────────────────────────────────────────────────────
const Topics = {
  async getAll({ page = 1, limit = 10, search = '', tag = '', sort = 'date' } = {}) {
    let query = `?page=${page}&limit=${limit}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (tag)    query += `&tag=${encodeURIComponent(tag)}`;
    if (sort)   query += `&sort=${sort}`;
    return apiFetch(`/topics${query}`);
  },

  async getById(id) {
    return apiFetch(`/topics/${id}`);
  },

  async create({ title, body, tags = [], visibility = 'public' }) {
    return apiFetch('/topics', {
      method: 'POST',
      body: JSON.stringify({ title, body, tags, visibility }),
    });
  },

  async update(id, patch) {
    return apiFetch(`/topics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  },

  async delete(id) {
    return apiFetch(`/topics/${id}`, { method: 'DELETE' });
  },

  async getTags() {
    return apiFetch('/topics/tags');
  },
};

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
const Messages = {
  async getByTopic(topicId, { page = 1, limit = 10, sort = 'date' } = {}) {
    return apiFetch(`/messages/${topicId}?page=${page}&limit=${limit}&sort=${sort}`);
  },

  async create(topicId, body, image_url = null) {
    return apiFetch(`/messages/${topicId}`, {
      method: 'POST',
      body: JSON.stringify({ body, image_url }),
    });
  },

  async delete(id) {
    return apiFetch(`/messages/${id}`, { method: 'DELETE' });
  },
};

// ─── VOTES ────────────────────────────────────────────────────────────────────
const Votes = {
  async voteMessage(messageId, vote_type) {
    return apiFetch(`/votes/message/${messageId}`, {
      method: 'POST',
      body: JSON.stringify({ vote_type }),
    });
  },

  async getMessageVotes(messageId) {
    return apiFetch(`/votes/message/${messageId}`);
  },

  async voteTopic(topicId, vote_type) {
    return apiFetch(`/votes/topic/${topicId}`, {
      method: 'POST',
      body: JSON.stringify({ vote_type }),
    });
  },

  async getTopicVotes(topicId) {
    return apiFetch(`/votes/topic/${topicId}`);
  },
};

// ─── USERS ────────────────────────────────────────────────────────────────────
const Users = {
  async getProfile(id) {
    return apiFetch(`/users/${id}`);
  },

  async updateProfile({ bio, avatar_url }) {
    return apiFetch('/users/profile', {
      method: 'PUT',
      body: JSON.stringify({ bio, avatar_url }),
    });
  },

  async updatePassword({ current_password, new_password }) {
    return apiFetch('/users/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password, new_password }),
    });
  },
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────
const Admin = {
  async getDashboard() {
    return apiFetch('/admin/dashboard');
  },

  async getUsers({ page = 1, limit = 10 } = {}) {
    return apiFetch(`/admin/users?page=${page}&limit=${limit}`);
  },

  async banUser(id) {
    return apiFetch(`/admin/users/${id}/ban`, { method: 'PUT' });
  },

  async updateTopicStatus(id, status) {
    return apiFetch(`/admin/topics/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async deleteTopic(id) {
    return apiFetch(`/admin/topics/${id}`, { method: 'DELETE' });
  },

  async deleteMessage(id) {
    return apiFetch(`/admin/messages/${id}`, { method: 'DELETE' });
  },
};