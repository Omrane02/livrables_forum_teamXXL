const db   = require('../config/db');
const jwt  = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// Hash du mot de passe en SHA-512
const hashPassword = (password) => {
  return crypto.createHash('sha512').update(password).digest('hex');
};

// Validation du mot de passe : 8 caractères min, 1 majuscule, 1 caractère spécial
const isValidPassword = (password) => {
  const minLength    = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial   = /[^a-zA-Z0-9]/.test(password);
  return minLength && hasUppercase && hasSpecial;
};

// POST /auth/register
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }

  // Username : lettres et chiffres uniquement
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return res.status(400).json({ message: 'Le nom d\'utilisateur ne peut contenir que des lettres et des chiffres' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule et un caractère spécial' });
  }

  try {
    // Vérifier si username ou email déjà utilisé
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'Nom d\'utilisateur ou email déjà utilisé' });
    }

    const hashedPassword = hashPassword(password);

    // Créer l'utilisateur
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    // Créer le profil associé
    await db.execute(
      'INSERT INTO profiles (user_id) VALUES (?)',
      [result.insertId]
    );

    return res.status(201).json({ message: 'Inscription réussie' });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// POST /auth/login
exports.login = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }

  try {
    // Connexion par username ou email
    const [users] = await db.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [identifier, identifier]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const user = users[0];

    if (user.is_banned) {
      return res.status(403).json({ message: 'Votre compte a été banni' });
    }

    const hashedPassword = hashPassword(password);
    if (hashedPassword !== user.password) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    // Mettre à jour last_login
    await db.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Générer le JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: {
        id:       user.id,
        username: user.username,
        email:    user.email,
        role:     user.role,
      },
    });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};