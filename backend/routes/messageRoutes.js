const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth');

// Routes publiques
router.get('/:topicId',  controller.getMessagesByTopic);   // GET /messages/:topicId

// Routes protégées
router.post('/:topicId', verifyToken, controller.createMessage);   // POST /messages/:topicId
router.put('/:id',       verifyToken, controller.updateMessage);   // PUT /messages/:id
router.delete('/:id',    verifyToken, controller.deleteMessage);   // DELETE /messages/:id

module.exports = router;