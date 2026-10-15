const express = require('express');
const router  = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const {
  getAdminSectionMarks, setPercentageOverride, getAdminCourseGrading, saveAdminGradingCriteria,
  getAdminCourseGrades, setGradeOverride,
  generateGrades, getGradeReleases, updateGradeRelease, deleteGradeRelease,
} = require('../controllers/marks.controller');

// Admin marks: read-only view of teacher-entered marks, a per-student override
// of the final course percentage, and grading criteria for any offered section.
// Teachers' routes live under /teachers/me.
router.use(verifyToken, authorizeRoles('ADMIN'));

router.get('/courses/:courseId/sections/:sectionId', getAdminSectionMarks);
router.put('/enrollments/:enrollmentId/percentage',  setPercentageOverride);

router.get('/courses/:courseId/grading',                     getAdminCourseGrading);
router.put('/courses/:courseId/sections/:sectionId/grading', saveAdminGradingCriteria);

router.get('/courses/:courseId/grades',        getAdminCourseGrades);
router.put('/enrollments/:enrollmentId/grade', setGradeOverride);
router.post('/grades/generate',                generateGrades);
router.get('/grades/releases',                 getGradeReleases);
router.put('/grades/releases/:courseId',       updateGradeRelease);
router.delete('/grades/releases/:courseId',    deleteGradeRelease);

module.exports = router;
