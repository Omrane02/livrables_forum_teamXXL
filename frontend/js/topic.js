// ─── STATE ────────────────────────────────────────────────────────────────────
const session      = Session.get();
const params       = new URLSearchParams(window.location.search);
const topicId      = params.get('id');
let topic          = null;
let sortReplies    = 'date';
let repliesPage    = 1;
let repliesPerPage = 10;
let topicVotes     = { likes: 0, dislikes: 0, score: 0, user_vote: null };

// ─── INIT ─────────────────────────────────────────────────────────────────────
(async () => {
  renderHeaderUser();

  if (!topicId) {
    document.getElementById('topic-content').innerHTML = `<div class="empty-state"><div class="emoji">❌</div><p>Topic introuvable.</p></div>`;
    return;
  }

  try {
    const data = await Topics.getById(topicId);
    topic = data.data;

    if (session) {
      try {
        const vData = await Votes.getTopicVotes(topicId);
        topicVotes = vData.data;
      } catch { }
    }

    renderTopic();
    await renderReplies();
    setupReplyForm();
  } catch (e) {
    document.getElementById('topic-content').innerHTML = `<div class="empty-state"><div class="emoji">❌</div><p>${e.message || 'Ce topic n\'existe plus.'}</p></div>`;
  }
})();

// search redirect
document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    window.location.href = `index.html?search=${encodeURIComponent(e.target.value.trim())}`;
  }
});

// replies per page
document.getElementById('replies-per-page').addEventListener('change', async e => {
  repliesPerPage = parseInt(e.target.value);
  repliesPage    = 1;
  await renderReplies();
});

// ─── HEADER ───────────────────────────────────────────────────────────────────
function renderHeaderUser() {
  const area = document.getElementById('header-user-area');
  if (!session) {
    area.innerHTML = `<a class="btn btn-outline" href="connexion.html" style="color:#fff;border-color:rgba(255,255,255,0.5)">Se connecter</a>`;
    return;
  }
  const initials = session.username.slice(0, 2).toUpperCase();
  const isAdmin  = session.role === 'admin';
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

function doLogout() { Auth.logout(); }

// ─── TOPIC ────────────────────────────────────────────────────────────────────
function renderTopic() {
  const isOwner     = session && (session.id === topic.author_id || session.role === 'admin');
  const tags        = topic.tags ? topic.tags.split(', ') : [];
  const statusBadge = { open: 'badge-open', closed: 'badge-closed', archived: 'badge-archived' }[topic.status] || 'badge-open';
  const statusLabel = { open: 'Ouvert', closed: 'Fermé', archived: 'Archivé' }[topic.status] || 'Ouvert';
  const isLiked     = topicVotes.user_vote === 'like';
  const isDisliked  = topicVotes.user_vote === 'dislike';

  document.title = escHtml(topic.title) + ' — Plein les oreilles';

  document.getElementById('topic-content').innerHTML = `
    <div class="topic-header">
      <h1 class="topic-title">${escHtml(topic.title)}</h1>
      <div class="topic-meta-row">
        <span>👤 <strong>${escHtml(topic.author || 'Inconnu')}</strong></span>
        <span>🕒 ${formatDate(new Date(topic.created_at).getTime())}</span>
        <span class="badge ${statusBadge}">${statusLabel}</span>
      </div>
      <div class="topic-tags">
        ${tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
      </div>
      <p class="topic-body">${escHtml(topic.body)}</p>
      <div class="topic-actions">
        <div class="vote-row">
          <button class="vote-btn ${isLiked ? 'liked' : ''}" onclick="voteOnTopic('like')">
            👍 ${topicVotes.likes}
          </button>
          <button class="vote-btn ${isDisliked ? 'disliked' : ''}" onclick="voteOnTopic('dislike')">
            👎 ${topicVotes.dislikes}
          </button>
          <span style="font-size:0.82rem;color:var(--text-muted);margin-left:6px">Score: ${topicVotes.score}</span>
        </div>
        <div class="owner-actions">
          ${isOwner ? `<button class="btn btn-outline btn-sm" onclick="openEditTopic()">✏️ Modifier</button>` : ''}
          ${isOwner ? `<button class="btn btn-outline btn-sm" onclick="openEditStatus()">🔄 État</button>` : ''}
          ${isOwner ? `<button class="btn btn-danger btn-sm" onclick="confirmDeleteTopic()">🗑 Supprimer</button>` : ''}
        </div>
      </div>
    </div>`;
}

// ─── VOTE TOPIC ───────────────────────────────────────────────────────────────
async function voteOnTopic(vote_type) {
  if (!session) { toast('Connectez-vous pour voter.', 'error'); return; }

  try {
    await Votes.voteTopic(topicId, vote_type);
    const vData = await Votes.getTopicVotes(topicId);
    topicVotes = vData.data;
    renderTopic();
  } catch (e) {
    toast(e.message || 'Erreur vote', 'error');
  }
}

// ─── EDIT TOPIC ───────────────────────────────────────────────────────────────
function openEditTopic() {
  document.getElementById('edit-topic-title').value   = topic.title;
  document.getElementById('edit-topic-body').value    = topic.body;
  document.getElementById('edit-topic-error').textContent = '';
  openModal('edit-topic-modal');
}

async function saveTopicEdit() {
  const title = document.getElementById('edit-topic-title').value.trim();
  const body  = document.getElementById('edit-topic-body').value.trim();
  const err   = document.getElementById('edit-topic-error');
  err.textContent = '';

  if (!title) { err.textContent = 'Le titre est obligatoire.'; return; }
  if (!body)  { err.textContent = 'Le corps est obligatoire.'; return; }

  try {
    await Topics.update(topicId, { title, body });
    topic.title = title;
    topic.body  = body;
    closeModal('edit-topic-modal');
    toast('Topic modifié avec succès.', 'success');
    renderTopic();
  } catch (e) {
    err.textContent = e.message || 'Erreur lors de la modification.';
  }
}

// ─── REPLIES ──────────────────────────────────────────────────────────────────
async function setSortReplies(sort, btn) {
  sortReplies = sort;
  repliesPage = 1;
  document.querySelectorAll('.sort-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  await renderReplies();
}

async function renderReplies() {
  try {
    const data       = await Messages.getByTopic(topicId, { page: repliesPage, limit: repliesPerPage, sort: sortReplies });
    const replies    = data.data || [];
    const pagination = data.pagination || {};

    document.getElementById('replies-section').style.display = '';
    document.getElementById('replies-count').textContent = `${pagination.total || 0} réponse${pagination.total !== 1 ? 's' : ''}`;

    const list = document.getElementById('replies-list');

    if (replies.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="emoji">💬</div><p>Aucune réponse encore. Soyez le premier !</p></div>`;
    } else {
      list.innerHTML = replies.map(r => renderReplyCard(r)).join('');

      list.querySelectorAll('.reply-vote-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!session) { toast('Connectez-vous pour voter.', 'error'); return; }
          try {
            await Votes.voteMessage(btn.dataset.id, btn.dataset.type);
            await renderReplies();
          } catch (e) {
            toast(e.message || 'Erreur vote', 'error');
          }
        });
      });

      list.querySelectorAll('.delete-reply-btn').forEach(btn => {
        btn.addEventListener('click', () => confirmDeleteReply(btn.dataset.id));
      });
    }

    renderRepliesPagination(pagination.totalPages || 1);

  } catch (e) {
    document.getElementById('replies-list').innerHTML = `<div class="empty-state"><p>Erreur de chargement.</p></div>`;
  }
}

function renderReplyCard(r) {
  const authorName = r.author || 'Inconnu';
  const initials   = authorName.slice(0, 2).toUpperCase();
  const isOwner    = session && (session.id === topic.author_id || session.id === r.author_id || session.role === 'admin');

  return `
    <div class="reply-card" id="reply-${r.id}">
      <div class="reply-card-header">
        <div class="reply-author">
          <div class="mini-avatar">${initials}</div>
          <span>${escHtml(authorName)}</span>
        </div>
        <span class="reply-date">${formatDate(new Date(r.sent_at).getTime())}</span>
      </div>
      <p class="reply-body">${escHtml(r.body)}</p>
      <div class="reply-footer">
        <div class="vote-row">
          <button class="reply-vote-btn vote-btn" data-id="${r.id}" data-type="like">👍</button>
          <button class="reply-vote-btn vote-btn" data-id="${r.id}" data-type="dislike">👎</button>
          <span style="font-size:0.82rem;color:var(--text-muted);margin-left:6px">Score: ${r.popularity_score || 0}</span>
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

async function goRepliesPage(n) { repliesPage = n; await renderReplies(); }

// ─── REPLY FORM ───────────────────────────────────────────────────────────────
function setupReplyForm() {
  const formSection = document.getElementById('reply-form-section');
  const loginPrompt = document.getElementById('login-prompt');

  if (!session) { loginPrompt.style.display = ''; return; }

  if (topic.status !== 'open' && session.role !== 'admin') {
    formSection.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:20px">Ce topic est ${topic.status === 'closed' ? 'fermé' : 'archivé'}. Impossible de répondre.</p>`;
    formSection.style.display = '';
    return;
  }

  formSection.style.display = '';
}

async function submitReply() {
  if (!session) { toast('Connectez-vous pour répondre.', 'error'); return; }
  const body = document.getElementById('reply-body').value.trim();
  const err  = document.getElementById('reply-error');
  err.textContent = '';

  if (!body) { err.textContent = 'La réponse ne peut pas être vide.'; return; }

  try {
    await Messages.create(topicId, body);
    document.getElementById('reply-body').value = '';
    toast('Réponse publiée !', 'success');
    repliesPage = 999;
    await renderReplies();
  } catch (e) {
    err.textContent = e.message || 'Erreur lors de l\'envoi.';
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
function confirmDeleteTopic() {
  document.getElementById('confirm-delete-text').textContent = 'Voulez-vous vraiment supprimer ce topic et toutes ses réponses ?';
  document.getElementById('confirm-delete-btn').onclick = async () => {
    try {
      await Topics.delete(topicId);
      closeModal('confirm-delete-modal');
      toast('Topic supprimé.', 'success');
      setTimeout(() => window.location.href = 'index.html', 800);
    } catch (e) {
      toast(e.message || 'Erreur suppression', 'error');
    }
  };
  openModal('confirm-delete-modal');
}

function confirmDeleteReply(replyId) {
  document.getElementById('confirm-delete-text').textContent = 'Voulez-vous vraiment supprimer cette réponse ?';
  document.getElementById('confirm-delete-btn').onclick = async () => {
    try {
      await Messages.delete(replyId);
      closeModal('confirm-delete-modal');
      toast('Réponse supprimée.', 'success');
      await renderReplies();
    } catch (e) {
      toast(e.message || 'Erreur suppression', 'error');
    }
  };
  openModal('confirm-delete-modal');
}

// ─── STATUS EDIT ──────────────────────────────────────────────────────────────
function openEditStatus() {
  document.getElementById('edit-status-select').value = topic.status;
  openModal('edit-status-modal');
}

async function saveStatus() {
  const newStatus = document.getElementById('edit-status-select').value;
  try {
    await Topics.update(topicId, { status: newStatus });
    topic.status = newStatus;
    closeModal('edit-status-modal');
    toast('État mis à jour.', 'success');
    renderTopic();
    setupReplyForm();
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