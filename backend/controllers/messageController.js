const db = require('../config/db');

// ─────────────────────────────────────────────
// GET /messages/:topicId
// Récupérer tous les messages d'un topic
// Pagination : ?page=1&limit=10
// Tri : ?sort=date (défaut) ou ?sort=popularity
// ─────────────────────────────────────────────
exports.getMessagesByTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sort   = req.query.sort === 'popularity' ? 'popularity_score' : 'sent_at';

    // Vérifier que le topic existe et n'est pas archivé
    const [topics] = await db.execute(
      `SELECT * FROM topics WHERE id = ?`, [topicId]
    );

    if (topics.length === 0) {
      return res.status(404).json({ message: 'Topic introuvable' });
    }

    if (topics[0].status === 'archived') {
      return res.status(403).json({ message: 'Ce topic est archivé' });
    }

    const [messages] = await db.execute(`
      SELECT
        m.id, m.body, m.image_url, m.popularity_score, m.sent_at,
        u.username AS author,
        u.id AS author_id
      FROM messages m
      JOIN users u ON m.author_id = u.id
      WHERE m.topic_id = ?
      ORDER BY m.${sort} DESC
      LIMIT ? OFFSET ?
    `, [topicId, limit, offset]);

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM messages WHERE topic_id = ?`, [topicId]
    );

    return res.status(200).json({
      message: 'Messages récupérés avec succès',
      data: messages,
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
// POST /messages/:topicId
// Poster un message dans un topic (F-5)
// Authentification requise
// ─────────────────────────────────────────────
exports.createMessage = async (req, res) => {
  const { topicId } = req.params;
  const { body, image_url } = req.body;
  const author_id = req.user.id;

  if (!body) {
    return res.status(400).json({ message: 'Le corps du message est obligatoire' });
  }

  try {
    // Vérifier que le topic existe et est ouvert
    const [topics] = await db.execute(
      `SELECT * FROM topics WHERE id = ?`, [topicId]
    );

    if (topics.length === 0) {
      return res.status(404).json({ message: 'Topic introuvable' });
    }

    if (topics[0].status === 'closed') {
      return res.status(403).json({ message: 'Ce topic est fermé, impossible de poster un message' });
    }

    if (topics[0].status === 'archived') {
      return res.status(403).json({ message: 'Ce topic est archivé' });
    }

    const [result] = await db.execute(
      `INSERT INTO messages (topic_id, author_id, body, image_url) VALUES (?, ?, ?, ?)`,
      [topicId, author_id, body, image_url || null]
    );

    // Incrémenter le message_count du profil
    await db.execute(
      `UPDATE profiles SET message_count = message_count + 1 WHERE user_id = ?`,
      [author_id]
    );

    return res.status(201).json({
      message: 'Message posté avec succès',
      data: { id: result.insertId },
    });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// PUT /messages/:id
// Modifier un message (auteur uniquement)
// ─────────────────────────────────────────────
exports.updateMessage = async (req, res) => {
  const { id } = req.params;
  const { body } = req.body;
  const userId = req.user.id;

  if (!body) {
    return res.status(400).json({ message: 'Le corps du message est obligatoire' });
  }

  try {
    const [messages] = await db.execute(
      `SELECT * FROM messages WHERE id = ?`, [id]
    );

    if (messages.length === 0) {
      return res.status(404).json({ message: 'Message introuvable' });
    }

    if (messages[0].author_id !== userId) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    await db.execute(
      `UPDATE messages SET body = ? WHERE id = ?`,
      [body, id]
    );

    return res.status(200).json({ message: 'Message mis à jour avec succès' });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /messages/:id
// Supprimer un message (F-6)
// Auteur du message, propriétaire du topic ou admin
// ─────────────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const [messages] = await db.execute(
      `SELECT m.*, t.author_id AS topic_author_id
       FROM messages m
       JOIN topics t ON m.topic_id = t.id
       WHERE m.id = ?`,
      [id]
    );

    if (messages.length === 0) {
      return res.status(404).json({ message: 'Message introuvable' });
    }

    const message = messages[0];
    const isMessageAuthor = message.author_id === userId;
    const isTopicOwner    = message.topic_author_id === userId;
    const isAdmin         = userRole === 'admin';

    if (!isMessageAuthor && !isTopicOwner && !isAdmin) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    await db.execute(`DELETE FROM messages WHERE id = ?`, [id]);

    // Décrémenter le message_count du profil de l'auteur du message
    await db.execute(
      `UPDATE profiles SET message_count = message_count - 1 WHERE user_id = ?`,
      [message.author_id]
    );

    return res.status(200).json({ message: 'Message supprimé avec succès' });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};