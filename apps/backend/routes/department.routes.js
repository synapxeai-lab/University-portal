const express = require('express');
const router  = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const {
  getAllDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment,
} = require('../controllers/department.controller');

// All routes require a valid JWT and ADMIN role
router.use(verifyToken, authorizeRoles('ADMIN'));

router.get('/',       getAllDepartments);
router.get('/:id',    getDepartment);
router.post('/',      createDepartment);
router.put('/:id',    updateDepartment);
router.delete('/:id', deleteDepartment);

module.exports = router;
