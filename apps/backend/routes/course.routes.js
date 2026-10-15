const express = require('express');
const router  = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const {
  getAllCourses, getCourse, createCourse, updateCourse, deleteCourse,
} = require('../controllers/course.controller');

// All routes require a valid JWT and ADMIN role
router.use(verifyToken, authorizeRoles('ADMIN'));

router.get('/',       getAllCourses);
router.get('/:id',    getCourse);
router.post('/',      createCourse);
router.put('/:id',    updateCourse);
router.delete('/:id', deleteCourse);

module.exports = router;
