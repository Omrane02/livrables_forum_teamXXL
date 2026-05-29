const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/voteController');
const { verifyToken } = require('../middleware/auth');

// Routes protégées (connexion requise)
router.post('/:messageId', verifyToken, controller.vote);      // POST /votes/:messageId
router.get('/:messageId',  verifyToken, controller.getVotes);  // GET  /votes/:messageId

module.exports = router;