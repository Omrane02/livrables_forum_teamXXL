const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app  = express();
const port = process.env.PORT || 3000;

// Middlewares globaux
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
const authRoutes    = require('./routes/authRoutes');
const topicRoutes   = require('./routes/topicRoutes');
const messageRoutes = require('./routes/messageRoutes');
const voteRoutes    = require('./routes/voteRoutes');
const userRoutes    = require('./routes/userRoutes');
const adminRoutes   = require('./routes/adminRoutes');

app.use('/auth',     authRoutes);
app.use('/topics',   topicRoutes);
app.use('/messages', messageRoutes);
app.use('/votes',    voteRoutes);
app.use('/users',    userRoutes);
app.use('/admin',    adminRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({ message: '🎵 Forum Music API is running' });
});

// Route inconnue
app.use((req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});