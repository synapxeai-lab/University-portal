const express = require('express');
const router  = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { getMyChallans, payChallan, getAllChallans, getSectionChallans, approveChallan } = require('../controllers/challan.controller');

// Student-portal routes (self-service, STUDENT role only)
router.get('/me',       verifyToken, authorizeRoles('STUDENT'), getMyChallans);
router.post('/:id/pay', verifyToken, authorizeRoles('STUDENT'), payChallan);

// Admin routes
router.get('/',                       verifyToken, authorizeRoles('ADMIN'), getAllChallans);
router.get('/sections/:sectionId',    verifyToken, authorizeRoles('ADMIN'), getSectionChallans);
router.put('/:id/approve',            verifyToken, authorizeRoles('ADMIN'), approveChallan);

module.exports = router;
