const prisma = require('../db/prismaClient');

const adminDashboard = (req, res) =>
  res.json({ success: true, message: 'Welcome to Admin Dashboard',
    user: { id: req.user.id, name: req.user.name, role: req.user.role.name } });

const teacherDashboard = (req, res) =>
  res.json({ success: true, message: 'Welcome to Teacher Dashboard',
    user: { id: req.user.id, name: req.user.name, role: req.user.role.name } });

const studentDashboard = (req, res) =>
  res.json({ success: true, message: 'Welcome to Student Dashboard',
    user: { id: req.user.id, name: req.user.name, role: req.user.role.name } });

/* ── GET /api/dashboard/admin/stats ──────────────────────────────────────── */
const adminStats = async (req, res, next) => {
  try {
    const [users, teachers, students, departments, courses] = await Promise.all([
      prisma.user.count(),
      prisma.teacher.count(),
      prisma.student.count(),
      prisma.department.count(),
      prisma.course.count(),
    ]);

    return res.status(200).json({
      success: true,
      stats: { users, teachers, students, departments, courses },
    });
  } catch (err) { next(err); }
};

module.exports = { adminDashboard, teacherDashboard, studentDashboard, adminStats };
