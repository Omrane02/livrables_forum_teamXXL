const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

// Routes publiques
router.get('/:id',         controller.getProfile);      // GET  /users/:id
router.get('/:id/topics',  controller.getUserTopics);   // GET  /users/:id/topics

// Routes protégées
router.put('/profile',     verifyToken, controller.updateProfile);   // PUT /users/profile
router.put('/password',    verifyToken, controller.updatePassword);  // PUT /users/password

module.exports = router;