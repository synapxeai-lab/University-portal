const prisma = require('../db/prismaClient');
const { syncChallansForStudent, syncAllChallans } = require('../utils/challanSync');
const { computeStudentSemester } = require('../utils/studentSemester');

const getSelfStudent = (req) => prisma.student.findFirst({ where: { email: { equals: req.user.email, mode: 'insensitive' } } });
const NO_STUDENT_PROFILE = { success: false, message: 'No student profile is linked to your account yet. Contact an administrator.' };

// Each challan is tied to a Registration (a calendar semester + year), but
// students think in terms of their own program semester (1st, 2nd, ...), so
// stamp that on for the frontend to group/label by.
const withStudentSemester = (challan, batch) => ({
  ...challan,
  semester: computeStudentSemester(batch, challan.registration.semester, challan.registration.year),
});

/* ── GET /api/challans/me — every challan generated for the logged-in student ── */
const getMyChallans = async (req, res, next) => {
  try {
    const student = await getSelfStudent(req);
    if (!student) return res.status(404).json(NO_STUDENT_PROFILE);

    // Self-heal: catches enrollments that never got a challan generated for
    // them (data predating this feature, etc.), not just ones registered
    // through the normal flow going forward.
    await syncChallansForStudent(student.id);

    const challans = await prisma.challan.findMany({
      where: { studentId: student.id },
      include: { registration: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, challans: challans.map(c => withStudentSemester(c, student.batch)) });
  } catch (err) { next(err); }
};

/* ── POST /api/challans/:id/pay — student submits payment for admin approval ── */
const payChallan = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid challan ID.' });

    const student = await getSelfStudent(req);
    if (!student) return res.status(404).json(NO_STUDENT_PROFILE);

    const challan = await prisma.challan.findUnique({ where: { id } });
    if (!challan || challan.studentId !== student.id) {
      return res.status(404).json({ success: false, message: 'Challan not found.' });
    }
    if (challan.status !== 'UNPAID') {
      return res.status(400).json({
        success: false,
        message: challan.status === 'PAID' ? 'This challan is already paid.' : 'This challan is already awaiting admin approval.',
      });
    }

    const updated = await prisma.challan.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
      include: { registration: true },
    });

    return res.status(200).json({ success: true, message: 'Payment submitted. Waiting for admin approval.', challan: updated });
  } catch (err) { next(err); }
};

/* ── GET /api/challans — all challans (admin), optionally filtered by status ── */
const getAllChallans = async (req, res, next) => {
  try {
    const { status = '' } = req.query;

    // Same self-heal as the student-facing read, so a challan shows up here
    // even for a student who's never opened their own fee challan page.
    await syncAllChallans();

    const challans = await prisma.challan.findMany({
      where: status ? { status } : {},
      include: {
        registration: true,
        student: { include: { department: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.status(200).json({ success: true, challans: challans.map(c => withStudentSemester(c, c.student.batch)) });
  } catch (err) { next(err); }
};

/* ── GET /api/challans/sections/:sectionId — fee challans for every student in a section ── */
const getSectionChallans = async (req, res, next) => {
  try {
    const sectionId = parseInt(req.params.sectionId, 10);
    if (isNaN(sectionId)) return res.status(400).json({ success: false, message: 'Invalid section ID.' });

    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { department: true, students: { orderBy: { name: 'asc' } } },
    });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found.' });

    const students = await Promise.all(section.students.map(async (student) => {
      await syncChallansForStudent(student.id);
      const challans = await prisma.challan.findMany({
        where: { studentId: student.id },
        include: { registration: true },
        orderBy: { createdAt: 'desc' },
      });
      return { ...student, challans: challans.map(c => withStudentSemester(c, student.batch)) };
    }));

    return res.status(200).json({
      success: true,
      section: { id: section.id, label: section.label, batch: section.batch, department: section.department },
      students,
    });
  } catch (err) { next(err); }
};

/* ── PUT /api/challans/:id/approve — admin approves a pending payment ── */
const approveChallan = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid challan ID.' });

    const challan = await prisma.challan.findUnique({ where: { id } });
    if (!challan) return res.status(404).json({ success: false, message: 'Challan not found.' });
    if (challan.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ success: false, message: 'Only challans awaiting approval can be approved.' });
    }

    const updated = await prisma.challan.update({
      where: { id },
      data: { status: 'PAID' },
      include: { registration: true, student: { include: { department: true } } },
    });

    return res.status(200).json({ success: true, message: 'Fee challan approved as paid.', challan: updated });
  } catch (err) { next(err); }
};

module.exports = { getMyChallans, payChallan, getAllChallans, getSectionChallans, approveChallan };
