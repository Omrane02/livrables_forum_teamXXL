const db = require('../config/db');

// ─────────────────────────────────────────────
// POST /votes/:messageId
// Liker ou disliker un message (F-7)
// Authentification requise
// Body : { vote_type: 'like' | 'dislike' }
// ─────────────────────────────────────────────
exports.vote = async (req, res) => {
  const { messageId } = req.params;
  const { vote_type } = req.body;
  const userId = req.user.id;

  if (!vote_type || !['like', 'dislike'].includes(vote_type)) {
    return res.status(400).json({ message: 'vote_type doit être "like" ou "dislike"' });
  }

  try {
    // Vérifier que le message existe
    const [messages] = await db.execute(
      `SELECT * FROM messages WHERE id = ?`, [messageId]
    );

    if (messages.length === 0) {
      return res.status(404).json({ message: 'Message introuvable' });
    }

    // Un utilisateur ne peut pas voter pour son propre message
    if (messages[0].author_id === userId) {
      return res.status(403).json({ message: 'Vous ne pouvez pas voter pour votre propre message' });
    }

    // Vérifier si l'utilisateur a déjà voté sur ce message
    const [existing] = await db.execute(
      `SELECT * FROM votes WHERE user_id = ? AND message_id = ?`,
      [userId, messageId]
    );

    if (existing.length > 0) {
      const currentVote = existing[0].vote_type;

      // Si même vote → annuler le vote
      if (currentVote === vote_type) {
        await db.execute(
          `DELETE FROM votes WHERE user_id = ? AND message_id = ?`,
          [userId, messageId]
        );

        const scoreChange = vote_type === 'like' ? -1 : 1;
        await db.execute(
          `UPDATE messages SET popularity_score = popularity_score + ? WHERE id = ?`,
          [scoreChange, messageId]
        );

        return res.status(200).json({ message: 'Vote annulé' });
      }

      // Si vote différent → changer le vote
      await db.execute(
        `UPDATE votes SET vote_type = ? WHERE user_id = ? AND message_id = ?`,
        [vote_type, userId, messageId]
      );

      // like → dislike : -2 | dislike → like : +2
      const scoreChange = vote_type === 'like' ? 2 : -2;
      await db.execute(
        `UPDATE messages SET popularity_score = popularity_score + ? WHERE id = ?`,
        [scoreChange, messageId]
      );

      return res.status(200).json({ message: `Vote changé en ${vote_type}` });
    }

    // Nouveau vote
    await db.execute(
      `INSERT INTO votes (user_id, message_id, vote_type) VALUES (?, ?, ?)`,
      [userId, messageId, vote_type]
    );

    const scoreChange = vote_type === 'like' ? 1 : -1;
    await db.execute(
      `UPDATE messages SET popularity_score = popularity_score + ? WHERE id = ?`,
      [scoreChange, messageId]
    );

    return res.status(201).json({ message: `Message ${vote_type}é avec succès` });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /votes/:messageId
// Récupérer le score et le vote de l'utilisateur
// ─────────────────────────────────────────────
exports.getVotes = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.id;

  try {
    const [messages] = await db.execute(
      `SELECT popularity_score FROM messages WHERE id = ?`, [messageId]
    );

    if (messages.length === 0) {
      return res.status(404).json({ message: 'Message introuvable' });
    }

    const [userVote] = await db.execute(
      `SELECT vote_type FROM votes WHERE user_id = ? AND message_id = ?`,
      [userId, messageId]
    );

    return res.status(200).json({
      message: 'Votes récupérés',
      data: {
        popularity_score: messages[0].popularity_score,
        user_vote: userVote.length > 0 ? userVote[0].vote_type : null,
      },
    });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};