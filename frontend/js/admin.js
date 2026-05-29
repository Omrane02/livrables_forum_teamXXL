// ─── GUARD ───────────────────────────────────────────────────────────────────
const session = DB.getSession();
if (!session || session.role !== 'admin') {
  alert('Accès réservé aux administrateurs.');
  window.location.href = 'index.html';
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
renderStats();
renderTopicsTab();

function doLogout() { DB.clearSession(); window.location.href = 'index.html'; }

// ─── TABS ─────────────────────────────────────────────────────────────────────
function showTab(name, btn) {
  ['topics', 'replies', 'users'].forEach(t => {
    document.getElementById('tab-' + t).style.display = t === name ? '' : 'none';
  });
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (name === 'topics') renderTopicsTab();
  if (name === 'replies') renderRepliesTab();
  if (name === 'users') renderUsersTab();
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function renderStats() {
  const topics = DB.getTopics();
  const replies = DB.getReplies();
  const users = DB.getUsers();
  const banned = users.filter(u => u.banned).length;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><span class="stat-label">Topics</span><span class="stat-value">${topics.length}</span></div>
    <div class="stat-card"><span class="stat-label">Messages</span><span class="stat-value">${replies.length}</span></div>
    <div class="stat-card"><span class="stat-label">Utilisateurs</span><span class="stat-value">${users.length}</span></div>
    <div class="stat-card"><span class="stat-label">Bannis</span><span class="stat-value">${banned}</span></div>
    <div class="stat-card"><span class="stat-label">Topics ouverts</span><span class="stat-value">${topics.filter(t=>t.status==='open').length}</span></div>
    <div class="stat-card"><span class="stat-label">Topics archivés</span><span class="stat-value">${topics.filter(t=>t.status==='archived').length}</span></div>`;
}

// ─── TOPICS TAB ───────────────────────────────────────────────────────────────
function renderTopicsTab() {
  const topics = DB.getTopics().sort((a, b) => b.createdAt - a.createdAt);
  const tbody = document.getElementById('topics-tbody');
  const statusBadge = { open: 'badge-open', closed: 'badge-closed', archived: 'badge-archived' };
  const statusLabel = { open: 'Ouvert', closed: 'Fermé', archived: 'Archivé' };

  tbody.innerHTML = topics.map(t => {
    const author = DB.findUser(t.authorId);
    const replies = DB.getTopicReplies(t.id).length;
    return `<tr>
      <td><a href="topic.html?id=${t.id}" style="color:var(--accent-strong);font-weight:600">${escHtml(t.title)}</a></td>
      <td>${escHtml(author ? author.username : 'Inconnu')}</td>
      <td>${escHtml(t.category)}</td>
      <td><span class="badge ${statusBadge[t.status]}">${statusLabel[t.status]}</span></td>
      <td>↑ ${t.likes.length} / ↓ ${t.dislikes.length}</td>
      <td> ${replies}</td>
      <td>${formatDate(t.createdAt)}</td>
      <td class="td-actions">
        <button class="btn btn-outline btn-sm" onclick="adminEditStatus('${t.id}', '${t.status}')"> État</button>
        <button class="btn btn-danger btn-sm" onclick="adminDeleteTopic('${t.id}')">Suprimer</button>
      </td>
    </tr>`;
  }).join('');
}

// ─── REPLIES TAB ──────────────────────────────────────────────────────────────
function renderRepliesTab() {
  const replies = DB.getReplies().sort((a, b) => b.createdAt - a.createdAt);
  const tbody = document.getElementById('replies-tbody');

  tbody.innerHTML = replies.map(r => {
    const author = DB.findUser(r.authorId);
    const topic = DB.findTopic(r.topicId);
    return `<tr>
      <td><a href="topic.html?id=${r.topicId}" style="color:var(--accent-strong)">${escHtml(topic ? topic.title : '[supprimé]')}</a></td>
      <td>${escHtml(author ? author.username : 'Inconnu')}</td>
      <td>${escHtml(r.body.slice(0, 80))}${r.body.length > 80 ? '…' : ''}</td>
      <td>↑ ${r.likes.length} / ↓ ${r.dislikes.length}</td>
      <td>${formatDate(r.createdAt)}</td>
      <td class="td-actions">
        <button class="btn btn-danger btn-sm" onclick="adminDeleteReply('${r.id}')">Supprimer</button>
      </td>
    </tr>`;
  }).join('');
}

// ─── USERS TAB ────────────────────────────────────────────────────────────────
function renderUsersTab() {
  const users = DB.getUsers().sort((a, b) => a.createdAt - b.createdAt);
  const tbody = document.getElementById('users-tbody');
  const topics = DB.getTopics();

  tbody.innerHTML = users.map(u => {
    const userTopics = topics.filter(t => t.authorId === u.id).length;
    return `<tr>
      <td><strong>${escHtml(u.username)}</strong></td>
      <td>${escHtml(u.email)}</td>
      <td>${u.role === 'admin' ? '<span class="badge badge-admin">ADMIN</span>' : 'Utilisateur'}</td>
      <td>${u.banned ? '<span class="badge badge-closed">Banni</span>' : '<span class="badge badge-open">Actif</span>'}</td>
      <td>${formatDate(u.createdAt)}</td>
      <td>${userTopics}</td>
      <td class="td-actions">
        ${u.id !== session.id && u.role !== 'admin' ? `
          <button class="btn btn-sm ${u.banned ? 'btn-outline' : 'btn-danger'}" onclick="toggleBan('${u.id}', ${u.banned})">
            ${u.banned ? 'Débannir' : 'Bannir'}
          </button>` : '<em style="color:var(--text-muted);font-size:0.8rem">Protégé</em>'}
      </td>
    </tr>`;
  }).join('');
}

// ─── ADMIN ACTIONS ────────────────────────────────────────────────────────────
function adminEditStatus(topicId, currentStatus) {
  document.getElementById('admin-status-select').value = currentStatus;
  openModal('edit-status-modal');
  document.getElementById('save-status-btn').onclick = () => {
    const newStatus = document.getElementById('admin-status-select').value;
    DB.updateTopic(topicId, { status: newStatus });
    closeModal('edit-status-modal');
    toast('État mis à jour.', 'success');
    renderStats();
    renderTopicsTab();
  };
}

function adminDeleteTopic(topicId) {
  document.getElementById('confirm-delete-text').textContent = 'Supprimer ce topic et toutes ses réponses ?';
  openModal('confirm-delete-modal');
  document.getElementById('confirm-delete-btn').onclick = () => {
    DB.deleteTopic(topicId);
    closeModal('confirm-delete-modal');
    toast('Topic supprimé.', 'success');
    renderStats();
    renderTopicsTab();
  };
}

function adminDeleteReply(replyId) {
  document.getElementById('confirm-delete-text').textContent = 'Supprimer ce message ?';
  openModal('confirm-delete-modal');
  document.getElementById('confirm-delete-btn').onclick = () => {
    DB.deleteReply(replyId);
    closeModal('confirm-delete-modal');
    toast('Message supprimé.', 'success');
    renderStats();
    renderRepliesTab();
  };
}

function toggleBan(userId, isBanned) {
  DB.updateUser(userId, { banned: !isBanned });
  toast(isBanned ? 'Utilisateur débanni.' : 'Utilisateur banni.', 'success');
  renderStats();
  renderUsersTab();
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
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
