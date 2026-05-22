CREATE DATABASE IF NOT EXISTS forum_music;

USE forum_music;

CREATE TABLE users (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    username    VARCHAR(50) NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(128) NOT NULL,
    role        ENUM('user', 'moderator', 'admin') DEFAULT 'user',
    is_banned   TINYINT(1) DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login  TIMESTAMP NULL
) ENGINE=InnoDB;

CREATE TABLE profiles (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT NOT NULL UNIQUE,
    bio             TEXT,
    avatar_url      VARCHAR(500),
    message_count   INT DEFAULT 0,
    topic_count     INT DEFAULT 0,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tags (
    id      INT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(100) NOT NULL UNIQUE,
    genre   VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE artists (
    id      INT PRIMARY KEY AUTO_INCREMENT,
    name    VARCHAR(150) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE artist_tags (
    artist_id   INT NOT NULL,
    tag_id      INT NOT NULL,

    PRIMARY KEY (artist_id, tag_id),

    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE topics (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    author_id   INT NOT NULL,
    title       VARCHAR(255) NOT NULL,
    body        TEXT NOT NULL,
    status      ENUM('open', 'closed', 'archived') DEFAULT 'open',
    visibility  ENUM('public', 'private') DEFAULT 'public',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX (author_id),
    INDEX (status),

    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE topic_tags (
    topic_id    INT NOT NULL,
    tag_id      INT NOT NULL,

    PRIMARY KEY (topic_id, tag_id),

    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE messages (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    topic_id            INT NOT NULL,
    author_id           INT NOT NULL,
    body                TEXT NOT NULL,
    image_url           VARCHAR(500),
    popularity_score    INT DEFAULT 0,
    sent_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX (topic_id),
    INDEX (author_id),

    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE votes (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    user_id     INT NOT NULL,
    message_id  INT NOT NULL,
    vote_type   ENUM('like', 'dislike') NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_vote (user_id, message_id),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE friendships (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    requester_id    INT NOT NULL,
    addressee_id    INT NOT NULL,
    status          ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_friendship (requester_id, addressee_id),

    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;