const { z }  = require('zod');
const prisma = require('../db/prismaClient');
const { computeStudentSemester } = require('../utils/studentSemester');
const { DEFAULT_CREDIT_LIMIT } = require('../utils/creditLimit');
const { syncEnrolledSection } = require('../utils/sectionSync');
const { startOfDay } = require('../utils/registrationStatus');
const { syncChallan } = require('../utils/challanSync');
const { summarizeMarks } = require('../utils/marksSummary');
const { GRADE_POINTS, computeGpa, visibleGrade } = require('../utils/grading');

const SEMESTER_RANK = { SPRING: 0, SUMMER: 1, FALL: 2 };

const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;

/* ── Validation schemas ─────────────────────────────────────────────────── */
const createStudentSchema = z.object({
  name:            z.string().min(2, 'Student name must be at least 2 characters'),
  rollNo:          z.string().min(1, 'Roll number is required'),
  email:           z.string().email('Invalid email address'),
  phone:           z.string().min(1, 'Phone number is required'),
  address:         z.string().min(1, 'Address is required'),
  cnic:            z.string().regex(cnicRegex, 'CNIC must be in format 12345-1234567-1'),
  departmentId:    z.number().int('Department is required'),
  batch:           z.string().min(1, 'Batch is required'),
  section:         z.string().min(1, 'Section is required'),
  guardianName:    z.string().min(1, 'Guardian name is required'),
  guardianContact: z.string().min(1, 'Guardian contact is required'),
  guardianCnic:    z.string().regex(cnicRegex, 'Guardian CNIC must be in format 12345-1234567-1'),
});

const updateStudentSchema = z.object({
  name:            z.string().min(2, 'Student name must be at least 2 characters').optional(),
  rollNo:          z.string().min(1, 'Roll number is required').optional(),
  email:           z.string().email('Invalid email address').optional(),
  phone:           z.string().min(1, 'Phone number is required').optional(),
  address:         z.string().min(1, 'Address is required').optional(),
  cnic:            z.string().regex(cnicRegex, 'CNIC must be in format 12345-1234567-1').optional(),
  departmentId:    z.number().int('Department is required').optional(),
  batch:           z.string().min(1, 'Batch is required').optional(),
  section:         z.string().min(1, 'Section is required').optional(),
  guardianName:    z.string().min(1, 'Guardian name is required').optional(),
  guardianContact: z.string().min(1, 'Guardian contact is required').optional(),
  guardianCnic:    z.string().regex(cnicRegex, 'Guardian CNIC must be in format 12345-1234567-1').optional(),
});

const include = {
  department: true,
};

/* ── Student portal (self-service) ───────────────────────────────────────── */
const getSelfStudent = (req) => prisma.student.findFirst({
  where: { email: { equals: req.user.email, mode: 'insensitive' } },
  include: { enrolledSections: true },
});

const NO_STUDENT_PROFILE = { success: false, message: 'No student profile is linked to your account yet. Contact an administrator.' };

/* ── GET /api/students/me ─────────────────────────────────────────────────── */
const getMyProfile = async (req, res, next) => {
  try {
    const student = await prisma.student.findFirst({
      where: { email: { equals: req.user.email, mode: 'insensitive' } },
      include: { department: true, enrolledSections: true },
    });
    if (!student) return res.status(404).json(NO_STUDENT_PROFILE);

    return res.status(200).json({ success: true, student });
  } catch (err) { next(err); }
};

// A student's own department+batch sections are the pool a course can be
// offered under — not just the one they're personally enrolled in — so they
// can pick an alternate section of the same course when one exists.
const getBatchSections = (student) => prisma.section.findMany({
  where: { departmentId: student.departmentId, batch: student.batch },
});

const findActiveRegistration = (now = new Date()) => prisma.registration.findFirst({
  // endDate is stored at midnight of the chosen day, so a registration ending
  // "today" should still be open through the end of today, not before it starts.
  where: { startDate: { lte: now }, endDate: { gte: startOfDay(now) } },
  // If more than one term's window happens to overlap, prefer the one that started most recently.
  orderBy: { startDate: 'desc' },
});

const getEffectiveCreditLimit = async (registrationId, batch) => {
  const override = await prisma.registrationLimit.findUnique({
    where: { registrationId_batch: { registrationId, batch } },
  });
  return override?.creditLimit ?? DEFAULT_CREDIT_LIMIT;
};

/* ── GET /api/students/me/courses — courses actually registered, by term ── */
const getMyCourses = async (req, res, next) => {
  try {
    const student = await getSelfStudent(req);
    if (!student) return res.status(404).json(NO_STUDENT_PROFILE);

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: {
        registration: true,
        course:  { include: { department: true } },
        section: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const groupsByKey = new Map();
    for (const e of enrollments) {
      const key = `${e.registration.semester}-${e.registration.year}`;
      if (!groupsByKey.has(key)) {
        groupsByKey.set(key, { semester: e.registration.semester, year: e.registration.year, courses: [] });
      }
      groupsByKey.get(key).courses.push({
        id: e.course.id, code: e.course.code, name: e.course.name,
        creditHours: e.course.creditHours, department: e.course.department,
        section: e.section,
      });
    }

    // Most recent term first.
    const groups = [...groupsByKey.values()].sort((a, b) =>
      b.year - a.year || SEMESTER_RANK[b.semester] - SEMESTER_RANK[a.semester]
    );

    return res.status(200).json({ success: true, groups });
  } catch (err) { next(err); }
};

/* ── GET /api/students/me/attendance — attendance for registered courses ── */
const getMyAttendance = async (req, res, next) => {
  try {
    const student = await getSelfStudent(req);
    if (!student) return res.status(404).json(NO_STUDENT_PROFILE);

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: {
        registration: true,
        course:  { include: { department: true } },
        section: true,
        attendance: { orderBy: { date: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const groupsByKey = new Map();
    for (const e of enrollments) {
      const key = `${e.registration.semester}-${e.registration.year}`;
      if (!groupsByKey.has(key)) {
        groupsByKey.set(key, { semester: e.registration.semester, year: e.registration.year, courses: [] });
      }

      const present = e.attendance.filter(a => a.status === 'PRESENT').length;
      const late    = e.attendance.filter(a => a.status === 'LATE').length;
      const absent  = e.attendance.filter(a => a.status === 'ABSENT').length;
      const total   = e.attendance.length;

      groupsByKey.get(key).courses.push({
        id: e.course.id, code: e.course.code, name: e.course.name,
        creditHours: e.course.creditHours, department: e.course.department,
        section: e.section,
        summary: { present, late, absent, total, percentage: total ? Math.round(((present + late) / total) * 100) : null },
        records: e.attendance.map(a => ({ date: a.date, status: a.status })),
      });
    }

    // Most recent term first.
    const groups = [...groupsByKey.values()].sort((a, b) =>
      b.year - a.year || SEMESTER_RANK[b.semester] - SEMESTER_RANK[a.semester]
    );

    return res.status(200).json({ success: true, groups });
  } catch (err) { next(err); }
};

const MARKS_ENROLLMENT_INCLUDE = {
  registration: true,
  course:  { include: { department: true } },
  section: true,
  marks:   true,
};

// Shapes enrollments (with MARKS_ENROLLMENT_INCLUDE) into course + marks
// entries. Every assessment the teacher created for the course+section is
// listed, with obtained = null until it's graded; totals only count graded ones.
async function toCoursesMarks(enrollments) {
  const categories = enrollments.length === 0 ? [] : await prisma.assessmentCategory.findMany({
    where: { OR: enrollments.map(e => ({ courseId: e.courseId, sectionId: e.sectionId })) },
    include: { assessments: { orderBy: { createdAt: 'asc' } } },
  });
  return enrollments.map(e => {
    const obtainedByAssessment = new Map(e.marks.map(m => [m.assessmentId, m.obtained]));
    const marks = categories
      .filter(c => c.courseId === e.courseId && c.sectionId === e.sectionId)
      .flatMap(c => c.assessments.map(a => ({
        id: a.id, type: c.type, title: a.title,
        obtained: obtainedByAssessment.get(a.id) ?? null, total: a.totalMarks,
      })));
    // The live grade is never sent to students; they only get the grade an admin
    // generated, once its visible-from date has passed.
    const { grade, computedGrade, gradeAdjusted, ...summary } = summarizeMarks(marks, e.percentageOverride);

    return {
      enrollmentId: e.id,
      id: e.course.id, code: e.course.code, name: e.course.name,
      creditHours: e.course.creditHours, department: e.course.department,
      section: e.section,
      summary: { ...summary, grade: visibleGrade(e) },
      marks,
    };
  });
}

/* ── GET /api/students/me/marks — teacher-entered marks per registered course ── */
const getMyMarks = async (req, res, next) => {
  try {
    const student = await getSelfStudent(req);
    if (!student) return res.status(404).json(NO_STUDENT_PROFILE);

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: MARKS_ENROLLMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });

    const courses = await toCoursesMarks(enrollments);

    const groupsByKey = new Map();
    enrollments.forEach((e, i) => {
      const key = `${e.registration.semester}-${e.registration.year}`;
      if (!groupsByKey.has(key)) {
        groupsByKey.set(key, {
          semester: e.registration.semester, year: e.registration.year,
          semesterNumber: computeStudentSemester(student.batch, e.registration.semester, e.registration.year),
          courses: [],
        });
      }

      groupsByKey.get(key).courses.push(courses[i]);
    });

    // Most recent term first.
    const groups = [...groupsByKey.values()].sort((a, b) =>
      b.year - a.year || SEMESTER_RANK[b.semester] - SEMESTER_RANK[a.semester]
    );

    return res.status(200).json({ success: true, groups });
  } catch (err) { next(err); }
};

/* ── GET /api/students/me/marks/:enrollmentId — marks for one registered course ── */
const getMyCourseMarks = async (req, res, next) => {
  try {
    const student = await getSelfStudent(req);
    if (!student) return res.status(404).json(NO_STUDENT_PROFILE);

    const enrollmentId = parseInt(req.params.enrollmentId, 10);
    if (isNaN(enrollmentId)) return res.status(400).json({ success: false, message: 'Invalid course.' });

    // Scoped to this student so one student can't read another's marks by id.
    const e = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, studentId: student.id },
      include: MARKS_ENROLLMENT_INCLUDE,
    });
    if (!e) return res.status(404).json({ success: false, message: 'Course not found.' });

    const [courseMarks] = await toCoursesMarks([e]);
    return res.status(200).json({
      success: true,
      course: {
        ...courseMarks,
        semester: e.registration.semester, year: e.registration.year,
        semesterNumber: computeStudentSemester(student.batch, e.registration.semester, e.registration.year),
      },
    });
  } catch (err) { next(err); }
};


/* ── GET /api/students/me/transcript — courses, grades and GPA per semester ── */
const getMyTranscript = async (req, res, next) => {
  try {
    const student = await getSelfStudent(req);
    if (!student) return res.status(404).json(NO_STUDENT_PROFILE);

    const [department, enrollments] = await Promise.all([
      prisma.department.findUnique({ where: { id: student.departmentId } }),
      prisma.enrollment.findMany({
        where: { studentId: student.id },
        include: { registration: true, course: true },
        orderBy: { course: { code: 'asc' } },
      }),
    ]);

    const bySemester = new Map();
    for (const e of enrollments) {
      const key = `${e.registration.semester}-${e.registration.year}`;
      if (!bySemester.has(key)) {
        bySemester.set(key, {
          semester: e.registration.semester, year: e.registration.year,
          semesterNumber: computeStudentSemester(student.batch, e.registration.semester, e.registration.year),
          courses: [],
        });
      }
      const grade = visibleGrade(e);
      bySemester.get(key).courses.push({
        enrollmentId: e.id, code: e.course.code, name: e.course.name, creditHours: e.course.creditHours,
        grade, gradePoints: grade ? GRADE_POINTS[grade] : null,
      });
    }

    // Transcripts read chronologically: oldest semester first.
    const semesters = [...bySemester.values()]
      .sort((a, b) => a.year - b.year || SEMESTER_RANK[a.semester] - SEMESTER_RANK[b.semester])
      .map(s => ({
        ...s,
        creditHours: s.courses.reduce((sum, c) => sum + c.creditHours, 0),
        gpa: computeGpa(s.courses),
      }));
    const allCourses = semesters.flatMap(s => s.courses);

    return res.status(200).json({
      success: true,
      student: { name: student.name, rollNo: student.rollNo, batch: student.batch, department: department && { name: department.name, code: department.code } },
      semesters,
      totalCreditHours: allCourses.reduce((sum, c) => sum + c.creditHours, 0),
      cgpa: computeGpa(allCourses),
    });
  } catch (err) { next(err); }
};

/* ── GET /api/students/me/registrations — offered courses to register for ── */
const getMyRegistrations = async (req, res, next) => {
  try {
    let student = await getSelfStudent(req);
    if (!student) return res.status(404).json(NO_STUDENT_PROFILE);

    // Self-heal on every load: the real Section link can go stale for
    // reasons outside this request (an admin editing the section roster
    // directly, data fixed up out of band, etc.), so don't rely solely on
    // create/update hooks having already caught it.
    await syncEnrolledSection(student.id);
    student = await getSelfStudent(req);

    const registration = await findActiveRegistration();
    if (!registration) {
      return res.status(200).json({
        success: true,
        registrationOpen: false,
        message: 'Registration is not currently open.',
        courses: [],
      });
    }

    const semester = computeStudentSemester(student.batch, registration.semester, registration.year);

    const homeSectionIds = student.enrolledSections
      .filter(s => s.departmentId === student.departmentId && s.batch === student.batch)
      .map(s => s.id);

    if (homeSectionIds.length === 0 || !semester || semester < 1 || semester > 8) {
      const message = homeSectionIds.length === 0
        ? 'You are not yet assigned to a section. Contact an administrator.'
        : semester > 8
          ? 'You have completed all 8 semesters.'
          : 'Your batch has not started yet.';
      return res.status(200).json({
        success: true, registrationOpen: true, registration, semester, message,
        courses: [], creditLimit: DEFAULT_CREDIT_LIMIT, creditsUsed: 0,
      });
    }

    const batchSections   = await getBatchSections(student);
    const batchSectionIds = batchSections.map(s => s.id);

    const courses = await prisma.course.findMany({
      where: { departmentId: student.departmentId, sectionLinks: { some: { sectionId: { in: batchSectionIds } } } },
      include: {
        department: true,
        sectionLinks: { where: { sectionId: { in: batchSectionIds } }, include: { section: true, teacher: true } },
      },
      orderBy: { code: 'asc' },
    });

    const existingEnrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, registrationId: registration.id },
      include: { course: true },
    });
    const enrolledByCourseId = new Map(existingEnrollments.map(e => [e.courseId, e]));
    const creditsUsed = existingEnrollments.reduce((sum, e) => sum + e.course.creditHours, 0);
    const creditLimit = await getEffectiveCreditLimit(registration.id, student.batch);

    const result = courses.map(c => {
      const enrollment = enrolledByCourseId.get(c.id);
      const sections = c.sectionLinks.map(l => ({ id: l.section.id, label: l.section.label, teacher: l.teacher }));
      // Prefer the section the student's own profile names (the Add/Edit
      // Student form's free-text `section` field) as the default choice,
      // falling back to their real section link, then to the first offered.
      const defaultSectionId =
        sections.find(s => s.label.toLowerCase() === student.section.toLowerCase())?.id
        ?? sections.find(s => homeSectionIds.includes(s.id))?.id
        ?? sections[0]?.id
        ?? null;
      return {
        id: c.id, code: c.code, name: c.name, creditHours: c.creditHours, department: c.department,
        sections, defaultSectionId,
        registered: !!enrollment,
        registeredSectionId: enrollment ? enrollment.sectionId : null,
      };
    });

    return res.status(200).json({
      success: true, registrationOpen: true, registration, semester,
      creditLimit, creditsUsed, courses: result,
      ...(result.length === 0 && {
        message: 'No courses have been offered to your batch yet. Contact an administrator.',
      }),
    });
  } catch (err) { next(err); }
};

/* ── Validation schema ───────────────────────────────────────────────────── */
const registerCourseSchema = z.object({
  courseId:  z.number().int('Course is required'),
  sectionId: z.number().int('Section is required'),
});

/* ── POST /api/students/me/registrations ─────────────────────────────────── */
const registerCourse = async (req, res, next) => {
  try {
    const student = await getSelfStudent(req);
    if (!student) return res.status(404).json(NO_STUDENT_PROFILE);

    const parsed = registerCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { courseId, sectionId } = parsed.data;

    const registration = await findActiveRegistration();
    if (!registration) return res.status(400).json({ success: false, message: 'Registration is not currently open.' });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    if (course.departmentId !== student.departmentId) {
      return res.status(400).json({ success: false, message: 'This course is not offered to your department.' });
    }

    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section || section.departmentId !== student.departmentId || section.batch !== student.batch) {
      return res.status(400).json({ success: false, message: 'Invalid section for your batch.' });
    }

    const link = await prisma.sectionCourse.findUnique({ where: { sectionId_courseId: { sectionId, courseId } } });
    if (!link) return res.status(400).json({ success: false, message: 'This course is not offered to that section.' });

    const existing = await prisma.enrollment.findUnique({
      where: { studentId_registrationId_courseId: { studentId: student.id, registrationId: registration.id, courseId } },
    });
    if (existing) return res.status(409).json({ success: false, message: 'You are already registered for this course.' });

    const currentEnrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, registrationId: registration.id },
      include: { course: true },
    });
    const creditsUsed  = currentEnrollments.reduce((sum, e) => sum + e.course.creditHours, 0);
    const creditLimit  = await getEffectiveCreditLimit(registration.id, student.batch);

    if (creditsUsed + course.creditHours > creditLimit) {
      return res.status(400).json({
        success: false,
        message: `Registering ${course.code} (${course.creditHours} CR) would exceed your credit limit of ${creditLimit}. You currently have ${creditsUsed} CR registered.`,
      });
    }

    const enrollment = await prisma.enrollment.create({
      data: { studentId: student.id, registrationId: registration.id, courseId, sectionId },
      include: { course: true, section: true },
    });

    await syncChallan(student.id, registration.id);

    return res.status(201).json({ success: true, message: `Registered for ${course.code} successfully.`, enrollment });
  } catch (err) { next(err); }
};

/* ── GET /api/students ────────────────────────────────────────────────────── */
const getAllStudents = async (req, res, next) => {
  try {
    const { search = '', unlinked = '' } = req.query;

    // unlinked=true restricts to students who don't already have a User login,
    // used by the Create User form so admins can only pick a real, un-onboarded student.
    let emailNotIn;
    if (unlinked === 'true') {
      const linkedUsers = await prisma.user.findMany({ select: { email: true } });
      emailNotIn = linkedUsers.map(u => u.email);
    }

    const students = await prisma.student.findMany({
      where: {
        ...(search ? {
          OR: [
            { name:   { contains: search, mode: 'insensitive' } },
            { email:  { contains: search, mode: 'insensitive' } },
            { rollNo: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
        ...(emailNotIn ? { email: { notIn: emailNotIn } } : {}),
      },
      include,
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ success: true, students });
  } catch (err) { next(err); }
};

/* ── GET /api/students/:id ───────────────────────────────────────────────── */
const getStudent = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid student ID.' });

    const student = await prisma.student.findUnique({ where: { id }, include });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    return res.status(200).json({ success: true, student });
  } catch (err) { next(err); }
};

/* ── POST /api/students ──────────────────────────────────────────────────── */
const createStudent = async (req, res, next) => {
  try {
    const parsed = createStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { email, cnic, rollNo, departmentId } = parsed.data;

    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });

    const existing = await prisma.student.findFirst({ where: { OR: [{ email }, { cnic }, { rollNo }] } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A student with this email, CNIC, or roll number already exists.' });
    }

    const student = await prisma.student.create({ data: parsed.data, include });
    await syncEnrolledSection(student.id);

    return res.status(201).json({ success: true, message: 'Student added successfully.', student });
  } catch (err) { next(err); }
};

/* ── PUT /api/students/:id ───────────────────────────────────────────────── */
const updateStudent = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid student ID.' });

    const parsed = updateStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const target = await prisma.student.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ success: false, message: 'Student not found.' });

    const { email, cnic, rollNo, departmentId } = parsed.data;

    if (departmentId) {
      const department = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    if ((email && email !== target.email) || (cnic && cnic !== target.cnic) || (rollNo && rollNo !== target.rollNo)) {
      const clash = await prisma.student.findFirst({
        where: {
          id: { not: id },
          OR: [...(email ? [{ email }] : []), ...(cnic ? [{ cnic }] : []), ...(rollNo ? [{ rollNo }] : [])],
        },
      });
      if (clash) return res.status(409).json({ success: false, message: 'A student with this email, CNIC, or roll number already exists.' });
    }

    const student = await prisma.student.update({ where: { id }, data: parsed.data, include });
    await syncEnrolledSection(student.id);

    return res.status(200).json({ success: true, message: 'Student updated successfully.', student });
  } catch (err) { next(err); }
};

/* ── DELETE /api/students/:id ────────────────────────────────────────────── */
const deleteStudent = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid student ID.' });

    const target = await prisma.student.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ success: false, message: 'Student not found.' });

    await prisma.student.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Student deleted successfully.' });
  } catch (err) { next(err); }
};

module.exports = {
  getAllStudents, getStudent, createStudent, updateStudent, deleteStudent,
  getMyProfile, getMyCourses, getMyAttendance, getMyMarks, getMyCourseMarks, getMyTranscript, getMyRegistrations, registerCourse,
};
