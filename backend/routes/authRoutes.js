const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/authController');

// POST /auth/register
router.post('/register', controller.register);

// POST /auth/login
router.post('/login', controller.login);

module.exports = router;