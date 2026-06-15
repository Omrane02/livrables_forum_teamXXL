// ─── GUARD ───────────────────────────────────────────────────────────────────
const session = Session.get();
if (!session || session.role !== 'admin') {
  alert('Accès réservé aux administrateurs.');
  window.location.href = 'index.html';
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
(async () => {
  await renderStats();
  await renderTopicsTab();
})();

function doLogout() { Auth.logout(); }

// ─── TABS ─────────────────────────────────────────────────────────────────────
function showTab(name, btn) {
  ['topics', 'replies', 'users'].forEach(t => {
    document.getElementById('tab-' + t).style.display = t === name ? '' : 'none';
  });
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (name === 'topics')  renderTopicsTab();
  if (name === 'replies') renderRepliesTab();
  if (name === 'users')   renderUsersTab();
}

// ─── STATS ────────────────────────────────────────────────────────────────────
async function renderStats() {
  try {
    const data  = await Admin.getDashboard();
    const stats = data.data.stats;

    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card"><span class="stat-label">Topics</span><span class="stat-value">${stats.total_topics}</span></div>
      <div class="stat-card"><span class="stat-label">Messages</span><span class="stat-value">${stats.total_messages}</span></div>
      <div class="stat-card"><span class="stat-label">Utilisateurs</span><span class="stat-value">${stats.total_users}</span></div>
      <div class="stat-card"><span class="stat-label">Bannis</span><span class="stat-value">${stats.banned_users}</span></div>`;
  } catch (e) {
    toast('Erreur chargement stats', 'error');
  }
}

// ─── TOPICS TAB ───────────────────────────────────────────────────────────────
async function renderTopicsTab() {
  const tbody = document.getElementById('topics-tbody');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center">Chargement...</td></tr>`;

  try {
    const data   = await Topics.getAll({ page: 1, limit: 100 });
    const topics = data.data || [];

    const statusBadge = { open: 'badge-open', closed: 'badge-closed', archived: 'badge-archived' };
    const statusLabel = { open: 'Ouvert', closed: 'Fermé', archived: 'Archivé' };

    tbody.innerHTML = topics.map(t => `
      <tr>
        <td><a href="topic.html?id=${t.id}" style="color:var(--accent-strong);font-weight:600">${escHtml(t.title)}</a></td>
        <td>${escHtml(t.author || 'Inconnu')}</td>
        <td>${escHtml(t.tags || '-')}</td>
        <td><span class="badge ${statusBadge[t.status] || 'badge-open'}">${statusLabel[t.status] || 'Ouvert'}</span></td>
        <td>${formatDate(new Date(t.created_at).getTime())}</td>
        <td class="td-actions">
          <button class="btn btn-outline btn-sm" onclick="adminEditStatus(${t.id}, '${t.status}')">✏️ État</button>
          <button class="btn btn-danger btn-sm" onclick="adminDeleteTopic(${t.id})">🗑 Supprimer</button>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8">Erreur de chargement.</td></tr>`;
  }
}

// ─── REPLIES TAB ──────────────────────────────────────────────────────────────
async function renderRepliesTab() {
  const tbody = document.getElementById('replies-tbody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center">Chargement...</td></tr>`;

  try {
    // Récupérer tous les topics puis leurs messages
    const topicsData = await Topics.getAll({ page: 1, limit: 100 });
    const topics     = topicsData.data || [];
    let allMessages  = [];

    for (const t of topics) {
      try {
        const msgData = await Messages.getByTopic(t.id, { page: 1, limit: 100 });
        const msgs    = (msgData.data || []).map(m => ({ ...m, topicTitle: t.title }));
        allMessages   = allMessages.concat(msgs);
      } catch { }
    }

    if (allMessages.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center">Aucun message.</td></tr>`;
      return;
    }

    tbody.innerHTML = allMessages.map(m => `
      <tr>
        <td>${escHtml(m.topicTitle || '-')}</td>
        <td>${escHtml(m.author || 'Inconnu')}</td>
        <td>${escHtml(m.body.slice(0, 80))}${m.body.length > 80 ? '…' : ''}</td>
        <td>${m.popularity_score || 0}</td>
        <td>${formatDate(new Date(m.sent_at).getTime())}</td>
        <td class="td-actions">
          <button class="btn btn-danger btn-sm" onclick="adminDeleteMessage(${m.id})">🗑 Supprimer</button>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6">Erreur de chargement.</td></tr>`;
  }
}

// ─── USERS TAB ────────────────────────────────────────────────────────────────
async function renderUsersTab() {
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">Chargement...</td></tr>`;

  try {
    const data  = await Admin.getUsers({ page: 1, limit: 100 });
    const users = data.data || [];

    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${escHtml(u.username)}</strong></td>
        <td>${escHtml(u.email)}</td>
        <td>${u.role === 'admin' ? '<span class="badge badge-admin">ADMIN</span>' : 'Utilisateur'}</td>
        <td>${u.is_banned ? '<span class="badge badge-closed">Banni</span>' : '<span class="badge badge-open">Actif</span>'}</td>
        <td>${formatDate(new Date(u.created_at).getTime())}</td>
        <td>${u.topic_count || 0}</td>
        <td class="td-actions">
          ${u.id !== session.id && u.role !== 'admin' ? `
            <button class="btn btn-sm ${u.is_banned ? 'btn-outline' : 'btn-danger'}" onclick="toggleBan(${u.id})">
              ${u.is_banned ? 'Débannir' : 'Bannir'}
            </button>` : '<em style="color:var(--text-muted);font-size:0.8rem">Protégé</em>'}
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7">Erreur de chargement.</td></tr>`;
  }
}

// ─── ADMIN ACTIONS ────────────────────────────────────────────────────────────
function adminEditStatus(topicId, currentStatus) {
  document.getElementById('admin-status-select').value = currentStatus;
  openModal('edit-status-modal');
  document.getElementById('save-status-btn').onclick = async () => {
    const newStatus = document.getElementById('admin-status-select').value;
    try {
      await Admin.updateTopicStatus(topicId, newStatus);
      closeModal('edit-status-modal');
      toast('État mis à jour.', 'success');
      await renderStats();
      await renderTopicsTab();
    } catch (e) {
      toast(e.message || 'Erreur', 'error');
    }
  };
}

function adminDeleteTopic(topicId) {
  document.getElementById('confirm-delete-text').textContent = 'Supprimer ce topic et tous ses messages ?';
  openModal('confirm-delete-modal');
  document.getElementById('confirm-delete-btn').onclick = async () => {
    try {
      await Admin.deleteTopic(topicId);
      closeModal('confirm-delete-modal');
      toast('Topic supprimé.', 'success');
      await renderStats();
      await renderTopicsTab();
    } catch (e) {
      toast(e.message || 'Erreur', 'error');
    }
  };
}

function adminDeleteMessage(messageId) {
  document.getElementById('confirm-delete-text').textContent = 'Supprimer ce message ?';
  openModal('confirm-delete-modal');
  document.getElementById('confirm-delete-btn').onclick = async () => {
    try {
      await Admin.deleteMessage(messageId);
      closeModal('confirm-delete-modal');
      toast('Message supprimé.', 'success');
      await renderStats();
      await renderRepliesTab();
    } catch (e) {
      toast(e.message || 'Erreur', 'error');
    }
  };
}

async function toggleBan(userId) {
  try {
    const data = await Admin.banUser(userId);
    toast(data.message, 'success');
    await renderStats();
    await renderUsersTab();
  } catch (e) {
    toast(e.message || 'Erreur', 'error');
  }
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ─── UTILS ────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}