const express = require('express');
const router  = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const {
  getAllStudents, getStudent, createStudent, updateStudent, deleteStudent,
  getMyProfile, getMyCourses, getMyAttendance, getMyMarks, getMyCourseMarks, getMyTranscript, getMyRegistrations, registerCourse,
} = require('../controllers/student.controller');

// Student-portal routes (self-service, STUDENT role only)
router.get('/me',                 verifyToken, authorizeRoles('STUDENT'), getMyProfile);
router.get('/me/courses',         verifyToken, authorizeRoles('STUDENT'), getMyCourses);
router.get('/me/attendance',      verifyToken, authorizeRoles('STUDENT'), getMyAttendance);
router.get('/me/marks',           verifyToken, authorizeRoles('STUDENT'), getMyMarks);
router.get('/me/marks/:enrollmentId', verifyToken, authorizeRoles('STUDENT'), getMyCourseMarks);
router.get('/me/transcript',      verifyToken, authorizeRoles('STUDENT'), getMyTranscript);
router.get('/me/registrations',   verifyToken, authorizeRoles('STUDENT'), getMyRegistrations);
router.post('/me/registrations',  verifyToken, authorizeRoles('STUDENT'), registerCourse);

// All routes below require a valid JWT and ADMIN role
router.use(verifyToken, authorizeRoles('ADMIN'));

router.get('/',       getAllStudents);
router.get('/:id',    getStudent);
router.post('/',      createStudent);
router.put('/:id',    updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;
