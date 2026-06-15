const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/voteController');
const { verifyToken } = require('../middleware/auth');

// Votes sur les messages
router.post('/message/:messageId', verifyToken, controller.voteMessage);
router.get('/message/:messageId',  verifyToken, controller.getMessageVotes);

// Votes sur les topics — GET public, POST protégé
router.post('/topic/:topicId', verifyToken, controller.voteTopic);
router.get('/topic/:topicId',  controller.getTopicVotes);

module.exports = router;