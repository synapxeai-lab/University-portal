const express = require('express');
const router  = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/user.controller');

// All routes require a valid JWT + ADMIN role
router.use(verifyToken, authorizeRoles('ADMIN'));

router.get('/',    getAllUsers);
router.post('/',   createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
