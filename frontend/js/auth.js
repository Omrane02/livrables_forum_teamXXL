// redirect if already logged in
const existing = Session.get();
if (existing) window.location.href = 'index.html';

// read ?tab=register param
const params = new URLSearchParams(window.location.search);
if (params.get('tab') === 'register') switchTab('register');

function switchTab(tab) {
  document.getElementById('form-login').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('tab-login').classList.toggle('active',    tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function doLogin() {
  const identifier = document.getElementById('login-email').value.trim();
  const pass       = document.getElementById('login-password').value;
  const err        = document.getElementById('login-error');
  err.textContent  = '';

  if (!identifier || !pass) { err.textContent = 'Remplissez tous les champs.'; return; }

  try {
    const data = await Auth.login(identifier, pass);
    toast('Bienvenue ' + data.user.username + ' !', 'success');
    setTimeout(() => window.location.href = 'index.html', 700);
  } catch (e) {
    err.textContent = e.message || 'Erreur de connexion.';
  }
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
async function doRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const pass     = document.getElementById('reg-password').value;
  const pass2    = document.getElementById('reg-password2').value;
  const err      = document.getElementById('reg-error');
  err.textContent = '';

  if (!username || !email || !pass || !pass2) { err.textContent = 'Remplissez tous les champs.'; return; }
  if (pass !== pass2) { err.textContent = 'Les mots de passe ne correspondent pas.'; return; }

  try {
    await Auth.register(username, email, pass);
    toast('Compte créé ! Connexion en cours...', 'success');
    // Auto-login après inscription
    await Auth.login(username, pass);
    setTimeout(() => window.location.href = 'index.html', 700);
  } catch (e) {
    err.textContent = e.message || 'Erreur lors de l\'inscription.';
  }
}

// ─── ENTER KEY ────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const loginVisible = document.getElementById('form-login').style.display !== 'none';
  loginVisible ? doLogin() : doRegister();
});

// ─── TOAST ────────────────────────────────────────────────────────────────────
function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}