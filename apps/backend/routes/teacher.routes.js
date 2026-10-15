const express = require('express');
const router  = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const {
  getAllTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher,
  getMyProfile, getMyCourses, getMyCourseSections, getMySectionStudents, getMyStudents,
  getMySectionAttendance, getMySectionAttendanceDates, saveMySectionAttendance,
} = require('../controllers/teacher.controller');
const {
  getSectionMarks, getCourseGrading, saveGradingCriteria, createCategory, getCategory, deleteCategory,
  createAssessment, getAssessment, updateAssessment, deleteAssessment, saveMarks,
  getMyCourseGrades, setMyGradeOverride, generateMyGrades, getMyGradeReleases, updateMyGradeRelease, deleteMyGradeRelease,
} = require('../controllers/marks.controller');

// Teacher-portal routes (self-service, TEACHER role only)
router.get('/me',                                       verifyToken, authorizeRoles('TEACHER'), getMyProfile);
router.get('/me/courses',                              verifyToken, authorizeRoles('TEACHER'), getMyCourses);
router.get('/me/students',                             verifyToken, authorizeRoles('TEACHER'), getMyStudents);
router.get('/me/courses/:courseId',                     verifyToken, authorizeRoles('TEACHER'), getMyCourseSections);
router.get('/me/courses/:courseId/sections/:sectionId', verifyToken, authorizeRoles('TEACHER'), getMySectionStudents);
router.get('/me/courses/:courseId/sections/:sectionId/attendance',  verifyToken, authorizeRoles('TEACHER'), getMySectionAttendance);
router.get('/me/courses/:courseId/sections/:sectionId/attendance/dates', verifyToken, authorizeRoles('TEACHER'), getMySectionAttendanceDates);
router.post('/me/courses/:courseId/sections/:sectionId/attendance', verifyToken, authorizeRoles('TEACHER'), saveMySectionAttendance);

// Marks: categories (Quizzes, Mid...) → assessments (Quiz 1...) → per-student marks
router.get('/me/courses/:courseId/sections/:sectionId/marks',             verifyToken, authorizeRoles('TEACHER'), getSectionMarks);
router.post('/me/courses/:courseId/sections/:sectionId/marks/categories', verifyToken, authorizeRoles('TEACHER'), createCategory);
router.get('/me/marks/categories/:categoryId',               verifyToken, authorizeRoles('TEACHER'), getCategory);
router.delete('/me/marks/categories/:categoryId',             verifyToken, authorizeRoles('TEACHER'), deleteCategory);
router.post('/me/marks/categories/:categoryId/assessments',   verifyToken, authorizeRoles('TEACHER'), createAssessment);
router.get('/me/marks/assessments/:assessmentId',             verifyToken, authorizeRoles('TEACHER'), getAssessment);
router.put('/me/marks/assessments/:assessmentId',             verifyToken, authorizeRoles('TEACHER'), updateAssessment);
router.delete('/me/marks/assessments/:assessmentId',          verifyToken, authorizeRoles('TEACHER'), deleteAssessment);
router.put('/me/marks/assessments/:assessmentId/marks',       verifyToken, authorizeRoles('TEACHER'), saveMarks);

// Grading criteria: letter-grade ranges per course+section
router.get('/me/courses/:courseId/grading',                     verifyToken, authorizeRoles('TEACHER'), getCourseGrading);
router.put('/me/courses/:courseId/sections/:sectionId/grading', verifyToken, authorizeRoles('TEACHER'), saveGradingCriteria);

// Grades: limited to sections the teacher teaches
router.get('/me/courses/:courseId/grades',          verifyToken, authorizeRoles('TEACHER'), getMyCourseGrades);
router.put('/me/enrollments/:enrollmentId/grade',   verifyToken, authorizeRoles('TEACHER'), setMyGradeOverride);
router.post('/me/grades/generate',                  verifyToken, authorizeRoles('TEACHER'), generateMyGrades);
router.get('/me/grades/releases',                   verifyToken, authorizeRoles('TEACHER'), getMyGradeReleases);
router.put('/me/grades/releases/:courseId',         verifyToken, authorizeRoles('TEACHER'), updateMyGradeRelease);
router.delete('/me/grades/releases/:courseId',      verifyToken, authorizeRoles('TEACHER'), deleteMyGradeRelease);

// All routes below require a valid JWT and ADMIN role
router.use(verifyToken, authorizeRoles('ADMIN'));

router.get('/',       getAllTeachers);
router.get('/:id',    getTeacher);
router.post('/',      createTeacher);
router.put('/:id',    updateTeacher);
router.delete('/:id', deleteTeacher);

module.exports = router;
