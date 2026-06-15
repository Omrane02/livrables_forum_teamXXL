const db = require('../config/db');

// ─────────────────────────────────────────────
// POST /votes/message/:messageId
// ─────────────────────────────────────────────
exports.voteMessage = async (req, res) => {
  const { messageId } = req.params;
  const { vote_type } = req.body;
  const userId = req.user.id;

  if (!vote_type || !['like', 'dislike'].includes(vote_type)) {
    return res.status(400).json({ message: 'vote_type doit être "like" ou "dislike"' });
  }

  try {
    const [messages] = await db.execute(
      `SELECT * FROM messages WHERE id = ?`, [messageId]
    );

    if (messages.length === 0) {
      return res.status(404).json({ message: 'Message introuvable' });
    }

    if (messages[0].author_id === userId) {
      return res.status(403).json({ message: 'Vous ne pouvez pas voter pour votre propre message' });
    }

    const [existing] = await db.execute(
      `SELECT * FROM votes WHERE user_id = ? AND message_id = ?`,
      [userId, messageId]
    );

    if (existing.length > 0) {
      const currentVote = existing[0].vote_type;

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

      await db.execute(
        `UPDATE votes SET vote_type = ? WHERE user_id = ? AND message_id = ?`,
        [vote_type, userId, messageId]
      );
      const scoreChange = vote_type === 'like' ? 2 : -2;
      await db.execute(
        `UPDATE messages SET popularity_score = popularity_score + ? WHERE id = ?`,
        [scoreChange, messageId]
      );
      return res.status(200).json({ message: `Vote changé en ${vote_type}` });
    }

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
// GET /votes/message/:messageId
// ─────────────────────────────────────────────
exports.getMessageVotes = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user ? req.user.id : null;

  try {
    const [messages] = await db.execute(
      `SELECT popularity_score FROM messages WHERE id = ?`, [messageId]
    );

    if (messages.length === 0) {
      return res.status(404).json({ message: 'Message introuvable' });
    }

    let userVote = null;
    if (userId) {
      const [rows] = await db.execute(
        `SELECT vote_type FROM votes WHERE user_id = ? AND message_id = ?`,
        [userId, messageId]
      );
      if (rows.length > 0) userVote = rows[0].vote_type;
    }

    return res.status(200).json({
      message: 'Votes récupérés',
      data: {
        popularity_score: messages[0].popularity_score,
        user_vote: userVote,
      },
    });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /votes/topic/:topicId
// ─────────────────────────────────────────────
exports.voteTopic = async (req, res) => {
  const { topicId } = req.params;
  const { vote_type } = req.body;
  const userId = req.user.id;

  if (!vote_type || !['like', 'dislike'].includes(vote_type)) {
    return res.status(400).json({ message: 'vote_type doit être "like" ou "dislike"' });
  }

  try {
    const [topics] = await db.execute(
      `SELECT * FROM topics WHERE id = ?`, [topicId]
    );

    if (topics.length === 0) {
      return res.status(404).json({ message: 'Topic introuvable' });
    }

    if (topics[0].author_id === userId) {
      return res.status(403).json({ message: 'Vous ne pouvez pas voter pour votre propre topic' });
    }

    const [existing] = await db.execute(
      `SELECT * FROM topic_votes WHERE user_id = ? AND topic_id = ?`,
      [userId, topicId]
    );

    if (existing.length > 0) {
      const currentVote = existing[0].vote_type;

      if (currentVote === vote_type) {
        await db.execute(
          `DELETE FROM topic_votes WHERE user_id = ? AND topic_id = ?`,
          [userId, topicId]
        );
        return res.status(200).json({ message: 'Vote annulé' });
      }

      await db.execute(
        `UPDATE topic_votes SET vote_type = ? WHERE user_id = ? AND topic_id = ?`,
        [vote_type, userId, topicId]
      );
      return res.status(200).json({ message: `Vote changé en ${vote_type}` });
    }

    await db.execute(
      `INSERT INTO topic_votes (user_id, topic_id, vote_type) VALUES (?, ?, ?)`,
      [userId, topicId, vote_type]
    );

    return res.status(201).json({ message: `Topic ${vote_type}é avec succès` });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /votes/topic/:topicId
// Public — user_vote null si non connecté
// ─────────────────────────────────────────────
exports.getTopicVotes = async (req, res) => {
  const { topicId } = req.params;
  const userId = req.user ? req.user.id : null;

  try {
    const [[{ likes }]] = await db.execute(
      `SELECT COUNT(*) AS likes FROM topic_votes WHERE topic_id = ? AND vote_type = 'like'`,
      [topicId]
    );
    const [[{ dislikes }]] = await db.execute(
      `SELECT COUNT(*) AS dislikes FROM topic_votes WHERE topic_id = ? AND vote_type = 'dislike'`,
      [topicId]
    );

    let userVote = null;
    if (userId) {
      const [rows] = await db.execute(
        `SELECT vote_type FROM topic_votes WHERE user_id = ? AND topic_id = ?`,
        [userId, topicId]
      );
      if (rows.length > 0) userVote = rows[0].vote_type;
    }

    return res.status(200).json({
      message: 'Votes récupérés',
      data: {
        likes,
        dislikes,
        score: likes - dislikes,
        user_vote: userVote,
      },
    });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};