const db = require('../config/db');

exports.getAllTopics = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || null;
    const tag    = req.query.tag    || null;

    let query = `
      SELECT DISTINCT
        t.id, t.title, t.body, t.status, t.visibility,
        t.created_at, t.updated_at,
        u.username AS author,
        GROUP_CONCAT(tg.name SEPARATOR ', ') AS tags
      FROM topics t
      JOIN users u ON t.author_id = u.id
      LEFT JOIN topic_tags tt ON t.id = tt.topic_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE t.visibility = 'public'
      AND t.status != 'archived'
    `;

    const params = [];

    if (search) {
      query += ` AND t.title LIKE ?`;
      params.push(`%${search}%`);
    }

    if (tag) {
      query += ` AND tg.name = ?`;
      params.push(tag);
    }

    query += ` GROUP BY t.id ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [topics] = await db.execute(query, params);

    let countQuery = `
      SELECT COUNT(DISTINCT t.id) AS total
      FROM topics t
      LEFT JOIN topic_tags tt ON t.id = tt.topic_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE t.visibility = 'public' AND t.status != 'archived'
    `;
    const countParams = [];

    if (search) {
      countQuery += ` AND t.title LIKE ?`;
      countParams.push(`%${search}%`);
    }

    if (tag) {
      countQuery += ` AND tg.name = ?`;
      countParams.push(tag);
    }

    const [[{ total }]] = await db.execute(countQuery, countParams);

    return res.status(200).json({
      message: 'Topics récupérés avec succès',
      data: topics,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getAllTags = async (req, res) => {
  try {
    const [tags] = await db.execute(`SELECT * FROM tags ORDER BY name ASC`);
    return res.status(200).json({ message: 'Tags récupérés', data: tags });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.getTopicById = async (req, res) => {
  try {
    const { id } = req.params;

    const [topics] = await db.execute(`
      SELECT
        t.id, t.title, t.body, t.status, t.visibility,
        t.created_at, t.updated_at, t.author_id,
        u.username AS author,
        GROUP_CONCAT(tg.name SEPARATOR ', ') AS tags
      FROM topics t
      JOIN users u ON t.author_id = u.id
      LEFT JOIN topic_tags tt ON t.id = tt.topic_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE t.id = ?
      GROUP BY t.id
    `, [id]);

    if (topics.length === 0) {
      return res.status(404).json({ message: 'Topic introuvable' });
    }

    const topic = topics[0];

    if (topic.status === 'archived') {
      return res.status(403).json({ message: 'Ce topic est archivé' });
    }

    if (topic.visibility === 'private') {
      return res.status(403).json({ message: 'Ce topic est privé' });
    }

    return res.status(200).json({ message: 'Topic trouvé', data: topic });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.createTopic = async (req, res) => {
  const { title, body, tags, visibility } = req.body;
  const author_id = req.user.id;

  if (!title || !body) {
    return res.status(400).json({ message: 'Le titre et le corps sont obligatoires' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO topics (author_id, title, body, visibility) VALUES (?, ?, ?, ?)`,
      [author_id, title, body, visibility || 'public']
    );

    const topicId = result.insertId;

    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        await conn.execute(
          `INSERT INTO topic_tags (topic_id, tag_id) VALUES (?, ?)`,
          [topicId, tagId]
        );
      }
    }

    await conn.execute(
      `UPDATE profiles SET topic_count = topic_count + 1 WHERE user_id = ?`,
      [author_id]
    );

    await conn.commit();
    return res.status(201).json({ message: 'Topic créé avec succès', data: { id: topicId } });

  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  } finally {
    conn.release();
  }
};

exports.updateTopic = async (req, res) => {
  const { id } = req.params;
  const { title, body, status, visibility, tags } = req.body;
  const userId = req.user.id;

  try {
    const [topics] = await db.execute(`SELECT * FROM topics WHERE id = ?`, [id]);

    if (topics.length === 0) {
      return res.status(404).json({ message: 'Topic introuvable' });
    }

    if (topics[0].author_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    await db.execute(
      `UPDATE topics SET title = ?, body = ?, status = ?, visibility = ?, updated_at = NOW() WHERE id = ?`,
      [
        title      || topics[0].title,
        body       || topics[0].body,
        status     || topics[0].status,
        visibility || topics[0].visibility,
        id,
      ]
    );

    if (tags && tags.length > 0) {
      await db.execute(`DELETE FROM topic_tags WHERE topic_id = ?`, [id]);
      for (const tagId of tags) {
        await db.execute(
          `INSERT INTO topic_tags (topic_id, tag_id) VALUES (?, ?)`,
          [id, tagId]
        );
      }
    }

    return res.status(200).json({ message: 'Topic mis à jour avec succès' });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

exports.deleteTopic = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [topics] = await db.execute(`SELECT * FROM topics WHERE id = ?`, [id]);

    if (topics.length === 0) {
      return res.status(404).json({ message: 'Topic introuvable' });
    }

    if (topics[0].author_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    await db.execute(`DELETE FROM topics WHERE id = ?`, [id]);

    await db.execute(
      `UPDATE profiles SET topic_count = topic_count - 1 WHERE user_id = ?`,
      [topics[0].author_id]
    );

    return res.status(200).json({ message: 'Topic supprimé avec succès' });

  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};