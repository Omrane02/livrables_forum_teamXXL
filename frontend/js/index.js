// ─── STATE ────────────────────────────────────────────────────────────────────
const session     = Session.get();
let activeTag     = null;
let searchQuery   = '';
let sortMode      = 'recent';
let perPage       = 10;
let currentPage   = 1;
let newTopicTags  = [];
let allTags       = [];

// ─── INIT ─────────────────────────────────────────────────────────────────────
(async () => {
  await loadTags();
  renderHeaderUser();
  renderTagFilterBar();
  buildTagSuggestions();
  bindSidebar();
  bindSearch();
  bindSortPerPage();
  await renderTopics();
  await renderPopular();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('search')) {
    searchQuery = urlParams.get('search');
    document.getElementById('searchInput').value = searchQuery;
    await renderTopics();
  }
})();

// ─── LOAD TAGS ────────────────────────────────────────────────────────────────
async function loadTags() {
  try {
    const data = await Topics.getTags();
    allTags = data.data || [];
  } catch {
    allTags = [];
  }
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function renderHeaderUser() {
  const area   = document.getElementById('header-user-area');
  const newBtn = document.getElementById('new-topic-btn');

  if (!session) {
    area.innerHTML = `<a class="btn btn-outline" href="connexion.html" style="color:#fff;border-color:rgba(255,255,255,0.5)">Se connecter</a>`;
    return;
  }

  newBtn.style.display = '';
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

  document.getElementById('user-chip').addEventListener('click', e => {
    e.currentTarget.classList.toggle('open');
  });
}

function doLogout() { Auth.logout(); }

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function bindSidebar() {
  document.querySelectorAll('[data-category]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      activeTag = el.dataset.category !== 'all' ? el.dataset.category : null;
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
      activeTag = el.dataset.artist;
      currentPage = 1;
      document.querySelectorAll('.categorie').forEach(c => c.classList.remove('active'));
      updateContentTitle();
      renderTopics();
    });
  });

  document.querySelectorAll('.dropdown > .categorie').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      el.parentElement.classList.toggle('open');
    });
  });
}

function updateContentTitle() {
  const t = document.getElementById('content-title');
  if (searchQuery) { t.textContent = `Résultats pour "${searchQuery}"`; return; }
  if (activeTag)   { t.textContent = '#' + activeTag; return; }
  t.textContent = 'Tous les topics';
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
function bindSearch() {
  const input = document.getElementById('searchInput');
  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      searchQuery = input.value.trim();
      currentPage = 1;
      updateContentTitle();
      await renderTopics();
    }, 400);
  });
}

// ─── SORT & PER PAGE ──────────────────────────────────────────────────────────
function bindSortPerPage() {
  document.getElementById('sort-select').addEventListener('change', async e => {
    sortMode = e.target.value;
    currentPage = 1;
    await renderTopics();
  });
  document.getElementById('per-page-select').addEventListener('change', async e => {
    perPage = parseInt(e.target.value);
    currentPage = 1;
    await renderTopics();
  });
}

// ─── TAG FILTER BAR ───────────────────────────────────────────────────────────
function renderTagFilterBar() {
  const bar = document.getElementById('tag-filter-bar');
  bar.innerHTML = allTags.map(tag =>
    `<span class="tag ${activeTag === tag.name ? 'active' : ''}" onclick="setTagFilter('${escHtml(tag.name)}')">${escHtml(tag.name)}</span>`
  ).join('');
}

async function setTagFilter(tag) {
  activeTag   = activeTag === tag ? null : tag;
  currentPage = 1;
  renderTagFilterBar();
  updateContentTitle();
  await renderTopics();
}

// ─── RENDER TOPICS ────────────────────────────────────────────────────────────
async function renderTopics() {
  const container = document.getElementById('topics-list');
  container.innerHTML = `<div class="empty-state"><div class="emoji">⏳</div><p>Chargement...</p></div>`;

  try {
    const sortParam = sortMode === 'popular' ? 'popularity' : 'date';
    const data = await Topics.getAll({
      page:   currentPage,
      limit:  perPage,
      search: searchQuery,
      tag:    activeTag || '',
      sort:   sortParam,
    });

    const topics     = data.data || [];
    const pagination = data.pagination || {};

    const af = document.getElementById('active-filters');
    af.innerHTML = activeTag
      ? `Tag: <span class="tag active" onclick="setTagFilter('${escHtml(activeTag)}')">${escHtml(activeTag)} ×</span>`
      : '';

    if (topics.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="emoji">🎵</div><p>Aucun topic trouvé.</p></div>`;
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    container.innerHTML = topics.map(t => renderTopicCard(t)).join('');
    renderPagination(pagination.totalPages || 1);

  } catch (e) {
    container.innerHTML = `<div class="empty-state"><div class="emoji">❌</div><p>Erreur de chargement.</p></div>`;
  }
}

function renderTopicCard(t) {
  const tags        = t.tags ? t.tags.split(', ') : [];
  const statusBadge = { open: 'badge-open', closed: 'badge-closed', archived: 'badge-archived' }[t.status] || 'badge-open';
  const statusLabel = { open: 'Ouvert', closed: 'Fermé', archived: 'Archivé' }[t.status] || 'Ouvert';

  return `
  <div class="topic-card" onclick="goTopic('${t.id}')">
    <div class="topic-card-header">
      <h3 class="topic-card-title">${escHtml(t.title)}</h3>
      <span class="badge ${statusBadge}">${statusLabel}</span>
    </div>
    <div class="topic-card-meta">
      <span>👤 ${escHtml(t.author || 'Inconnu')}</span>
      <span>🕒 ${timeAgo(new Date(t.created_at).getTime())}</span>
    </div>
    <div class="topic-card-tags">
      ${tags.map(tag => `<span class="tag" onclick="event.stopPropagation();setTagFilter('${escHtml(tag)}')">${escHtml(tag)}</span>`).join('')}
    </div>
    <div class="topic-card-footer">
      <span style="font-size:0.78rem;color:var(--text-muted)">Score: ${t.popularity_score || 0}</span>
      <span style="font-size:0.78rem;color:var(--text-muted)">${formatDate(new Date(t.created_at).getTime())}</span>
    </div>
  </div>`;
}

// ─── POPULAR ──────────────────────────────────────────────────────────────────
async function renderPopular() {
  try {
    const data   = await Topics.getAll({ page: 1, limit: 5, sort: 'popularity' });
    const topics = data.data || [];
    document.getElementById('popular-topics').innerHTML = topics.map(t => `
      <div class="popular-topic" onclick="goTopic('${t.id}')">
        <span class="popular-topic-title">${escHtml(t.title)}</span>
        <span class="popular-topic-score">🔥 ${t.popularity_score || 0}</span>
      </div>`).join('');
  } catch {
    document.getElementById('popular-topics').innerHTML = '';
  }
}

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

async function goPage(n) { currentPage = n; await renderTopics(); window.scrollTo(0, 0); }

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function goTopic(id) { window.location.href = `topic.html?id=${id}`; }

// ─── NEW TOPIC MODAL ──────────────────────────────────────────────────────────
function openNewTopicModal() {
  if (!session) { window.location.href = 'connexion.html'; return; }
  openModal('new-topic-modal');
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ─── TAGS INPUT ───────────────────────────────────────────────────────────────
function buildTagSuggestions() {
  const sugg = document.getElementById('tag-suggestions');
  sugg.innerHTML = allTags.map(t =>
    `<span class="tag" onclick="addTag('${escHtml(t.name)}')">${escHtml(t.name)}</span>`
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
  const area  = document.getElementById('tags-input-area');
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

async function submitNewTopic() {
  const title = document.getElementById('nt-title').value.trim();
  const body  = document.getElementById('nt-body').value.trim();
  const status = document.getElementById('nt-status').value;
  const err   = document.getElementById('nt-error');
  err.textContent = '';

  if (!title) { err.textContent = 'Le titre est obligatoire.'; return; }
  if (!body)  { err.textContent = 'Le corps est obligatoire.'; return; }

  const tagIds = allTags
    .filter(t => newTopicTags.includes(t.name))
    .map(t => t.id);

  try {
    await Topics.create({ title, body, tags: tagIds, visibility: status === 'private' ? 'private' : 'public' });
    closeModal('new-topic-modal');
    document.getElementById('nt-title').value = '';
    document.getElementById('nt-body').value  = '';
    newTopicTags = [];
    renderTagPills();
    toast('Post publié !', 'success');
    await renderTopics();
    await renderPopular();
  } catch (e) {
    err.textContent = e.message || 'Erreur lors de la création.';
  }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 2)  return 'à l\'instant';
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