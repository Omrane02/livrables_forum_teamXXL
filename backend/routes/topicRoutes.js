const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/topicController');
const { verifyToken } = require('../middleware/auth');

// Routes publiques (sans connexion)
router.get('/',         controller.getAllTopics);   // GET /topics
router.get('/tags',     controller.getAllTags);     // GET /topics/tags
router.get('/:id',      controller.getTopicById);  // GET /topics/:id

// Routes protégées (connexion requise)
router.post('/',        verifyToken, controller.createTopic);    // POST /topics
router.put('/:id',      verifyToken, controller.updateTopic);    // PUT /topics/:id
router.delete('/:id',   verifyToken, controller.deleteTopic);    // DELETE /topics/:id

module.exports = router;