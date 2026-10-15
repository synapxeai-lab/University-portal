const { z }  = require('zod');
const prisma = require('../db/prismaClient');
const { ATTENDANCE_STATUSES, getRosterForDate, saveAttendance, getAttendanceDates } = require('../utils/attendanceRoster');
const { summarizeEnrollments } = require('../utils/marksSummary');

const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;

/* ── Validation schemas ─────────────────────────────────────────────────── */
const createTeacherSchema = z.object({
  name:            z.string().min(2, 'Teacher name must be at least 2 characters'),
  phone:           z.string().min(1, 'Phone number is required'),
  email:           z.string().email('Invalid email address'),
  address:         z.string().min(1, 'Address is required'),
  cnic:            z.string().regex(cnicRegex, 'CNIC must be in format 12345-1234567-1'),
  qualification:   z.string().min(1, 'Qualification is required'),
  departmentId:    z.number().int('Department is required'),
  guardianName:    z.string().min(1, 'Guardian name is required'),
  guardianContact: z.string().min(1, 'Guardian contact is required'),
  guardianCnic:    z.string().regex(cnicRegex, 'Guardian CNIC must be in format 12345-1234567-1'),
});

const updateTeacherSchema = z.object({
  name:            z.string().min(2, 'Teacher name must be at least 2 characters').optional(),
  phone:           z.string().min(1, 'Phone number is required').optional(),
  email:           z.string().email('Invalid email address').optional(),
  address:         z.string().min(1, 'Address is required').optional(),
  cnic:            z.string().regex(cnicRegex, 'CNIC must be in format 12345-1234567-1').optional(),
  qualification:   z.string().min(1, 'Qualification is required').optional(),
  departmentId:    z.number().int('Department is required').optional(),
  guardianName:    z.string().min(1, 'Guardian name is required').optional(),
  guardianContact: z.string().min(1, 'Guardian contact is required').optional(),
  guardianCnic:    z.string().regex(cnicRegex, 'Guardian CNIC must be in format 12345-1234567-1').optional(),
});

const include = {
  department: true,
  sectionCourses: { include: { course: true, section: true } },
};

/* ── Teacher portal (self-service) ───────────────────────────────────────── */
const getSelfTeacher = (req) => prisma.teacher.findFirst({ where: { email: { equals: req.user.email, mode: 'insensitive' } } });

const NO_TEACHER_PROFILE = { success: false, message: 'No teacher profile is linked to your account yet. Contact an administrator.' };

/* ── GET /api/teachers ───────────────────────────────────────────────────── */
const getAllTeachers = async (req, res, next) => {
  try {
    const { search = '', unlinked = '' } = req.query;

    // unlinked=true restricts to teachers who don't already have a User login,
    // used by the Create User form so admins can only pick a real, un-onboarded teacher.
    let emailNotIn;
    if (unlinked === 'true') {
      const linkedUsers = await prisma.user.findMany({ select: { email: true } });
      emailNotIn = linkedUsers.map(u => u.email);
    }

    const teachers = await prisma.teacher.findMany({
      where: {
        ...(search ? {
          OR: [
            { name:  { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
        ...(emailNotIn ? { email: { notIn: emailNotIn } } : {}),
      },
      include,
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ success: true, teachers });
  } catch (err) { next(err); }
};

/* ── GET /api/teachers/:id ───────────────────────────────────────────────── */
const getTeacher = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid teacher ID.' });

    const teacher = await prisma.teacher.findUnique({ where: { id }, include });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    return res.status(200).json({ success: true, teacher });
  } catch (err) { next(err); }
};

/* ── POST /api/teachers ──────────────────────────────────────────────────── */
const createTeacher = async (req, res, next) => {
  try {
    const parsed = createTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { email, cnic, departmentId } = parsed.data;

    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });

    const existing = await prisma.teacher.findFirst({ where: { OR: [{ email }, { cnic }] } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A teacher with this email or CNIC already exists.' });
    }

    const teacher = await prisma.teacher.create({ data: parsed.data, include });

    return res.status(201).json({ success: true, message: 'Teacher added successfully.', teacher });
  } catch (err) { next(err); }
};

/* ── PUT /api/teachers/:id ───────────────────────────────────────────────── */
const updateTeacher = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid teacher ID.' });

    const parsed = updateTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const target = await prisma.teacher.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    const { email, cnic, departmentId } = parsed.data;

    if (departmentId) {
      const department = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    if ((email && email !== target.email) || (cnic && cnic !== target.cnic)) {
      const clash = await prisma.teacher.findFirst({
        where: {
          id: { not: id },
          OR: [...(email ? [{ email }] : []), ...(cnic ? [{ cnic }] : [])],
        },
      });
      if (clash) return res.status(409).json({ success: false, message: 'A teacher with this email or CNIC already exists.' });
    }

    const teacher = await prisma.teacher.update({ where: { id }, data: parsed.data, include });

    return res.status(200).json({ success: true, message: 'Teacher updated successfully.', teacher });
  } catch (err) { next(err); }
};

/* ── DELETE /api/teachers/:id ────────────────────────────────────────────── */
const deleteTeacher = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid teacher ID.' });

    const target = await prisma.teacher.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ success: false, message: 'Teacher not found.' });

    await prisma.teacher.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Teacher deleted successfully.' });
  } catch (err) { next(err); }
};

/* ── GET /api/teachers/me ─────────────────────────────────────────────────── */
const getMyProfile = async (req, res, next) => {
  try {
    const teacher = await prisma.teacher.findFirst({ where: { email: { equals: req.user.email, mode: 'insensitive' } }, include: { department: true } });
    if (!teacher) return res.status(404).json(NO_TEACHER_PROFILE);

    return res.status(200).json({ success: true, teacher });
  } catch (err) { next(err); }
};

/* ── GET /api/teachers/me/courses ────────────────────────────────────────── */
const getMyCourses = async (req, res, next) => {
  try {
    const teacher = await getSelfTeacher(req);
    if (!teacher) return res.status(404).json(NO_TEACHER_PROFILE);

    const links = await prisma.sectionCourse.findMany({
      where: { teacherId: teacher.id },
      include: { course: { include: { department: true } } },
      orderBy: { course: { code: 'asc' } },
    });

    // A student counts toward a course only once they've registered for
    // this specific section+course pair — not merely by belonging to the section.
    const enrollmentCounts = await Promise.all(
      links.map(l => prisma.enrollment.count({ where: { courseId: l.courseId, sectionId: l.sectionId } }))
    );

    const courseMap = new Map();
    links.forEach((link, i) => {
      if (!courseMap.has(link.courseId)) {
        courseMap.set(link.courseId, { ...link.course, sectionCount: 0, studentCount: 0 });
      }
      const entry = courseMap.get(link.courseId);
      entry.sectionCount += 1;
      entry.studentCount += enrollmentCounts[i];
    });

    return res.status(200).json({ success: true, courses: [...courseMap.values()] });
  } catch (err) { next(err); }
};

/* ── GET /api/teachers/me/courses/:courseId ──────────────────────────────── */
const getMyCourseSections = async (req, res, next) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    if (isNaN(courseId)) return res.status(400).json({ success: false, message: 'Invalid course ID.' });

    const teacher = await getSelfTeacher(req);
    if (!teacher) return res.status(404).json(NO_TEACHER_PROFILE);

    const links = await prisma.sectionCourse.findMany({
      where: { courseId, teacherId: teacher.id },
      include: {
        course: { include: { department: true } },
        section: { include: { department: true } },
      },
      orderBy: [{ section: { batch: 'asc' } }, { section: { label: 'asc' } }],
    });

    if (links.length === 0) {
      return res.status(404).json({ success: false, message: 'You are not assigned to teach this course.' });
    }

    const course = links[0].course;

    // A student counts toward a section only once they've registered for this
    // specific course — belonging to the section alone isn't enough.
    const counts = await prisma.enrollment.groupBy({
      by: ['sectionId'],
      where: { courseId, sectionId: { in: links.map(l => l.sectionId) } },
      _count: { _all: true },
    });
    const countBySection = new Map(counts.map(c => [c.sectionId, c._count._all]));
    const sections = links.map(l => ({ ...l.section, studentCount: countBySection.get(l.sectionId) ?? 0 }));

    return res.status(200).json({ success: true, course, sections });
  } catch (err) { next(err); }
};

/* ── GET /api/teachers/me/students — everyone registered in the teacher's sections ── */
const getMyStudents = async (req, res, next) => {
  try {
    const teacher = await getSelfTeacher(req);
    if (!teacher) return res.status(404).json(NO_TEACHER_PROFILE);

    const links = await prisma.sectionCourse.findMany({
      where: { teacherId: teacher.id },
      select: { courseId: true, sectionId: true },
    });

    // Same rule as the section roster: only students registered for the exact
    // course+section the teacher teaches.
    const enrollments = links.length === 0 ? [] : await prisma.enrollment.findMany({
      where: { OR: links.map(l => ({ courseId: l.courseId, sectionId: l.sectionId })) },
      include: {
        student: { include: { department: true } },
        course:  { select: { id: true, code: true, name: true } },
        section: { select: { id: true, label: true, batch: true } },
        marks:   true,
      },
      orderBy: [{ student: { name: 'asc' } }, { course: { code: 'asc' } }],
    });
    const summaries = await summarizeEnrollments(prisma, enrollments);

    // One row per student, listing every course of this teacher they take.
    const byStudent = new Map();
    for (const e of enrollments) {
      if (!byStudent.has(e.studentId)) {
        const s = e.student;
        byStudent.set(e.studentId, {
          id: s.id, name: s.name, rollNo: s.rollNo, email: s.email, phone: s.phone, batch: s.batch,
          department: { id: s.department.id, code: s.department.code, name: s.department.name, color: s.department.color, bg: s.department.bg },
          courses: [],
        });
      }
      byStudent.get(e.studentId).courses.push({ ...e.course, section: e.section, summary: summaries.get(e.id) });
    }

    return res.status(200).json({ success: true, students: [...byStudent.values()] });
  } catch (err) { next(err); }
};

/* ── GET /api/teachers/me/courses/:courseId/sections/:sectionId ─────────── */
const getMySectionStudents = async (req, res, next) => {
  try {
    const courseId  = parseInt(req.params.courseId, 10);
    const sectionId = parseInt(req.params.sectionId, 10);
    if (isNaN(courseId) || isNaN(sectionId)) {
      return res.status(400).json({ success: false, message: 'Invalid course or section ID.' });
    }

    const teacher = await getSelfTeacher(req);
    if (!teacher) return res.status(404).json(NO_TEACHER_PROFILE);

    const link = await prisma.sectionCourse.findUnique({
      where: { sectionId_courseId: { sectionId, courseId } },
      include: {
        course: { include: { department: true } },
        section: { include: { department: true } },
      },
    });

    if (!link || link.teacherId !== teacher.id) {
      return res.status(404).json({ success: false, message: 'You are not assigned to teach this section.' });
    }

    // A student only shows up in the class roster once they've registered
    // for this specific course — being in the section alone isn't enough.
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, sectionId },
      include: { student: true, marks: true },
      orderBy: { student: { name: 'asc' } },
    });
    const summaries = await summarizeEnrollments(prisma, enrollments);
    const section = {
      ...link.section,
      students: enrollments.map(e => ({ ...e.student, summary: summaries.get(e.id) })),
    };

    return res.status(200).json({ success: true, course: link.course, section });
  } catch (err) { next(err); }
};

const saveAttendanceSchema = z.object({
  date: z.coerce.date({ errorMap: () => ({ message: 'A valid date is required' }) }),
  records: z.array(z.object({
    enrollmentId: z.number().int(),
    status: z.enum(ATTENDANCE_STATUSES),
  })),
});

/* ── GET /api/teachers/me/courses/:courseId/sections/:sectionId/attendance ── */
const getMySectionAttendance = async (req, res, next) => {
  try {
    const courseId  = parseInt(req.params.courseId, 10);
    const sectionId = parseInt(req.params.sectionId, 10);
    if (isNaN(courseId) || isNaN(sectionId)) {
      return res.status(400).json({ success: false, message: 'Invalid course or section ID.' });
    }

    const date = new Date(req.query.date);
    if (isNaN(date.getTime())) return res.status(400).json({ success: false, message: 'A valid date is required.' });

    const teacher = await getSelfTeacher(req);
    if (!teacher) return res.status(404).json(NO_TEACHER_PROFILE);

    const link = await prisma.sectionCourse.findUnique({ where: { sectionId_courseId: { sectionId, courseId } } });
    if (!link || link.teacherId !== teacher.id) {
      return res.status(404).json({ success: false, message: 'You are not assigned to teach this section.' });
    }

    const roster = await getRosterForDate(courseId, sectionId, date);
    return res.status(200).json({ success: true, date, roster });
  } catch (err) { next(err); }
};

/* ── GET /api/teachers/me/courses/:courseId/sections/:sectionId/attendance/dates ── */
const getMySectionAttendanceDates = async (req, res, next) => {
  try {
    const courseId  = parseInt(req.params.courseId, 10);
    const sectionId = parseInt(req.params.sectionId, 10);
    if (isNaN(courseId) || isNaN(sectionId)) {
      return res.status(400).json({ success: false, message: 'Invalid course or section ID.' });
    }

    const teacher = await getSelfTeacher(req);
    if (!teacher) return res.status(404).json(NO_TEACHER_PROFILE);

    const link = await prisma.sectionCourse.findUnique({ where: { sectionId_courseId: { sectionId, courseId } } });
    if (!link || link.teacherId !== teacher.id) {
      return res.status(404).json({ success: false, message: 'You are not assigned to teach this section.' });
    }

    const dates = await getAttendanceDates(courseId, sectionId);
    return res.status(200).json({ success: true, dates });
  } catch (err) { next(err); }
};

/* ── POST /api/teachers/me/courses/:courseId/sections/:sectionId/attendance ─ */
const saveMySectionAttendance = async (req, res, next) => {
  try {
    const courseId  = parseInt(req.params.courseId, 10);
    const sectionId = parseInt(req.params.sectionId, 10);
    if (isNaN(courseId) || isNaN(sectionId)) {
      return res.status(400).json({ success: false, message: 'Invalid course or section ID.' });
    }

    const parsed = saveAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const teacher = await getSelfTeacher(req);
    if (!teacher) return res.status(404).json(NO_TEACHER_PROFILE);

    const link = await prisma.sectionCourse.findUnique({ where: { sectionId_courseId: { sectionId, courseId } } });
    if (!link || link.teacherId !== teacher.id) {
      return res.status(404).json({ success: false, message: 'You are not assigned to teach this section.' });
    }

    const { date, records } = parsed.data;
    const roster = await saveAttendance(courseId, sectionId, date, records);

    return res.status(200).json({ success: true, message: 'Attendance saved successfully.', date, roster });
  } catch (err) { next(err); }
};

module.exports = {
  getAllTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher,
  getMyProfile, getMyCourses, getMyCourseSections, getMySectionStudents, getMyStudents,
  getMySectionAttendance, getMySectionAttendanceDates, saveMySectionAttendance,
};
