// ─── DATABASE (localStorage) ────────────────────────────────────────────────

const DB = {

  // ── helpers ──────────────────────────────────────────────────────────────
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  },

  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  getObj(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  },

  // ── seed data ────────────────────────────────────────────────────────────
  seed() {
    if (localStorage.getItem('ple_seeded')) return;

    // admin account
    const users = [
      {
        id: 'u0',
        username: 'admin',
        email: 'admin@ple.fr',
        password: 'admin1234',
        role: 'admin',
        banned: false,
        avatar: null,
        createdAt: Date.now() - 9e8
      },

      {
        id: 'u1',
        username: 'vinylKid',
        email: 'vinyl@ple.fr',
        password: 'pass1234',
        role: 'user',
        banned: false,
        avatar: null,
        createdAt: Date.now() - 8e8
      },

      {
        id: 'u2',
        username: 'jazzCat',
        email: 'jazz@ple.fr',
        password: 'pass1234',
        role: 'user',
        banned: false,
        avatar: null,
        createdAt: Date.now() - 7e8
      },
    ];

    const topics = [
      {
        id: 't1',
        title: 'Kendrick Lamar - GNX : votre avis ?',
        body: 'Le dernier album de Kendrick vient de sortir. Qu\'est-ce que vous en pensez ? Moi je suis complètement soufflé par la prod de Metro Boomin.',
        authorId: 'u1',
        category: 'Hip-hop',
        tags: ['Hip-hop', 'Kendrick Lamar'],
        status: 'open',
        createdAt: Date.now() - 6e8,
        likes: ['u2'],
        dislikes: [],
        views: 42
      },

      {
        id: 't2',
        title: 'Daft Punk : toujours les meilleurs ?',
        body: 'Après l\'annonce de leur séparation, je réécoute Random Access Memories et ça me fend le cœur. Un monument de la musique électro française.',
        authorId: 'u2',
        category: 'Electronic',
        tags: ['Electronic', 'Daft Punk'],
        status: 'open',
        createdAt: Date.now() - 5e8,
        likes: ['u1', 'u0'],
        dislikes: [],
        views: 87
      },

      {
        id: 't3',
        title: 'Miles Davis - Kind of Blue, 65 ans après',
        body: 'L\'album le plus vendu de l\'histoire du jazz. On en parle ? Chaque écoute est une nouvelle découverte.',
        authorId: 'u0',
        category: 'Jazz',
        tags: ['Jazz', 'Miles Davis'],
        status: 'open',
        createdAt: Date.now() - 4e8,
        likes: ['u1'],
        dislikes: [],
        views: 31
      },

      {
        id: 't4',
        title: 'Playlist workout : vos recommandations',
        body: 'Je cherche des sons bien énergiques pour mes séances. Hip-hop, rock, électro... tout est bon si ça donne la patate !',
        authorId: 'u1',
        category: 'Hip-hop',
        tags: ['Hip-hop', 'Rock', 'Electronic'],
        status: 'open',
        createdAt: Date.now() - 3e8,
        likes: [],
        dislikes: ['u2'],
        views: 19
      },

      {
        id: 't5',
        title: 'The Beatles vs The Rolling Stones : le débat éternel',
        body: 'On repart sur le grand classique. Pour moi, les Beatles ont révolutionné la musique, mais les Stones ont une énergie live incomparable.',
        authorId: 'u2',
        category: 'Rock',
        tags: ['Rock', 'The Beatles', 'The Rolling Stones'],
        status: 'archived',
        createdAt: Date.now() - 2e8,
        likes: ['u0', 'u1'],
        dislikes: [],
        views: 156
      },
    ];

    const replies = [
      {
        id: 'r1',
        topicId: 't1',
        body: 'Totalement d\'accord ! "euphoria" reste mon morceau de l\'année. La punchline sur Drake est chirurgicale.',
        authorId: 'u2',
        createdAt: Date.now() - 5.5e8,
        likes: ['u1'],
        dislikes: []
      },

      {
        id: 'r2',
        topicId: 't1',
        body: 'Je préfère quand même DAMN. mais GNX c\'est solide. La collab avec SZA est sublime.',
        authorId: 'u0',
        createdAt: Date.now() - 5e8,
        likes: [],
        dislikes: []
      },

      {
        id: 'r3',
        topicId: 't2',
        body: 'RAM c\'est un chef d\'oeuvre absolu. "Instant Crush" avec Julian Casablancas... chef\'s kiss.',
        authorId: 'u1',
        createdAt: Date.now() - 4.5e8,
        likes: ['u0'],
        dislikes: []
      },

      {
        id: 'r4',
        topicId: 't3',
        body: 'Kind of Blue c\'est la porte d\'entrée du jazz pour moi. Après ça, j\'ai enchaîné tout Coltrane.',
        authorId: 'u1',
        createdAt: Date.now() - 3.5e8,
        likes: ['u2', 'u0'],
        dislikes: []
      },
    ];

    this.set('ple_users', users);
    this.set('ple_topics', topics);
    this.set('ple_replies', replies);

    localStorage.setItem('ple_seeded', '1');
  },

  // ── users ───────────────────────────────────────────────────────────────
  getUsers() {
    return this.get('ple_users');
  },

  saveUsers(users) {
    this.set('ple_users', users);
  },

  findUser(id) {
    return this.getUsers().find(u => u.id === id);
  },

  findUserByEmail(email) {
    return this.getUsers().find(u => u.email === email);
  },

  findUserByUsername(username) {
    return this.getUsers().find(u => u.username === username);
  },

  createUser({ username, email, password }) {
    const users = this.getUsers();

    if (users.find(u => u.email === email)) {
      return { error: 'Email déjà utilisé' };
    }

    if (users.find(u => u.username === username)) {
      return { error: 'Pseudo déjà pris' };
    }

    const user = {
      id: 'u' + Date.now(),
      username,
      email,
      password,
      role: 'user',
      banned: false,
      avatar: null,
      createdAt: Date.now()
    };

    users.push(user);

    this.saveUsers(users);

    return { user };
  },

  updateUser(id, patch) {
    const users = this.getUsers().map(u =>
        u.id === id ? { ...u, ...patch } : u
    );

    this.saveUsers(users);
  },

  // ── topics ──────────────────────────────────────────────────────────────
  getTopics() {
    return this.get('ple_topics');
  },

  saveTopics(topics) {
    this.set('ple_topics', topics);
  },

  findTopic(id) {
    return this.getTopics().find(t => t.id === id);
  },

  createTopic({ title, body, category, tags, authorId, status }) {
    const topics = this.getTopics();

    const topic = {
      id: 't' + Date.now(),
      title,
      body,
      category,
      tags,
      authorId,
      status: status || 'open',
      createdAt: Date.now(),
      likes: [],
      dislikes: [],
      views: 0
    };

    topics.unshift(topic);

    this.saveTopics(topics);

    return topic;
  },

  updateTopic(id, patch) {
    const topics = this.getTopics().map(t =>
        t.id === id ? { ...t, ...patch } : t
    );

    this.saveTopics(topics);
  },

  deleteTopic(id) {
    this.saveTopics(
        this.getTopics().filter(t => t.id !== id)
    );

    this.saveReplies(
        this.getReplies().filter(r => r.topicId !== id)
    );
  },

  // ── FIXED TOPIC LIKE SYSTEM ─────────────────────────────────────────────
  toggleTopicLike(topicId, userId, type) {

    const topics = this.getTopics();

    const topic = topics.find(t => t.id === topicId);

    if (!topic) return;

    // sécurité
    topic.likes = topic.likes || [];
    topic.dislikes = topic.dislikes || [];

    // conversion type -> vrai tableau
    const target = type === 'like'
        ? 'likes'
        : 'dislikes';

    const other = type === 'like'
        ? 'dislikes'
        : 'likes';

    // retire ancien vote opposé
    topic[other] = topic[other].filter(
        id => id !== userId
    );

    // toggle vote
    if (topic[target].includes(userId)) {

      topic[target] = topic[target].filter(
          id => id !== userId
      );

    } else {

      topic[target].push(userId);

    }

    this.saveTopics(topics);

    return topic;
  },

  // ── replies ─────────────────────────────────────────────────────────────
  getReplies() {
    return this.get('ple_replies');
  },

  saveReplies(replies) {
    this.set('ple_replies', replies);
  },

  getTopicReplies(topicId) {
    return this.getReplies().filter(
        r => r.topicId === topicId
    );
  },

  createReply({ topicId, body, authorId }) {

    const replies = this.getReplies();

    const reply = {
      id: 'r' + Date.now(),
      topicId,
      body,
      authorId,
      createdAt: Date.now(),
      likes: [],
      dislikes: []
    };

    replies.push(reply);

    this.saveReplies(replies);

    return reply;
  },

  deleteReply(id) {
    this.saveReplies(
        this.getReplies().filter(r => r.id !== id)
    );
  },

  // ── FIXED REPLY LIKE SYSTEM ─────────────────────────────────────────────
  toggleReplyLike(replyId, userId, type) {

    const replies = this.getReplies();

    const reply = replies.find(r => r.id === replyId);

    if (!reply) return;

    // sécurité
    reply.likes = reply.likes || [];
    reply.dislikes = reply.dislikes || [];

    // conversion type -> vrai tableau
    const target = type === 'like'
        ? 'likes'
        : 'dislikes';

    const other = type === 'like'
        ? 'dislikes'
        : 'likes';

    // retire ancien vote opposé
    reply[other] = reply[other].filter(
        id => id !== userId
    );

    // toggle vote
    if (reply[target].includes(userId)) {

      reply[target] = reply[target].filter(
          id => id !== userId
      );

    } else {

      reply[target].push(userId);

    }

    this.saveReplies(replies);

    return reply;
  },

  // ── session ─────────────────────────────────────────────────────────────
  getSession() {
    try {
      return JSON.parse(
          localStorage.getItem('ple_session')
      );
    } catch {
      return null;
    }
  },

  setSession(user) {
    localStorage.setItem(
        'ple_session',
        JSON.stringify(user)
    );
  },

  clearSession() {
    localStorage.removeItem('ple_session');
  },
};

DB.seed();