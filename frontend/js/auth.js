// redirect if already logged in
const existing = DB.getSession();
if (existing) window.location.href = 'index.html';

// read ?tab=register param
const params = new URLSearchParams(window.location.search);
if (params.get('tab') === 'register') switchTab('register');

function switchTab(tab) {
  document.getElementById('form-login').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.textContent = '';

  if (!email || !pass) { err.textContent = 'Remplissez tous les champs.'; return; }
  const user = DB.findUserByEmail(email);
  if (!user || user.password !== pass) { err.textContent = 'Email ou mot de passe incorrect.'; return; }
  if (user.banned) { err.textContent = 'Ce compte a été banni.'; return; }

  DB.setSession(user);
  toast('Bienvenue ' + user.username + ' !', 'success');
  setTimeout(() => window.location.href = 'index.html', 700);
}

function doRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-password').value;
  const pass2 = document.getElementById('reg-password2').value;
  const err = document.getElementById('reg-error');
  err.textContent = '';

  if (!username || !email || !pass || !pass2) { err.textContent = 'Remplissez tous les champs.'; return; }
  if (pass.length < 8) { err.textContent = 'Mot de passe trop court (8 caractères min).'; return; }
  if (pass !== pass2) { err.textContent = 'Les mots de passe ne correspondent pas.'; return; }

  const result = DB.createUser({ username, email, password: pass });
  if (result.error) { err.textContent = result.error; return; }

  DB.setSession(result.user);
  toast('Compte créé avec succès !', 'success');
  setTimeout(() => window.location.href = 'index.html', 700);
}

// enter key
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const loginVisible = document.getElementById('form-login').style.display !== 'none';
  loginVisible ? doLogin() : doRegister();
});

function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
