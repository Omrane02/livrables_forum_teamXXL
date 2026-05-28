// ─── STATE ───────────────────────────────────────────────────────────────────
const session = DB.getSession();
const params = new URLSearchParams(window.location.search);
const topicId = params.get('id');
let topic = null;
let sortReplies = 'chrono';
let repliesPage = 1;
let repliesPerPage = 10;
let pendingDeleteFn = null;

// ─── INIT ─────────────────────────────────────────────────────────────────────
renderHeaderUser();
if (!topicId) {
  document.getElementById('topic-content').innerHTML = `<div class="empty-state"><div class="emoji">❌</div><p>Topic introuvable.</p></div>`;
} else {
  topic = DB.findTopic(topicId);
  if (!topic) {
    document.getElementById('topic-content').innerHTML = `<div class="empty-state"><div class="emoji">❌</div><p>Ce topic n'existe plus.</p></div>`;
  } else {
    renderTopic();
    renderReplies();
    setupReplyForm();
  }
}

// search redirect
document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    window.location.href = `index.html?search=${encodeURIComponent(e.target.value.trim())}`;
  }
});

// replies per page
document.getElementById('replies-per-page').addEventListener('change', e => {
  repliesPerPage = parseInt(e.target.value);
  repliesPage = 1;
  renderReplies();
});

// ─── HEADER ───────────────────────────────────────────────────────────────────
function renderHeaderUser() {
  const area = document.getElementById('header-user-area');
  if (!session) {
    area.innerHTML = `<a class="btn btn-outline" href="connexion.html" style="color:#fff;border-color:rgba(255,255,255,0.5)">Se connecter</a>`;
    return;
  }
  const initials = session.username.slice(0, 2).toUpperCase();
  const isAdmin = session.role === 'admin';
  area.innerHTML = `
    <div class="user-chip" id="user-chip">
      <div class="avatar">${initials}</div>
      <span>${session.username}</span>
      ${isAdmin ? '<span class="badge badge-admin" style="font-size:0.65rem">ADMIN</span>' : ''}
      <div class="user-dropdown">
        ${isAdmin ? '<a href="admin.html">🛠 Panneau admin</a>' : ''}
        <button class="danger" onclick="doLogout()">Déconnexion</button>
      </div>
    </div>`;
  document.getElementById('user-chip').addEventListener('click', e => e.currentTarget.classList.toggle('open'));
}

function doLogout() { DB.clearSession(); window.location.href = 'index.html'; }

// ─── TOPIC ────────────────────────────────────────────────────────────────────
function renderTopic() {
  topic = DB.findTopic(topicId); // refresh
  const author = DB.findUser(topic.authorId);
  const authorName = author ? (author.banned ? '[banni]' : author.username) : 'Inconnu';
  const isOwner = session && (session.id === topic.authorId || session.role === 'admin');
  const isAdmin = session && session.role === 'admin';
  const isLiked = session && topic.likes.includes(session.id);
  const isDisliked = session && topic.dislikes.includes(session.id);
  const statusBadge = { open: 'badge-open', closed: 'badge-closed', archived: 'badge-archived' }[topic.status];
  const statusLabel = { open: 'Ouvert', closed: 'Fermé', archived: 'Archivé' }[topic.status];

  document.title = escHtml(topic.title) + ' — Plein les oreilles';

  document.getElementById('topic-content').innerHTML = `
    <div class="topic-header">
      <h1 class="topic-title">${escHtml(topic.title)}</h1>
      <div class="topic-meta-row">
        <span>👤 <strong>${escHtml(authorName)}</strong></span>
        <span>📁 ${escHtml(topic.category)}</span>
        <span>🕒 ${formatDate(topic.createdAt)}</span>
        <span>👁 ${topic.views || 0} vues</span>
        <span class="badge ${statusBadge}">${statusLabel}</span>
      </div>
      <div class="topic-tags">
        ${(topic.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
      </div>
      <p class="topic-body">${escHtml(topic.body)}</p>
      <div class="topic-actions">
        <div class="vote-row">
          <button class="vote-btn ${isLiked ? 'liked' : ''}" id="topic-like-btn" onclick="voteTopic('like')">👍 ${topic.likes.length}</button>
          <button class="vote-btn ${isDisliked ? 'disliked' : ''}" id="topic-dislike-btn" onclick="voteTopic('dislikes')">👎 ${topic.dislikes.length}</button>
          <span style="font-size:0.82rem;color:var(--text-muted);margin-left:6px">Score: ${topic.likes.length - topic.dislikes.length}</span>
        </div>
        <div class="owner-actions">
          ${isOwner ? `<button class="btn btn-outline btn-sm" onclick="openEditStatus()">✏️ État</button>` : ''}
          ${isOwner ? `<button class="btn btn-danger btn-sm" onclick="confirmDeleteTopic()">🗑 Supprimer</button>` : ''}
        </div>
      </div>
    </div>`;
}

function voteTopic(type) {
  if (!session) { toast('Connectez-vous pour voter.', 'error'); return; }
  DB.toggleTopicLike(topicId, session.id, type);
  topic = DB.findTopic(topicId);
  renderTopic();
}

// ─── REPLIES ──────────────────────────────────────────────────────────────────
function setSortReplies(sort, btn) {
  sortReplies = sort;
  repliesPage = 1;
  document.querySelectorAll('.sort-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderReplies();
}

function renderReplies() {
  topic = DB.findTopic(topicId);
  let replies = DB.getTopicReplies(topicId);

  if (sortReplies === 'chrono') replies.sort((a, b) => a.createdAt - b.createdAt);
  else replies.sort((a, b) => (b.likes.length - b.dislikes.length) - (a.likes.length - a.dislikes.length));

  const total = replies.length;
  const totalPages = Math.max(1, Math.ceil(total / repliesPerPage));
  repliesPage = Math.min(repliesPage, totalPages);
  const start = (repliesPage - 1) * repliesPerPage;
  const page = replies.slice(start, start + repliesPerPage);

  document.getElementById('replies-section').style.display = '';
  document.getElementById('replies-count').textContent = `${total} réponse${total !== 1 ? 's' : ''}`;

  const list = document.getElementById('replies-list');
  if (page.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="emoji">💬</div><p>Aucune réponse encore. Soyez le premier !</p></div>`;
  } else {
    list.innerHTML = page.map(r => renderReplyCard(r)).join('');
    // vote listeners
    list.querySelectorAll('.reply-vote-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!session) { toast('Connectez-vous pour voter.', 'error'); return; }
        DB.toggleReplyLike(btn.dataset.id, session.id, btn.dataset.type);
        renderReplies();
      });
    });
    // delete listeners
    list.querySelectorAll('.delete-reply-btn').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteReply(btn.dataset.id));
    });
  }

  renderRepliesPagination(totalPages);
}

function renderReplyCard(r) {
  const author = DB.findUser(r.authorId);
  const authorName = author ? (author.banned ? '[banni]' : author.username) : 'Inconnu';
  const initials = authorName.slice(0, 2).toUpperCase();
  const isOwner = session && (session.id === topic.authorId || session.id === r.authorId || session.role === 'admin');
  const isLiked = session && r.likes.includes(session.id);
  const isDisliked = session && r.dislikes.includes(session.id);

  return `
    <div class="reply-card" id="reply-${r.id}">
      <div class="reply-card-header">
        <div class="reply-author">
          <div class="mini-avatar">${initials}</div>
          <span>${escHtml(authorName)}</span>
          ${author && author.role === 'admin' ? '<span class="badge badge-admin" style="font-size:0.68rem">ADMIN</span>' : ''}
        </div>
        <span class="reply-date">${formatDate(r.createdAt)}</span>
      </div>
      <p class="reply-body">${escHtml(r.body)}</p>
      <div class="reply-footer">
        <div class="vote-row">
          <button class="reply-vote-btn vote-btn ${isLiked ? 'liked' : ''}" data-id="${r.id}" data-type="like">👍 ${r.likes.length}</button>
          <button class="reply-vote-btn vote-btn ${isDisliked ? 'disliked' : ''}" data-id="${r.id}" data-type="dislikes">👎 ${r.dislikes.length}</button>
        </div>
        ${isOwner ? `<button class="btn btn-ghost btn-sm delete-reply-btn" data-id="${r.id}">🗑 Supprimer</button>` : ''}
      </div>
    </div>`;
}

function renderRepliesPagination(totalPages) {
  const p = document.getElementById('replies-pagination');
  if (totalPages <= 1) { p.innerHTML = ''; return; }
  let html = `<button class="page-btn" ${repliesPage === 1 ? 'disabled' : ''} onclick="goRepliesPage(${repliesPage - 1})">‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === repliesPage ? 'active' : ''}" onclick="goRepliesPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" ${repliesPage === totalPages ? 'disabled' : ''} onclick="goRepliesPage(${repliesPage + 1})">›</button>`;
  p.innerHTML = html;
}

function goRepliesPage(n) { repliesPage = n; renderReplies(); }

// ─── REPLY FORM ───────────────────────────────────────────────────────────────
function setupReplyForm() {
  const formSection = document.getElementById('reply-form-section');
  const loginPrompt = document.getElementById('login-prompt');

  if (!session) { loginPrompt.style.display = ''; return; }

  // Don't allow replies on closed/archived topics unless admin
  if (topic.status !== 'open' && session.role !== 'admin') {
    formSection.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:20px">Ce topic est ${topic.status === 'closed' ? 'fermé' : 'archivé'}. Impossible de répondre.</p>`;
    formSection.style.display = '';
    return;
  }

  formSection.style.display = '';
}

function submitReply() {
  if (!session) { toast('Connectez-vous pour répondre.', 'error'); return; }
  const body = document.getElementById('reply-body').value.trim();
  const err = document.getElementById('reply-error');
  err.textContent = '';
  if (!body) { err.textContent = 'La réponse ne peut pas être vide.'; return; }

  DB.createReply({ topicId, body, authorId: session.id });
  document.getElementById('reply-body').value = '';
  toast('Réponse publiée !', 'success');
  sortReplies = 'chrono';
  repliesPage = 999; // go to last page
  renderReplies();
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
function confirmDeleteTopic() {
  document.getElementById('confirm-delete-text').textContent = 'Voulez-vous vraiment supprimer ce topic et toutes ses réponses ?';
  pendingDeleteFn = () => {
    DB.deleteTopic(topicId);
    closeModal('confirm-delete-modal');
    toast('Topic supprimé.', 'success');
    setTimeout(() => window.location.href = 'index.html', 800);
  };
  openModal('confirm-delete-modal');
  document.getElementById('confirm-delete-btn').onclick = pendingDeleteFn;
}

function confirmDeleteReply(replyId) {
  document.getElementById('confirm-delete-text').textContent = 'Voulez-vous vraiment supprimer cette réponse ?';
  document.getElementById('confirm-delete-btn').onclick = () => {
    DB.deleteReply(replyId);
    closeModal('confirm-delete-modal');
    toast('Réponse supprimée.', 'success');
    renderReplies();
  };
  openModal('confirm-delete-modal');
}

// ─── STATUS EDIT ──────────────────────────────────────────────────────────────
function openEditStatus() {
  document.getElementById('edit-status-select').value = topic.status;
  openModal('edit-status-modal');
}

function saveStatus() {
  const newStatus = document.getElementById('edit-status-select').value;
  DB.updateTopic(topicId, { status: newStatus });
  topic = DB.findTopic(topicId);
  closeModal('edit-status-modal');
  toast('État mis à jour.', 'success');
  renderTopic();
  setupReplyForm();
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
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
