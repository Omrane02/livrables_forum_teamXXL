const db = require('../config/db');

// ─────────────────────────────────────────────
// GET /admin/users
// Lister tous les utilisateurs
// Admin uniquement
// ─────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  const page   = parseInt(req.query.page)  || 1;
  const limit  = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [users] = await db.execute(`
      SELECT
        u.id, u.username, u.email, u.role, u.is_banned,
        u.created_at, u.last_login,
        p.message_count, p.topic_count
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM users`
    );

    return res.status(200).json({
      message: 'Utilisateurs récupérés',
      data: users,
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

// ─────────────────────────────────────────────
// PUT /admin/users/:id/ban
// Bannir ou débannir un utilisateur (F-11)
// Admin uniquement
// ─────────────────────────────────────────────
exports.banUser = async (req, res) => {
  const { id } = req.params;

  try {
    const [users] = await db.execute(
      `SELECT id, username, is_banned, role FROM users WHERE id = ?`, [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    if (users[0].role === 'admin') {
      return res.status(403).json({ message: 'Impossible de bannir un administrateur' });
    }

    // Toggle ban
    const newBanStatus = users[0].is_banned ? 0 : 1;
    await db.execute(
      `UPDATE users SET is_banned = ? WHERE id = ?`,
      [newBanStatus, id]
    );

    const action = newBanStatus ? 'banni' : 'débanni';
    return res.status(200).json({
      message: `Utilisateur ${users[0].username} ${action} avec succès`,
    });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// PUT /admin/topics/:id/status
// Modifier l'état d'un topic (F-11)
// Admin uniquement
// Body : { status: 'open' | 'closed' | 'archived' }
// ─────────────────────────────────────────────
exports.updateTopicStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['open', 'closed', 'archived'].includes(status)) {
    return res.status(400).json({ message: 'Status invalide. Valeurs acceptées : open, closed, archived' });
  }

  try {
    const [topics] = await db.execute(
      `SELECT id FROM topics WHERE id = ?`, [id]
    );

    if (topics.length === 0) {
      return res.status(404).json({ message: 'Topic introuvable' });
    }

    await db.execute(
      `UPDATE topics SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, id]
    );

    return res.status(200).json({ message: `Statut du topic mis à jour : ${status}` });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /admin/topics/:id
// Supprimer un topic (F-11)
// Admin uniquement
// ─────────────────────────────────────────────
exports.deleteTopic = async (req, res) => {
  const { id } = req.params;

  try {
    const [topics] = await db.execute(
      `SELECT id, author_id FROM topics WHERE id = ?`, [id]
    );

    if (topics.length === 0) {
      return res.status(404).json({ message: 'Topic introuvable' });
    }

    await db.execute(`DELETE FROM topics WHERE id = ?`, [id]);

    // Décrémenter le topic_count du propriétaire
    await db.execute(
      `UPDATE profiles SET topic_count = topic_count - 1 WHERE user_id = ?`,
      [topics[0].author_id]
    );

    return res.status(200).json({ message: 'Topic supprimé avec succès' });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /admin/messages/:id
// Supprimer un message (F-11)
// Admin uniquement
// ─────────────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  const { id } = req.params;

  try {
    const [messages] = await db.execute(
      `SELECT id, author_id FROM messages WHERE id = ?`, [id]
    );

    if (messages.length === 0) {
      return res.status(404).json({ message: 'Message introuvable' });
    }

    await db.execute(`DELETE FROM messages WHERE id = ?`, [id]);

    // Décrémenter le message_count de l'auteur
    await db.execute(
      `UPDATE profiles SET message_count = message_count - 1 WHERE user_id = ?`,
      [messages[0].author_id]
    );

    return res.status(200).json({ message: 'Message supprimé avec succès' });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /admin/dashboard
// Stats globales de la plateforme
// Admin uniquement
// ─────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const [[{ total_users }]]    = await db.execute(`SELECT COUNT(*) AS total_users FROM users`);
    const [[{ total_topics }]]   = await db.execute(`SELECT COUNT(*) AS total_topics FROM topics`);
    const [[{ total_messages }]] = await db.execute(`SELECT COUNT(*) AS total_messages FROM messages`);
    const [[{ banned_users }]]   = await db.execute(`SELECT COUNT(*) AS banned_users FROM users WHERE is_banned = 1`);

    const [latest_users] = await db.execute(`
      SELECT id, username, email, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const [latest_topics] = await db.execute(`
      SELECT t.id, t.title, t.status, t.created_at, u.username AS author
      FROM topics t
      JOIN users u ON t.author_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `);

    return res.status(200).json({
      message: 'Dashboard récupéré',
      data: {
        stats: { total_users, total_topics, total_messages, banned_users },
        latest_users,
        latest_topics,
      },
    });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
}

// ─────────────────────────────────────────────
// GET /admin/users
// Lister tous les utilisateurs
// Admin uniquement
// ─────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  const page   = parseInt(req.query.page)  || 1;
  const limit  = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [users] = await db.execute(`
      SELECT
        u.id, u.username, u.email, u.role, u.is_banned,
        u.created_at, u.last_login,
        p.message_count, p.topic_count
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM users`
    );

    return res.status(200).json({
      message: 'Utilisateurs récupérés',
      data: users,
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

// ─────────────────────────────────────────────
// PUT /admin/users/:id/ban
// Bannir ou débannir un utilisateur (F-11)
// Admin uniquement
// ─────────────────────────────────────────────
exports.banUser = async (req, res) => {
  const { id } = req.params;

  try {
    const [users] = await db.execute(
      `SELECT id, username, is_banned, role FROM users WHERE id = ?`, [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    if (users[0].role === 'admin') {
      return res.status(403).json({ message: 'Impossible de bannir un administrateur' });
    }

    // Toggle ban
    const newBanStatus = users[0].is_banned ? 0 : 1;
    await db.execute(
      `UPDATE users SET is_banned = ? WHERE id = ?`,
      [newBanStatus, id]
    );

    const action = newBanStatus ? 'banni' : 'débanni';
    return res.status(200).json({
      message: `Utilisateur ${users[0].username} ${action} avec succès`,
    });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// PUT /admin/topics/:id/status
// Modifier l'état d'un topic (F-11)
// Admin uniquement
// Body : { status: 'open' | 'closed' | 'archived' }
// ─────────────────────────────────────────────
exports.updateTopicStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['open', 'closed', 'archived'].includes(status)) {
    return res.status(400).json({ message: 'Status invalide. Valeurs acceptées : open, closed, archived' });
  }

  try {
    const [topics] = await db.execute(
      `SELECT id FROM topics WHERE id = ?`, [id]
    );

    if (topics.length === 0) {
      return res.status(404).json({ message: 'Topic introuvable' });
    }

    await db.execute(
      `UPDATE topics SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, id]
    );

    return res.status(200).json({ message: `Statut du topic mis à jour : ${status}` });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /admin/topics/:id
// Supprimer un topic (F-11)
// Admin uniquement
// ─────────────────────────────────────────────
exports.deleteTopic = async (req, res) => {
  const { id } = req.params;

  try {
    const [topics] = await db.execute(
      `SELECT id, author_id FROM topics WHERE id = ?`, [id]
    );

    if (topics.length === 0) {
      return res.status(404).json({ message: 'Topic introuvable' });
    }

    await db.execute(`DELETE FROM topics WHERE id = ?`, [id]);

    // Décrémenter le topic_count du propriétaire
    await db.execute(
      `UPDATE profiles SET topic_count = topic_count - 1 WHERE user_id = ?`,
      [topics[0].author_id]
    );

    return res.status(200).json({ message: 'Topic supprimé avec succès' });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /admin/messages/:id
// Supprimer un message (F-11)
// Admin uniquement
// ─────────────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  const { id } = req.params;

  try {
    const [messages] = await db.execute(
      `SELECT id, author_id FROM messages WHERE id = ?`, [id]
    );

    if (messages.length === 0) {
      return res.status(404).json({ message: 'Message introuvable' });
    }

    await db.execute(`DELETE FROM messages WHERE id = ?`, [id]);

    // Décrémenter le message_count de l'auteur
    await db.execute(
      `UPDATE profiles SET message_count = message_count - 1 WHERE user_id = ?`,
      [messages[0].author_id]
    );

    return res.status(200).json({ message: 'Message supprimé avec succès' });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /admin/dashboard
// Stats globales de la plateforme
// Admin uniquement
// ─────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const [[{ total_users }]]    = await db.execute(`SELECT COUNT(*) AS total_users FROM users`);
    const [[{ total_topics }]]   = await db.execute(`SELECT COUNT(*) AS total_topics FROM topics`);
    const [[{ total_messages }]] = await db.execute(`SELECT COUNT(*) AS total_messages FROM messages`);
    const [[{ banned_users }]]   = await db.execute(`SELECT COUNT(*) AS banned_users FROM users WHERE is_banned = 1`);

    const [latest_users] = await db.execute(`
      SELECT id, username, email, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const [latest_topics] = await db.execute(`
      SELECT t.id, t.title, t.status, t.created_at, u.username AS author
      FROM topics t
      JOIN users u ON t.author_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `);

    return res.status(200).json({
      message: 'Dashboard récupéré',
      data: {
        stats: { total_users, total_topics, total_messages, banned_users },
        latest_users,
        latest_topics,
      },
    });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};