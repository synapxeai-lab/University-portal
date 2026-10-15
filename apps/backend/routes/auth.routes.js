const express = require('express');
const router  = express.Router();
const { login, logout, me } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/login',  login);
router.post('/logout', logout);
router.get('/me',      verifyToken, me);

module.exports = router;
