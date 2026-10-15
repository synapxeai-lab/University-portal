const express = require('express');
const router  = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const {
  getAllRegistrations, startRegistration, setBatchLimit, deleteBatchLimit,
} = require('../controllers/registration.controller');

// All routes require a valid JWT and ADMIN role
router.use(verifyToken, authorizeRoles('ADMIN'));

router.get('/',  getAllRegistrations);
router.post('/', startRegistration);
router.put('/:id/limits',           setBatchLimit);
router.delete('/:id/limits/:batch', deleteBatchLimit);

module.exports = router;
