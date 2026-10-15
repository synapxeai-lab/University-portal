const express = require('express');
const router  = express.Router();

router.use('/auth',        require('./auth.routes'));
router.use('/users',       require('./user.routes'));
router.use('/dashboard',   require('./dashboard.routes'));
router.use('/departments', require('./department.routes'));
router.use('/courses',     require('./course.routes'));
router.use('/teachers',    require('./teacher.routes'));
router.use('/students',    require('./student.routes'));
router.use('/sections',    require('./section.routes'));
router.use('/registrations', require('./registration.routes'));
router.use('/challans',      require('./challan.routes'));
router.use('/marks',         require('./marks.routes'));

module.exports = router;
