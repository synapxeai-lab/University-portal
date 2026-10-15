const { z }  = require('zod');
const prisma = require('../db/prismaClient');
const { syncStudentsForNewSection } = require('../utils/sectionSync');
const { ATTENDANCE_STATUSES, getRosterForDate, saveAttendance, getAttendanceDates } = require('../utils/attendanceRoster');

const createSectionSchema = z.object({
  departmentId: z.number().int('Department is required'),
  batch:        z.string().min(1, 'Batch is required'),
});

const assignTeacherSchema = z.object({
  teacherId: z.number().int().nullable(),
});

const addStudentSchema = z.object({
  studentId: z.number().int('Student is required'),
});

const offerCourseSchema = z.object({
  departmentId: z.number().int('Department is required'),
  courseId:     z.number().int('Course is required'),
  batch:        z.string().min(1, 'Batch is required'),
});

const include = {
  department: true,
  students:    { orderBy: { name: 'asc' } },
  courseLinks: {
    include: { course: true, teacher: true },
    orderBy: { course: { code: 'asc' } },
  },
};

/* ── GET /api/sections/:id ───────────────────────────────────────────────── */
const getSection = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid section ID.' });

    const section = await prisma.section.findUnique({ where: { id }, include });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found.' });

    return res.status(200).json({ success: true, section });
  } catch (err) { next(err); }
};

/* ── POST /api/sections ──────────────────────────────────────────────────── */
const createSection = async (req, res, next) => {
  try {
    const parsed = createSectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { departmentId, batch } = parsed.data;

    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });

    const existingSections = await prisma.section.findMany({ where: { departmentId, batch }, select: { label: true } });
    const existingLabels = new Set(existingSections.map(s => s.label));
    let label = null;
    for (let i = 0; i < 26; i++) {
      const candidate = String.fromCharCode(65 + i);
      if (!existingLabels.has(candidate)) { label = candidate; break; }
    }
    if (!label) {
      return res.status(400).json({ success: false, message: 'Maximum number of sections (26) reached for this batch.' });
    }

    // Courses are only linked to this section via the Offer Courses page.
    const section = await prisma.section.create({
      data: { departmentId, batch, label },
      include,
    });

    // Any existing student whose department/batch/free-text section already
    // match this new section should be linked immediately, not left waiting
    // for their own record to be re-saved.
    await syncStudentsForNewSection(section);

    return res.status(201).json({ success: true, message: `Section ${label} added successfully.`, section });
  } catch (err) { next(err); }
};

/* ── DELETE /api/sections/:id ─────────────────────────────────────────────── */
const deleteSection = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid section ID.' });

    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found.' });

    await prisma.section.delete({ where: { id } });

    return res.status(200).json({ success: true, message: `Section ${section.label} deleted successfully.` });
  } catch (err) { next(err); }
};

/* ── PUT /api/sections/:id/courses/:courseId/assign ──────────────────────── */
const assignTeacher = async (req, res, next) => {
  try {
    const sectionId = parseInt(req.params.id, 10);
    const courseId  = parseInt(req.params.courseId, 10);
    if (isNaN(sectionId) || isNaN(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid section or course ID.' });
    }

    const parsed = assignTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { teacherId } = parsed.data;

    const link = await prisma.sectionCourse.findUnique({ where: { sectionId_courseId: { sectionId, courseId } } });
    if (!link) return res.status(404).json({ success: false, message: 'This section is not linked to that course.' });

    if (teacherId !== null) {
      const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    await prisma.sectionCourse.update({
      where: { sectionId_courseId: { sectionId, courseId } },
      data:  { teacherId },
    });

    const section = await prisma.section.findUnique({ where: { id: sectionId }, include });

    return res.status(200).json({
      success: true,
      message: teacherId ? 'Teacher assigned successfully.' : 'Teacher unassigned successfully.',
      section,
    });
  } catch (err) { next(err); }
};

/* ── POST /api/sections/:id/students ─────────────────────────────────────── */
const addStudent = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid section ID.' });

    const parsed = addStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { studentId } = parsed.data;

    const section = await prisma.section.findUnique({ where: { id }, include: { students: true } });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found.' });

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    if (student.batch !== section.batch) {
      return res.status(400).json({ success: false, message: `Student's batch (${student.batch}) does not match this section's batch (${section.batch}).` });
    }

    if (section.students.some(s => s.id === studentId)) {
      return res.status(409).json({ success: false, message: 'Student is already enrolled in this section.' });
    }

    const updated = await prisma.section.update({
      where:   { id },
      data:    { students: { connect: { id: studentId } } },
      include,
    });

    return res.status(200).json({ success: true, message: 'Student added to section successfully.', section: updated });
  } catch (err) { next(err); }
};

/* ── DELETE /api/sections/:id/students/:studentId ────────────────────────── */
const removeStudent = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const studentId = parseInt(req.params.studentId, 10);
    if (isNaN(id) || isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid section or student ID.' });
    }

    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found.' });

    const updated = await prisma.section.update({
      where:   { id },
      data:    { students: { disconnect: { id: studentId } } },
      include,
    });

    return res.status(200).json({ success: true, message: 'Student removed from section successfully.', section: updated });
  } catch (err) { next(err); }
};

/* ── POST /api/sections/offer ────────────────────────────────────────────── */
const offerCourse = async (req, res, next) => {
  try {
    const parsed = offerCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { departmentId, courseId, batch } = parsed.data;

    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    if (course.departmentId !== departmentId) {
      return res.status(400).json({ success: false, message: 'This course does not belong to the selected department.' });
    }

    const sections = await prisma.section.findMany({ where: { departmentId, batch }, select: { id: true } });
    if (sections.length === 0) {
      return res.status(404).json({ success: false, message: `No sections found for Batch ${batch} in this department.` });
    }

    // Link the course to every section of this batch that isn't already linked (idempotent).
    const { count } = await prisma.sectionCourse.createMany({
      data:           sections.map(s => ({ sectionId: s.id, courseId })),
      skipDuplicates: true,
    });

    const message = count > 0
      ? `${course.code} offered to ${count} of ${sections.length} section(s) in Batch ${batch}.`
      : `${course.code} is already offered to every section in Batch ${batch}.`;

    return res.status(200).json({ success: true, message, offeredCount: count, totalSections: sections.length });
  } catch (err) { next(err); }
};

/* ── DELETE /api/sections/offer ──────────────────────────────────────────── */
const unofferCourse = async (req, res, next) => {
  try {
    const parsed = offerCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { departmentId, courseId, batch } = parsed.data;

    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    if (course.departmentId !== departmentId) {
      return res.status(400).json({ success: false, message: 'This course does not belong to the selected department.' });
    }

    const sections = await prisma.section.findMany({ where: { departmentId, batch }, select: { id: true } });
    if (sections.length === 0) {
      return res.status(404).json({ success: false, message: `No sections found for Batch ${batch} in this department.` });
    }

    // Removing the link also drops any teacher assignment for that section/course pair.
    const { count } = await prisma.sectionCourse.deleteMany({
      where: { courseId, sectionId: { in: sections.map(s => s.id) } },
    });

    const message = count > 0
      ? `${course.code} is no longer offered to Batch ${batch}.`
      : `${course.code} was not offered to Batch ${batch}.`;

    return res.status(200).json({ success: true, message, removedCount: count });
  } catch (err) { next(err); }
};

const saveAttendanceSchema = z.object({
  date: z.coerce.date({ errorMap: () => ({ message: 'A valid date is required' }) }),
  records: z.array(z.object({
    enrollmentId: z.number().int(),
    status: z.enum(ATTENDANCE_STATUSES),
  })),
});

/* ── GET /api/sections/:id/courses/:courseId/attendance ──────────────────── */
// Admin equivalent of the teacher attendance view — same roster/date shape,
// but not restricted to sections the caller personally teaches.
const getSectionAttendance = async (req, res, next) => {
  try {
    const sectionId = parseInt(req.params.id, 10);
    const courseId  = parseInt(req.params.courseId, 10);
    if (isNaN(sectionId) || isNaN(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid section or course ID.' });
    }

    const date = new Date(req.query.date);
    if (isNaN(date.getTime())) return res.status(400).json({ success: false, message: 'A valid date is required.' });

    const link = await prisma.sectionCourse.findUnique({
      where: { sectionId_courseId: { sectionId, courseId } },
      include: {
        course:  { include: { department: true } },
        section: { include: { department: true } },
        teacher: true,
      },
    });
    if (!link) return res.status(404).json({ success: false, message: 'This section is not linked to that course.' });

    const roster = await getRosterForDate(courseId, sectionId, date);
    return res.status(200).json({
      success: true, date, course: link.course, section: link.section, teacher: link.teacher, roster,
    });
  } catch (err) { next(err); }
};

/* ── GET /api/sections/:id/courses/:courseId/attendance/dates ────────────── */
const getSectionAttendanceDates = async (req, res, next) => {
  try {
    const sectionId = parseInt(req.params.id, 10);
    const courseId  = parseInt(req.params.courseId, 10);
    if (isNaN(sectionId) || isNaN(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid section or course ID.' });
    }

    const link = await prisma.sectionCourse.findUnique({ where: { sectionId_courseId: { sectionId, courseId } } });
    if (!link) return res.status(404).json({ success: false, message: 'This section is not linked to that course.' });

    const dates = await getAttendanceDates(courseId, sectionId);
    return res.status(200).json({ success: true, dates });
  } catch (err) { next(err); }
};

/* ── POST /api/sections/:id/courses/:courseId/attendance ─────────────────── */
const updateSectionAttendance = async (req, res, next) => {
  try {
    const sectionId = parseInt(req.params.id, 10);
    const courseId  = parseInt(req.params.courseId, 10);
    if (isNaN(sectionId) || isNaN(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid section or course ID.' });
    }

    const parsed = saveAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const link = await prisma.sectionCourse.findUnique({ where: { sectionId_courseId: { sectionId, courseId } } });
    if (!link) return res.status(404).json({ success: false, message: 'This section is not linked to that course.' });

    const { date, records } = parsed.data;
    const roster = await saveAttendance(courseId, sectionId, date, records);

    return res.status(200).json({ success: true, message: 'Attendance saved successfully.', date, roster });
  } catch (err) { next(err); }
};

module.exports = {
  getSection, createSection, deleteSection, assignTeacher, addStudent, removeStudent,
  offerCourse, unofferCourse, getSectionAttendance, getSectionAttendanceDates, updateSectionAttendance,
};
