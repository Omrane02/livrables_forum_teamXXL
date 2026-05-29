const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/adminController');
const { verifyAdmin } = require('../middleware/auth');

// Toutes les routes admin sont protégées par verifyAdmin
router.get('/dashboard',              verifyAdmin, controller.getDashboard);
router.get('/users',                  verifyAdmin, controller.getAllUsers);
router.put('/users/:id/ban',          verifyAdmin, controller.banUser);
router.put('/topics/:id/status',      verifyAdmin, controller.updateTopicStatus);
router.delete('/topics/:id',          verifyAdmin, controller.deleteTopic);
router.delete('/messages/:id',        verifyAdmin, controller.deleteMessage);

module.exports = router;