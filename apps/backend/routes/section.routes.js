const express = require('express');
const router  = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const {
  getSection, createSection, deleteSection, assignTeacher, addStudent, removeStudent,
  offerCourse, unofferCourse, getSectionAttendance, getSectionAttendanceDates, updateSectionAttendance,
} = require('../controllers/section.controller');

// All routes require a valid JWT and ADMIN role
router.use(verifyToken, authorizeRoles('ADMIN'));

router.get('/:id', getSection);
router.post('/',      createSection);
router.post('/offer',   offerCourse);
router.delete('/offer', unofferCourse);
router.delete('/:id', deleteSection);
router.put('/:id/courses/:courseId/assign', assignTeacher);
router.post('/:id/students',                addStudent);
router.delete('/:id/students/:studentId',   removeStudent);
router.get('/:id/courses/:courseId/attendance',  getSectionAttendance);
router.get('/:id/courses/:courseId/attendance/dates', getSectionAttendanceDates);
router.post('/:id/courses/:courseId/attendance', updateSectionAttendance);

module.exports = router;
