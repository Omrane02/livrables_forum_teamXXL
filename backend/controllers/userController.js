const db     = require('../config/db');
const crypto = require('crypto');

const hashPassword = (password) => {
  return crypto.createHash('sha512').update(password).digest('hex');
};

const isValidPassword = (password) => {
  const minLength    = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial   = /[^a-zA-Z0-9]/.test(password);
  return minLength && hasUppercase && hasSpecial;
};

// ─────────────────────────────────────────────
// GET /users/:id
// Consulter le profil d'un utilisateur (FO-2)
// ─────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(`
      SELECT
        u.id, u.username, u.role, u.created_at, u.last_login,
        p.bio, p.avatar_url, p.message_count, p.topic_count
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ? AND u.is_banned = 0
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    return res.status(200).json({ message: 'Profil trouvé', data: rows[0] });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// PUT /users/profile
// Modifier son propre profil (FO-2)
// Authentification requise
// ─────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { bio, avatar_url } = req.body;

  try {
    await db.execute(
      `UPDATE profiles SET bio = ?, avatar_url = ? WHERE user_id = ?`,
      [bio || null, avatar_url || null, userId]
    );

    return res.status(200).json({ message: 'Profil mis à jour avec succès' });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// PUT /users/password
// Modifier son mot de passe
// Authentification requise
// ─────────────────────────────────────────────
exports.updatePassword = async (req, res) => {
  const userId = req.user.id;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }

  if (!isValidPassword(new_password)) {
    return res.status(400).json({
      message: 'Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule et un caractère spécial',
    });
  }

  try {
    const [users] = await db.execute(
      `SELECT password FROM users WHERE id = ?`, [userId]
    );

    if (hashPassword(current_password) !== users[0].password) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    await db.execute(
      `UPDATE users SET password = ? WHERE id = ?`,
      [hashPassword(new_password), userId]
    );

    return res.status(200).json({ message: 'Mot de passe mis à jour avec succès' });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /users/:id/topics
// Récupérer les topics d'un utilisateur
// ─────────────────────────────────────────────
exports.getUserTopics = async (req, res) => {
  const { id } = req.params;
  const page   = parseInt(req.query.page)  || 1;
  const limit  = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [topics] = await db.execute(`
      SELECT t.id, t.title, t.status, t.visibility, t.created_at
      FROM topics t
      WHERE t.author_id = ? AND t.status != 'archived' AND t.visibility = 'public'
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [id, limit, offset]);

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM topics WHERE author_id = ? AND status != 'archived' AND visibility = 'public'`,
      [id]
    );

    return res.status(200).json({
      message: 'Topics récupérés',
      data: topics,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};