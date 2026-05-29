// ─── STATE ───────────────────────────────────────────────────────────────────
let session = DB.getSession();
let activeCategory = 'all';
let activeArtist = null;
let activeTag = null;
let searchQuery = '';
let sortMode = 'recent';
let perPage = 10;
let currentPage = 1;
let newTopicTags = [];

const ALL_TAGS = ['Hip-hop','R&B','Pop','Rock','Jazz','Electronic','Reggae','Classical','Indie',
  'Kendrick Lamar','Daft Punk','Miles Davis','The Beatles','Bob Marley','Beethoven','Radiohead'];

// ─── INIT ─────────────────────────────────────────────────────────────────────
renderHeaderUser();
renderTopics();
renderPopular();
bindSidebar();
bindSearch();
bindSortPerPage();
buildTagSuggestions();

// ─── HEADER ───────────────────────────────────────────────────────────────────
function renderHeaderUser() {
  const area = document.getElementById('header-user-area');
  const newBtn = document.getElementById('new-topic-btn');

  if (!session) {
    area.innerHTML = `<a class="btn btn-outline" href="connexion.html" style="color:#fff;border-color:rgba(255,255,255,0.5)">Se connecter</a>`;
    return;
  }

  newBtn.style.display = '';
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

  document.getElementById('user-chip').addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('open');
  });
}

function doLogout() {
  DB.clearSession();
  window.location.reload();
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function bindSidebar() {
  document.querySelectorAll('[data-category]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      activeCategory = el.dataset.category;
      activeArtist = null;
      activeTag = null;
      currentPage = 1;
      document.querySelectorAll('.categorie').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      updateContentTitle();
      renderTopics();
    });
  });

  document.querySelectorAll('[data-artist]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      activeArtist = el.dataset.artist;
      activeCategory = null;
      activeTag = null;
      currentPage = 1;
      document.querySelectorAll('.categorie').forEach(c => c.classList.remove('active'));
      updateContentTitle();
      renderTopics();
    });
  });

  // dropdown toggles
  document.querySelectorAll('.dropdown > .categorie').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const dd = el.parentElement;
      dd.classList.toggle('open');
    });
  });
}

function updateContentTitle() {
  const t = document.getElementById('content-title');
  if (searchQuery) { t.textContent = `Résultats pour "${searchQuery}"`; return; }
  if (activeArtist) { t.textContent = activeArtist; return; }
  if (activeTag) { t.textContent = '#' + activeTag; return; }
  if (activeCategory === 'all' || !activeCategory) { t.textContent = 'Tous les topics'; return; }
  t.textContent = activeCategory;
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
function bindSearch() {
  const input = document.getElementById('searchInput');
  input.addEventListener('input', () => {
    searchQuery = input.value.trim().toLowerCase();
    currentPage = 1;
    updateContentTitle();
    renderTopics();
  });
}

// ─── SORT & PER PAGE ──────────────────────────────────────────────────────────
function bindSortPerPage() {
  document.getElementById('sort-select').addEventListener('change', e => {
    sortMode = e.target.value;
    currentPage = 1;
    renderTopics();
  });
  document.getElementById('per-page-select').addEventListener('change', e => {
    perPage = parseInt(e.target.value);
    currentPage = 1;
    renderTopics();
  });
}

// ─── TAG FILTER BAR ───────────────────────────────────────────────────────────
function renderTagFilterBar() {
  const bar = document.getElementById('tag-filter-bar');
  bar.innerHTML = ALL_TAGS.map(tag =>
    `<span class="tag ${activeTag === tag ? 'active' : ''}" onclick="setTagFilter('${tag}')">${tag}</span>`
  ).join('');
}

function setTagFilter(tag) {
  if (activeTag === tag) { activeTag = null; } else {
    activeTag = tag;
    activeCategory = null;
    activeArtist = null;
    document.querySelectorAll('.categorie').forEach(c => c.classList.remove('active'));
  }
  currentPage = 1;
  updateContentTitle();
  renderTopics();
}

renderTagFilterBar();

// ─── FILTER + SORT TOPICS ─────────────────────────────────────────────────────
function getFilteredTopics() {
  let topics = DB.getTopics();

  // search
  if (searchQuery) {
    topics = topics.filter(t => {
      const hay = [t.title, t.body, t.category, ...(t.tags || [])].join(' ').toLowerCase();
      return hay.includes(searchQuery);
    });
  }

  // category
  if (activeCategory && activeCategory !== 'all') {
    topics = topics.filter(t => t.category === activeCategory || (t.tags || []).includes(activeCategory));
  }

  // artist tag
  if (activeArtist) {
    topics = topics.filter(t => (t.tags || []).includes(activeArtist) || t.title.includes(activeArtist) || t.body.includes(activeArtist));
  }

  // tag filter
  if (activeTag) {
    topics = topics.filter(t => (t.tags || []).includes(activeTag));
  }

  // sort
  topics = [...topics];
  if (sortMode === 'recent') topics.sort((a, b) => b.createdAt - a.createdAt);
  else if (sortMode === 'ancien') topics.sort((a, b) => a.createdAt - b.createdAt);
  else if (sortMode === 'popular') topics.sort((a, b) => score(b) - score(a));
  else if (sortMode === 'like') topics.sort((a, b) => b.likes.length - a.likes.length);

  return topics;
}

function score(t) { return (t.likes || []).length * 3 - (t.dislikes || []).length + (t.views || 0) * 0.1; }

// ─── RENDER TOPICS ────────────────────────────────────────────────────────────
function renderTopics() {
  const filtered = getFilteredTopics();
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * perPage;
  const paginated = filtered.slice(start, start + perPage);

  const container = document.getElementById('topics-list');

  // active filters display
  const af = document.getElementById('active-filters');
  const parts = [];
  if (activeTag) parts.push(`Tag: <span class="tag active" onclick="setTagFilter('${activeTag}')">${activeTag} ×</span>`);
  af.innerHTML = parts.join(' ');

  if (paginated.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="emoji">🎵</div><p>Aucun topic trouvé.</p></div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  container.innerHTML = paginated.map(t => renderTopicCard(t)).join('');

  // attach vote listeners
  container.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (!session) { toast('Connectez-vous pour voter.', 'error'); return; }
      const topicId = btn.dataset.id;
      const type = btn.dataset.type;
      DB.toggleTopicLike(topicId, session.id, type);
      renderTopics();
      renderPopular();
    });
  });

  renderPagination(totalPages);
}

function renderTopicCard(t) {
  const author = DB.findUser(t.authorId);
  const authorName = author ? (author.banned ? '[banni]' : author.username) : 'Inconnu';
  const replies = DB.getTopicReplies(t.id);
  const isLiked = session && t.likes.includes(session.id);
  const isDisliked = session && t.dislikes.includes(session.id);
  const statusBadge = { open: 'badge-open', closed: 'badge-closed', archived: 'badge-archived' }[t.status];
  const statusLabel = { open: 'Ouvert', closed: 'Fermé', archived: 'Archivé' }[t.status];

  return `
  <div class="topic-card" onclick="goTopic('${t.id}')">
    <div class="topic-card-header">
      <h3 class="topic-card-title">${escHtml(t.title)}</h3>
      <span class="badge ${statusBadge}">${statusLabel}</span>
    </div>
    <div class="topic-card-meta">
      <span> ${escHtml(authorName)}</span>
      <span> ${escHtml(t.category)}</span>
      <span> ${timeAgo(t.createdAt)}</span>
      <span> ${t.views || 0} vues</span>
      <span> ${replies.length} réponses</span>
    </div>
    <div class="topic-card-tags">
      ${(t.tags || []).map(tag => `<span class="tag" onclick="event.stopPropagation();setTagFilter('${escHtml(tag)}')">${escHtml(tag)}</span>`).join('')}
    </div>
    <div class="topic-card-footer">
      <div class="vote-row">
        <button class="vote-btn ${isLiked ? 'liked' : ''}" data-id="${t.id}" data-type="like" onclick="event.stopPropagation()">
          ↑ ${t.likes.length}
        </button>
        <button class="vote-btn ${isDisliked ? 'disliked' : ''}" data-id="${t.id}" data-type="dislikes" onclick="event.stopPropagation()">
          ↓ ${t.dislikes.length}
        </button>
        <span style="font-size:0.78rem;color:var(--text-muted);margin-left:4px">Score: ${topicScore(t)}</span>
      </div>
      <span style="font-size:0.78rem;color:var(--text-muted)">${formatDate(t.createdAt)}</span>
    </div>
  </div>`;
}

function topicScore(t) { return (t.likes || []).length - (t.dislikes || []).length; }

// ─── PAGINATION ───────────────────────────────────────────────────────────────
function renderPagination(totalPages) {
  const p = document.getElementById('pagination');
  if (totalPages <= 1) { p.innerHTML = ''; return; }
  let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goPage(${currentPage - 1})">‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goPage(${currentPage + 1})">›</button>`;
  p.innerHTML = html;
}

function goPage(n) { currentPage = n; renderTopics(); window.scrollTo(0, 0); }

// ─── POPULAR ──────────────────────────────────────────────────────────────────
function renderPopular() {
  const popular = DB.getTopics()
    .sort((a, b) => score(b) - score(a))
    .slice(0, 5);

  document.getElementById('popular-topics').innerHTML = popular.map(t => `
    <div class="popular-topic" onclick="goTopic('${t.id}')">
      <span class="popular-topic-title">${escHtml(t.title)}</span>
      <span class="popular-topic-score">👍 ${t.likes.length} · 💬 ${DB.getTopicReplies(t.id).length}</span>
    </div>`).join('');
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function goTopic(id) {
  // increment views
  const t = DB.findTopic(id);
  if (t) DB.updateTopic(id, { views: (t.views || 0) + 1 });
  window.location.href = `topic.html?id=${id}`;
}

// ─── NEW TOPIC MODAL ──────────────────────────────────────────────────────────
function openNewTopicModal() {
  if (!session) { window.location.href = 'connexion.html'; return; }
  openModal('new-topic-modal');
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// click outside modal to close
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ─── TAGS INPUT ───────────────────────────────────────────────────────────────
function buildTagSuggestions() {
  const sugg = document.getElementById('tag-suggestions');
  sugg.innerHTML = ALL_TAGS.map(t =>
    `<span class="tag" onclick="addTag('${t}')">${t}</span>`
  ).join('');

  document.getElementById('tag-text-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = e.target.value.trim();
      if (val) addTag(val);
      e.target.value = '';
    } else if (e.key === 'Backspace' && !e.target.value && newTopicTags.length) {
      newTopicTags.pop();
      renderTagPills();
    }
  });
}

function addTag(tag) {
  if (!newTopicTags.includes(tag) && newTopicTags.length < 8) {
    newTopicTags.push(tag);
    renderTagPills();
  }
}

function removeTag(tag) {
  newTopicTags = newTopicTags.filter(t => t !== tag);
  renderTagPills();
}

function renderTagPills() {
  const area = document.getElementById('tags-input-area');
  const input = document.getElementById('tag-text-input');
  area.innerHTML = '';
  newTopicTags.forEach(tag => {
    const pill = document.createElement('span');
    pill.className = 'tag-pill';
    pill.innerHTML = `${escHtml(tag)}<button class="tag-pill-remove" onclick="removeTag('${tag}')">×</button>`;
    area.appendChild(pill);
  });
  area.appendChild(input);
}

function submitNewTopic() {
  const title = document.getElementById('nt-title').value.trim();
  const body = document.getElementById('nt-body').value.trim();
  const category = document.getElementById('nt-category').value;
  const status = document.getElementById('nt-status').value;
  const err = document.getElementById('nt-error');
  err.textContent = '';

  if (!title) { err.textContent = 'Le titre est obligatoire.'; return; }
  if (!body) { err.textContent = 'Le corps est obligatoire.'; return; }
  if (!category) { err.textContent = 'Choisissez une catégorie.'; return; }

  const tags = newTopicTags.length ? newTopicTags : [category];

  const topic = DB.createTopic({ title, body, category, tags, authorId: session.id, status });
  closeModal('new-topic-modal');
  document.getElementById('nt-title').value = '';
  document.getElementById('nt-body').value = '';
  document.getElementById('nt-category').value = '';
  newTopicTags = [];
  renderTagPills();
  toast('Post publié !', 'success');
  renderTopics();
  renderPopular();
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d}j`;
  return formatDate(ts);
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
