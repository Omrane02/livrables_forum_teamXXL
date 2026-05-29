const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth');

// Routes publiques
router.get('/:topicId',  controller.getMessagesByTopic);  

// Routes protégées
router.post('/:topicId', verifyToken, controller.createMessage);  
router.put('/:id',       verifyToken, controller.updateMessage);   
router.delete('/:id',    verifyToken, controller.deleteMessage); 

module.exports = router;