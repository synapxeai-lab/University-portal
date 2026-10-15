const express = require('express');
const router  = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { adminDashboard, teacherDashboard, studentDashboard, adminStats } = require('../controllers/dashboard.controller');

router.get('/admin',       verifyToken, authorizeRoles('ADMIN'),   adminDashboard);
router.get('/admin/stats', verifyToken, authorizeRoles('ADMIN'),   adminStats);
router.get('/teacher',     verifyToken, authorizeRoles('TEACHER'), teacherDashboard);
router.get('/student',     verifyToken, authorizeRoles('STUDENT'), studentDashboard);

module.exports = router;
