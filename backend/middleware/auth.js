const jwt = require('jsonwebtoken');
require('dotenv').config();

// Vérifie que l'utilisateur est connecté
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

// Vérifie que l'utilisateur est admin
const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    next();
  });
};

// Vérifie que l'utilisateur est admin ou modérateur
const verifyMod = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    next();
  });
};

module.exports = { verifyToken, verifyAdmin, verifyMod };