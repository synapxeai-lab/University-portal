const { z }  = require('zod');
const prisma = require('../db/prismaClient');
const { summarizeMarks, summarizeEnrollments } = require('../utils/marksSummary');
const { DEFAULT_GRADES, GRADE_LETTERS, validateGrades } = require('../utils/grading');

// Teacher-side marks management. Hierarchy per course+section:
//   AssessmentCategory (Quizzes, Mid...) → Assessment (Quiz 1, out of 10) → Mark (per student)

const CATEGORY_TYPES = ['QUIZ', 'ASSIGNMENT', 'MID', 'PROJECT', 'FINAL'];

// Quizzes/assignments/projects are numbered ("Quiz 1", "Quiz 2", ...); mid and
// final are a single exam each.
const TITLE_PREFIX = { QUIZ: 'Quiz', ASSIGNMENT: 'Assignment', PROJECT: 'Project' };
const SINGLE_TITLE = { MID: 'Mid Term', FINAL: 'Final Term' };

const getSelfTeacher = (req) => prisma.teacher.findFirst({ where: { email: { equals: req.user.email, mode: 'insensitive' } } });

const NO_TEACHER_PROFILE = { success: false, message: 'No teacher profile is linked to your account yet. Contact an administrator.' };
const NOT_ASSIGNED = { success: false, message: 'You are not assigned to teach this section.' };

const isTeaching = async (teacherId, courseId, sectionId) => {
  const link = await prisma.sectionCourse.findUnique({ where: { sectionId_courseId: { sectionId, courseId } } });
  return !!link && link.teacherId === teacherId;
};

const validationError = (res, parsed) => res.status(400).json({
  success: false,
  message: parsed.error.errors[0]?.message || 'Validation failed',
  errors: parsed.error.flatten().fieldErrors,
});

// Resolves the signed-in teacher and checks they teach the course+section the
// target belongs to. Sends the error response itself and returns null on failure.
async function authorize(req, res, courseId, sectionId) {
  const teacher = await getSelfTeacher(req);
  if (!teacher) { res.status(404).json(NO_TEACHER_PROFILE); return null; }
  if (!(await isTeaching(teacher.id, courseId, sectionId))) { res.status(404).json(NOT_ASSIGNED); return null; }
  return teacher;
}

const parseId = (v) => { const n = parseInt(v, 10); return isNaN(n) ? null : n; };

/* ── GET /api/teachers/me/courses/:courseId/sections/:sectionId/marks ───── */
const getSectionMarks = async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId), sectionId = parseId(req.params.sectionId);
    if (courseId === null || sectionId === null) return res.status(400).json({ success: false, message: 'Invalid course or section ID.' });
    if (!(await authorize(req, res, courseId, sectionId))) return;

    const [course, section, studentCount, categories] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId }, include: { department: true } }),
      prisma.section.findUnique({ where: { id: sectionId } }),
      prisma.enrollment.count({ where: { courseId, sectionId } }),
      prisma.assessmentCategory.findMany({
        where: { courseId, sectionId },
        include: { assessments: { select: { id: true, totalMarks: true } } },
      }),
    ]);

    const sorted = categories
      .sort((a, b) => CATEGORY_TYPES.indexOf(a.type) - CATEGORY_TYPES.indexOf(b.type))
      .map(c => ({
        id: c.id, type: c.type,
        assessmentCount: c.assessments.length,
        totalMarks: c.assessments.reduce((s, a) => s + a.totalMarks, 0),
      }));

    return res.status(200).json({ success: true, course, section, studentCount, categories: sorted });
  } catch (err) { next(err); }
};

/* ── Grading criteria (teacher: own sections; admin: every offered section) ── */

// Each section's criteria for a course, given the SectionCourse links to show.
async function courseGradingResponse(res, courseId, links) {
  const criteria = await prisma.gradingCriteria.findMany({
    where: { courseId, sectionId: { in: links.map(l => l.sectionId) } },
  });
  const bySection = new Map(criteria.map(c => [c.sectionId, c.grades]));

  return res.status(200).json({
    success: true, course: links[0].course, defaultGrades: DEFAULT_GRADES,
    sections: links.map(l => ({
      ...l.section,
      teacher: l.teacher,
      grading: { grades: bySection.get(l.sectionId) || DEFAULT_GRADES, custom: bySection.has(l.sectionId) },
    })),
  });
}

const GRADING_LINK_QUERY = {
  include: { course: { include: { department: true } }, section: true, teacher: { select: { id: true, name: true } } },
  orderBy: [{ section: { batch: 'asc' } }, { section: { label: 'asc' } }],
};

/* ── GET /api/teachers/me/courses/:courseId/grading — criteria per section taught ── */
const getCourseGrading = async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId);
    if (courseId === null) return res.status(400).json({ success: false, message: 'Invalid course ID.' });

    const teacher = await getSelfTeacher(req);
    if (!teacher) return res.status(404).json(NO_TEACHER_PROFILE);

    const links = await prisma.sectionCourse.findMany({ where: { courseId, teacherId: teacher.id }, ...GRADING_LINK_QUERY });
    if (links.length === 0) return res.status(404).json({ success: false, message: 'You are not assigned to teach this course.' });

    return await courseGradingResponse(res, courseId, links);
  } catch (err) { next(err); }
};

/* ── GET /api/marks/courses/:courseId/grading — admin: every section offered the course ── */
const getAdminCourseGrading = async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId);
    if (courseId === null) return res.status(400).json({ success: false, message: 'Invalid course ID.' });

    const links = await prisma.sectionCourse.findMany({ where: { courseId }, ...GRADING_LINK_QUERY });
    if (links.length === 0) return res.status(404).json({ success: false, message: 'This course is not offered to any section.' });

    return await courseGradingResponse(res, courseId, links);
  } catch (err) { next(err); }
};

const gradingSchema = z.object({
  grades: z.array(z.object({
    grade: z.enum(GRADE_LETTERS),
    min: z.number({ invalid_type_error: 'Enter a percentage' }),
    max: z.number({ invalid_type_error: 'Enter a percentage' }),
  })),
});

// Validates and upserts criteria. `canEdit(courseId, sectionId)` checks access
// and sends its own error response, returning false when denied.
const saveGrading = (canEdit) => async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId), sectionId = parseId(req.params.sectionId);
    if (courseId === null || sectionId === null) return res.status(400).json({ success: false, message: 'Invalid course or section ID.' });

    const parsed = gradingSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);

    const grades = parsed.data.grades.map(({ grade, min, max }) => ({ grade, min, max }));
    const invalid = validateGrades(grades);
    if (invalid) return res.status(400).json({ success: false, message: invalid });

    if (!(await canEdit(req, res, courseId, sectionId))) return;

    await prisma.gradingCriteria.upsert({
      where:  { courseId_sectionId: { courseId, sectionId } },
      update: { grades },
      create: { courseId, sectionId, grades },
    });
    return res.status(200).json({ success: true, message: 'Grading criteria saved.', grading: { grades, custom: true } });
  } catch (err) { next(err); }
};

/* ── PUT /api/teachers/me/courses/:courseId/sections/:sectionId/grading ──── */
const saveGradingCriteria = saveGrading(async (req, res, courseId, sectionId) => !!(await authorize(req, res, courseId, sectionId)));

/* ── PUT /api/marks/courses/:courseId/sections/:sectionId/grading — admin ── */
const saveAdminGradingCriteria = saveGrading(async (req, res, courseId, sectionId) => {
  const link = await prisma.sectionCourse.findUnique({ where: { sectionId_courseId: { sectionId, courseId } } });
  if (!link) { res.status(404).json({ success: false, message: 'This course is not offered to this section.' }); return false; }
  return true;
});

const createCategorySchema = z.object({ type: z.enum(CATEGORY_TYPES, { errorMap: () => ({ message: 'Pick a valid section type' }) }) });

/* ── POST /api/teachers/me/courses/:courseId/sections/:sectionId/marks/categories ── */
const createCategory = async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId), sectionId = parseId(req.params.sectionId);
    if (courseId === null || sectionId === null) return res.status(400).json({ success: false, message: 'Invalid course or section ID.' });

    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);
    if (!(await authorize(req, res, courseId, sectionId))) return;

    const { type } = parsed.data;
    const existing = await prisma.assessmentCategory.findUnique({ where: { courseId_sectionId_type: { courseId, sectionId, type } } });
    if (existing) return res.status(409).json({ success: false, message: 'This section already exists for this course.' });

    const category = await prisma.assessmentCategory.create({ data: { courseId, sectionId, type } });
    return res.status(201).json({ success: true, message: 'Section created.', category });
  } catch (err) { next(err); }
};

// Loads a category and authorizes the teacher against its course+section.
async function loadCategory(req, res) {
  const id = parseId(req.params.categoryId);
  if (id === null) { res.status(400).json({ success: false, message: 'Invalid section ID.' }); return null; }
  const category = await prisma.assessmentCategory.findUnique({ where: { id } });
  if (!category) { res.status(404).json({ success: false, message: 'Section not found.' }); return null; }
  if (!(await authorize(req, res, category.courseId, category.sectionId))) return null;
  return category;
}

/* ── GET /api/teachers/me/marks/categories/:categoryId ───────────────────── */
const getCategory = async (req, res, next) => {
  try {
    const category = await loadCategory(req, res);
    if (!category) return;

    const [course, section, studentCount, assessments] = await Promise.all([
      prisma.course.findUnique({ where: { id: category.courseId }, include: { department: true } }),
      prisma.section.findUnique({ where: { id: category.sectionId } }),
      prisma.enrollment.count({ where: { courseId: category.courseId, sectionId: category.sectionId } }),
      prisma.assessment.findMany({
        where: { categoryId: category.id },
        include: { _count: { select: { marks: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return res.status(200).json({
      success: true, course, section, studentCount,
      category: {
        id: category.id, type: category.type,
        // Mid/final are single exams — the UI hides "add" once one exists.
        singleAssessment: !!SINGLE_TITLE[category.type],
        assessments: assessments.map(a => ({ id: a.id, title: a.title, totalMarks: a.totalMarks, gradedCount: a._count.marks })),
      },
    });
  } catch (err) { next(err); }
};

/* ── DELETE /api/teachers/me/marks/categories/:categoryId ────────────────── */
const deleteCategory = async (req, res, next) => {
  try {
    const category = await loadCategory(req, res);
    if (!category) return;
    await prisma.assessmentCategory.delete({ where: { id: category.id } });
    return res.status(200).json({ success: true, message: 'Section deleted.' });
  } catch (err) { next(err); }
};

const totalMarksSchema = z.object({
  totalMarks: z.number({ invalid_type_error: 'Total marks is required' }).positive('Total marks must be greater than 0').max(1000, 'Total marks is too large'),
});

/* ── POST /api/teachers/me/marks/categories/:categoryId/assessments ──────── */
const createAssessment = async (req, res, next) => {
  try {
    const parsed = totalMarksSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);

    const category = await loadCategory(req, res);
    if (!category) return;

    const existing = await prisma.assessment.findMany({ where: { categoryId: category.id }, select: { title: true } });

    let title;
    if (SINGLE_TITLE[category.type]) {
      if (existing.length > 0) return res.status(409).json({ success: false, message: `${SINGLE_TITLE[category.type]} already exists.` });
      title = SINGLE_TITLE[category.type];
    } else {
      // Next number after the highest existing one, so deleting "Quiz 2" of
      // three doesn't produce a second "Quiz 3".
      const prefix = TITLE_PREFIX[category.type];
      const nums = existing.map(a => parseInt(a.title.slice(prefix.length + 1), 10)).filter(n => !isNaN(n));
      title = `${prefix} ${nums.length ? Math.max(...nums) + 1 : 1}`;
    }

    const assessment = await prisma.assessment.create({
      data: { categoryId: category.id, title, totalMarks: parsed.data.totalMarks },
    });
    return res.status(201).json({ success: true, message: `${title} created.`, assessment });
  } catch (err) { next(err); }
};

// Loads an assessment (with its category) and authorizes the teacher.
async function loadAssessment(req, res) {
  const id = parseId(req.params.assessmentId);
  if (id === null) { res.status(400).json({ success: false, message: 'Invalid assessment ID.' }); return null; }
  const assessment = await prisma.assessment.findUnique({ where: { id }, include: { category: true } });
  if (!assessment) { res.status(404).json({ success: false, message: 'Assessment not found.' }); return null; }
  if (!(await authorize(req, res, assessment.category.courseId, assessment.category.sectionId))) return null;
  return assessment;
}

// Roster comes from Enrollment, so only students registered for this exact
// course+section are gradable.
async function getAssessmentRoster(assessment) {
  const { courseId, sectionId } = assessment.category;
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, sectionId },
    include: { student: true },
    orderBy: { student: { name: 'asc' } },
  });
  const marks = await prisma.mark.findMany({ where: { assessmentId: assessment.id } });
  const byEnrollment = new Map(marks.map(m => [m.enrollmentId, m.obtained]));

  return enrollments.map(e => ({
    enrollmentId: e.id,
    student: { id: e.student.id, name: e.student.name, rollNo: e.student.rollNo },
    obtained: byEnrollment.get(e.id) ?? null,
  }));
}

/* ── GET /api/teachers/me/marks/assessments/:assessmentId ────────────────── */
const getAssessment = async (req, res, next) => {
  try {
    const assessment = await loadAssessment(req, res);
    if (!assessment) return;

    const { courseId, sectionId } = assessment.category;
    const [course, section, roster] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId }, include: { department: true } }),
      prisma.section.findUnique({ where: { id: sectionId } }),
      getAssessmentRoster(assessment),
    ]);

    return res.status(200).json({
      success: true, course, section, roster,
      assessment: {
        id: assessment.id, title: assessment.title, totalMarks: assessment.totalMarks,
        category: { id: assessment.category.id, type: assessment.category.type },
      },
    });
  } catch (err) { next(err); }
};

/* ── PUT /api/teachers/me/marks/assessments/:assessmentId — change total marks ── */
const updateAssessment = async (req, res, next) => {
  try {
    const parsed = totalMarksSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);

    const assessment = await loadAssessment(req, res);
    if (!assessment) return;

    const { totalMarks } = parsed.data;
    const highest = await prisma.mark.aggregate({ where: { assessmentId: assessment.id }, _max: { obtained: true } });
    if (highest._max.obtained !== null && highest._max.obtained > totalMarks) {
      return res.status(400).json({
        success: false,
        message: `A student already has ${highest._max.obtained} marks — total can't be lower than that.`,
      });
    }

    const updated = await prisma.assessment.update({ where: { id: assessment.id }, data: { totalMarks } });
    return res.status(200).json({ success: true, message: 'Total marks updated.', assessment: updated });
  } catch (err) { next(err); }
};

/* ── DELETE /api/teachers/me/marks/assessments/:assessmentId ─────────────── */
const deleteAssessment = async (req, res, next) => {
  try {
    const assessment = await loadAssessment(req, res);
    if (!assessment) return;
    await prisma.assessment.delete({ where: { id: assessment.id } });
    return res.status(200).json({ success: true, message: `${assessment.title} deleted.` });
  } catch (err) { next(err); }
};

const saveMarksSchema = z.object({
  records: z.array(z.object({
    enrollmentId: z.number().int(),
    obtained: z.number().min(0, 'Marks cannot be negative').nullable(), // null clears the mark
  })),
});

/* ── PUT /api/teachers/me/marks/assessments/:assessmentId/marks ──────────── */
const saveMarks = async (req, res, next) => {
  try {
    const parsed = saveMarksSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);

    const assessment = await loadAssessment(req, res);
    if (!assessment) return;

    const { records } = parsed.data;
    const over = records.find(r => r.obtained !== null && r.obtained > assessment.totalMarks);
    if (over) {
      return res.status(400).json({ success: false, message: `Marks can't exceed the total of ${assessment.totalMarks}.` });
    }

    // Ignore any enrollment that isn't in this course+section rather than
    // trusting the payload outright.
    const { courseId, sectionId } = assessment.category;
    const enrollments = await prisma.enrollment.findMany({ where: { courseId, sectionId }, select: { id: true } });
    const validIds = new Set(enrollments.map(e => e.id));
    const valid = records.filter(r => validIds.has(r.enrollmentId));

    await prisma.$transaction([
      ...valid.filter(r => r.obtained === null).map(r => prisma.mark.deleteMany({
        where: { assessmentId: assessment.id, enrollmentId: r.enrollmentId },
      })),
      ...valid.filter(r => r.obtained !== null).map(r => prisma.mark.upsert({
        where: { assessmentId_enrollmentId: { assessmentId: assessment.id, enrollmentId: r.enrollmentId } },
        update: { obtained: r.obtained },
        create: { assessmentId: assessment.id, enrollmentId: r.enrollmentId, obtained: r.obtained },
      })),
    ]);

    const roster = await getAssessmentRoster(assessment);
    return res.status(200).json({ success: true, message: 'Marks saved successfully.', roster });
  } catch (err) { next(err); }
};

/* ── Admin: read-only marks sheet + per-student percentage override ─────── */

/* ── GET /api/marks/courses/:courseId/sections/:sectionId ────────────────── */
const getAdminSectionMarks = async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId), sectionId = parseId(req.params.sectionId);
    if (courseId === null || sectionId === null) return res.status(400).json({ success: false, message: 'Invalid course or section ID.' });

    const link = await prisma.sectionCourse.findUnique({
      where: { sectionId_courseId: { sectionId, courseId } },
      include: { course: { include: { department: true } }, section: true, teacher: { select: { id: true, name: true } } },
    });
    if (!link) return res.status(404).json({ success: false, message: 'This course is not offered to this section.' });

    const [categories, enrollments, criteria] = await Promise.all([
      prisma.assessmentCategory.findMany({
        where: { courseId, sectionId },
        include: { assessments: { orderBy: { createdAt: 'asc' } } },
      }),
      prisma.enrollment.findMany({
        where: { courseId, sectionId },
        include: { student: true, marks: true },
        orderBy: { student: { name: 'asc' } },
      }),
      prisma.gradingCriteria.findUnique({ where: { courseId_sectionId: { courseId, sectionId } } }),
    ]);
    const grades = criteria?.grades || DEFAULT_GRADES;

    // Column order: category type order, then creation order within a category.
    const assessments = categories
      .sort((a, b) => CATEGORY_TYPES.indexOf(a.type) - CATEGORY_TYPES.indexOf(b.type))
      .flatMap(c => c.assessments.map(a => ({ id: a.id, type: c.type, title: a.title, totalMarks: a.totalMarks })));

    const students = enrollments.map(e => {
      const byAssessment = new Map(e.marks.map(m => [m.assessmentId, m.obtained]));
      const marks = assessments.map(a => ({ assessmentId: a.id, obtained: byAssessment.get(a.id) ?? null, total: a.totalMarks }));
      return {
        enrollmentId: e.id,
        student: { id: e.student.id, name: e.student.name, rollNo: e.student.rollNo },
        marks: Object.fromEntries(marks.map(m => [m.assessmentId, m.obtained])),
        summary: summarizeMarks(marks, e.percentageOverride, grades, e.gradeOverride),
      };
    });

    return res.status(200).json({
      success: true, course: link.course, section: link.section, teacher: link.teacher,
      assessments, students, grades,
    });
  } catch (err) { next(err); }
};

const overrideSchema = z.object({
  percentage: z.number({ invalid_type_error: 'Percentage must be a number' })
    .min(0, 'Percentage cannot be below 0').max(100, 'Percentage cannot be above 100')
    .nullable(), // null removes the override
});

/* ── PUT /api/marks/enrollments/:enrollmentId/percentage ─────────────────── */
const setPercentageOverride = async (req, res, next) => {
  try {
    const enrollmentId = parseId(req.params.enrollmentId);
    if (enrollmentId === null) return res.status(400).json({ success: false, message: 'Invalid enrollment ID.' });

    const parsed = overrideSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);

    const existing = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Enrollment not found.' });

    const { percentage } = parsed.data;
    await prisma.enrollment.update({ where: { id: enrollmentId }, data: { percentageOverride: percentage } });

    return res.status(200).json({
      success: true,
      message: percentage === null ? 'Adjustment removed — percentage is calculated from marks again.' : 'Course percentage updated.',
    });
  } catch (err) { next(err); }
};


/* ── Grades & generated grades — shared by admin (every offered section) and
   teacher (only sections they teach). Each handler factory takes a scope that
   resolves the SectionCourse links the caller may act on. ───────────────── */

// Scope: (req, res, courseId | null) → links, or null after sending an error.
const adminScope = async (req, res, courseId) => prisma.sectionCourse.findMany({
  where: courseId === null ? {} : { courseId },
  include: { section: true, teacher: { select: { id: true, name: true } } },
  orderBy: [{ section: { batch: 'asc' } }, { section: { label: 'asc' } }],
});

const teacherScope = async (req, res, courseId) => {
  const teacher = await getSelfTeacher(req);
  if (!teacher) { res.status(404).json(NO_TEACHER_PROFILE); return null; }
  return prisma.sectionCourse.findMany({
    where: { teacherId: teacher.id, ...(courseId === null ? {} : { courseId }) },
    include: { section: true, teacher: { select: { id: true, name: true } } },
    orderBy: [{ section: { batch: 'asc' } }, { section: { label: 'asc' } }],
  });
};

const enrollmentsIn = (links) => ({ OR: links.map(l => ({ courseId: l.courseId, sectionId: l.sectionId })) });

/* ── GET {base}/courses/:courseId/grades — students, percentages and grades ── */
const courseGrades = (scope) => async (req, res, next) => {
  try {
    const courseId = parseId(req.params.courseId);
    if (courseId === null) return res.status(400).json({ success: false, message: 'Invalid course ID.' });

    const links = await scope(req, res, courseId);
    if (!links) return;
    const course = await prisma.course.findUnique({ where: { id: courseId }, include: { department: true } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    if (links.length === 0) return res.status(404).json({ success: false, message: 'You have no sections for this course.' });

    const enrollments = await prisma.enrollment.findMany({
      where: enrollmentsIn(links),
      include: { student: true, marks: true },
      orderBy: { student: { name: 'asc' } },
    });
    const summaries = await summarizeEnrollments(prisma, enrollments);

    return res.status(200).json({
      success: true, course, grades: GRADE_LETTERS,
      sections: links.map(l => ({ id: l.section.id, label: l.section.label, batch: l.section.batch, teacher: l.teacher })),
      students: enrollments.map(e => ({
        enrollmentId: e.id,
        sectionId: e.sectionId,
        student: { id: e.student.id, name: e.student.name, rollNo: e.student.rollNo },
        summary: summaries.get(e.id),
        published: e.publishedGrade ? { grade: e.publishedGrade, visibleFrom: e.gradeVisibleFrom } : null,
      })),
    });
  } catch (err) { next(err); }
};

const gradeOverrideSchema = z.object({
  grade: z.enum(GRADE_LETTERS, { errorMap: () => ({ message: 'Pick a valid grade' }) }).nullable(), // null removes the override
});

/* ── PUT {base}/enrollments/:enrollmentId/grade — change one student's grade ── */
const gradeOverride = (scope) => async (req, res, next) => {
  try {
    const enrollmentId = parseId(req.params.enrollmentId);
    if (enrollmentId === null) return res.status(400).json({ success: false, message: 'Invalid enrollment ID.' });

    const parsed = gradeOverrideSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);

    const existing = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Enrollment not found.' });

    const links = await scope(req, res, existing.courseId);
    if (!links) return;
    if (!links.some(l => l.sectionId === existing.sectionId)) return res.status(404).json(NOT_ASSIGNED);

    const { grade } = parsed.data;
    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId }, data: { gradeOverride: grade }, include: { marks: true },
    });
    const summary = (await summarizeEnrollments(prisma, [updated])).get(updated.id);

    return res.status(200).json({
      success: true, summary,
      message: grade === null ? 'Grade reset — it follows the grading criteria again.' : `Grade changed to ${grade}.`,
    });
  } catch (err) { next(err); }
};

const generateSchema = z.object({
  courseId: z.number().int().nullable(), // null = every course in scope
  visibleFrom: z.coerce.date({ errorMap: () => ({ message: 'Pick a valid date' }) }),
});

/* ── POST {base}/grades/generate — snapshot grades and schedule them for students ── */
const generate = (scope) => async (req, res, next) => {
  try {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);
    const { courseId, visibleFrom } = parsed.data;

    const links = await scope(req, res, courseId);
    if (!links) return;
    if (links.length === 0) {
      return res.status(404).json({ success: false, message: courseId === null ? 'There are no courses to generate grades for.' : 'You have no sections for this course.' });
    }

    const enrollments = await prisma.enrollment.findMany({ where: enrollmentsIn(links), include: { marks: true } });
    const summaries = await summarizeEnrollments(prisma, enrollments);

    // Students with no graded marks have no grade to publish; leave them as they are.
    const toPublish = enrollments.filter(e => summaries.get(e.id).grade);
    const generatedAt = new Date();
    await prisma.$transaction(toPublish.map(e => prisma.enrollment.update({
      where: { id: e.id },
      data: { publishedGrade: summaries.get(e.id).grade, gradeVisibleFrom: visibleFrom, gradeGeneratedAt: generatedAt },
    })));

    const skipped = enrollments.length - toPublish.length;
    const courseCount = new Set(toPublish.map(e => e.courseId)).size;
    return res.status(200).json({
      success: true,
      generated: toPublish.length, skipped, courses: courseCount,
      message: `Grades generated for ${toPublish.length} student${toPublish.length === 1 ? '' : 's'}`
        + (courseId === null ? ` across ${courseCount} course${courseCount === 1 ? '' : 's'}` : '')
        + (skipped ? ` · ${skipped} skipped (no marks yet)` : '') + '.',
    });
  } catch (err) { next(err); }
};

/* ── GET {base}/grades/releases — generated grades, one row per course ─────── */
const releases = (scope) => async (req, res, next) => {
  try {
    const links = await scope(req, res, null);
    if (!links) return;
    if (links.length === 0) return res.status(200).json({ success: true, releases: [] });

    const groups = await prisma.enrollment.groupBy({
      by: ['courseId', 'gradeVisibleFrom'],
      where: { ...enrollmentsIn(links), publishedGrade: { not: null } },
      _count: { _all: true },
      _max: { gradeGeneratedAt: true },
    });

    // A course normally has one visible-from date; keep the range in case
    // separate generations left it with several.
    const byCourse = new Map();
    for (const g of groups) {
      const entry = byCourse.get(g.courseId) || { courseId: g.courseId, students: 0, visibleFrom: null, visibleTo: null, generatedAt: null };
      entry.students += g._count._all;
      if (!entry.visibleFrom || g.gradeVisibleFrom < entry.visibleFrom) entry.visibleFrom = g.gradeVisibleFrom;
      if (!entry.visibleTo || g.gradeVisibleFrom > entry.visibleTo) entry.visibleTo = g.gradeVisibleFrom;
      if (!entry.generatedAt || g._max.gradeGeneratedAt > entry.generatedAt) entry.generatedAt = g._max.gradeGeneratedAt;
      byCourse.set(g.courseId, entry);
    }

    const courses = await prisma.course.findMany({
      where: { id: { in: [...byCourse.keys()] } },
      include: { department: true },
    });
    const list = courses
      .map(c => ({ ...byCourse.get(c.id), course: c }))
      .sort((a, b) => (b.generatedAt?.getTime() ?? 0) - (a.generatedAt?.getTime() ?? 0));

    return res.status(200).json({ success: true, releases: list });
  } catch (err) { next(err); }
};

const releaseDateSchema = z.object({
  visibleFrom: z.coerce.date({ errorMap: () => ({ message: 'Pick a valid date' }) }),
});

// Resolves the generated-grade enrollments for :courseId within scope, or
// sends an error and returns null.
async function releaseWhere(scope, req, res) {
  const courseId = parseId(req.params.courseId);
  if (courseId === null) { res.status(400).json({ success: false, message: 'Invalid course ID.' }); return null; }
  const links = await scope(req, res, courseId);
  if (!links) return null;
  if (links.length === 0) { res.status(404).json({ success: false, message: 'You have no sections for this course.' }); return null; }
  return { ...enrollmentsIn(links), publishedGrade: { not: null } };
}

/* ── PUT {base}/grades/releases/:courseId — change when students see the grades ── */
const updateRelease = (scope) => async (req, res, next) => {
  try {
    const parsed = releaseDateSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed);

    const where = await releaseWhere(scope, req, res);
    if (!where) return;

    const { count } = await prisma.enrollment.updateMany({ where, data: { gradeVisibleFrom: parsed.data.visibleFrom } });
    if (count === 0) return res.status(404).json({ success: false, message: 'No grades have been generated for this course.' });

    return res.status(200).json({ success: true, message: 'Visibility date updated.' });
  } catch (err) { next(err); }
};

/* ── DELETE {base}/grades/releases/:courseId — unpublish; students stop seeing grades ── */
const deleteRelease = (scope) => async (req, res, next) => {
  try {
    const where = await releaseWhere(scope, req, res);
    if (!where) return;

    const { count } = await prisma.enrollment.updateMany({
      where, data: { publishedGrade: null, gradeVisibleFrom: null, gradeGeneratedAt: null },
    });
    if (count === 0) return res.status(404).json({ success: false, message: 'No grades have been generated for this course.' });

    return res.status(200).json({ success: true, message: `Grades unpublished for ${count} student${count === 1 ? '' : 's'}.` });
  } catch (err) { next(err); }
};

// Admin: /api/marks/...
const getAdminCourseGrades = courseGrades(adminScope);
const setGradeOverride     = gradeOverride(adminScope);
const generateGrades       = generate(adminScope);
const getGradeReleases     = releases(adminScope);
const updateGradeRelease   = updateRelease(adminScope);
const deleteGradeRelease   = deleteRelease(adminScope);

// Teacher: /api/teachers/me/...
const getMyCourseGrades     = courseGrades(teacherScope);
const setMyGradeOverride    = gradeOverride(teacherScope);
const generateMyGrades      = generate(teacherScope);
const getMyGradeReleases    = releases(teacherScope);
const updateMyGradeRelease  = updateRelease(teacherScope);
const deleteMyGradeRelease  = deleteRelease(teacherScope);

module.exports = {
  CATEGORY_TYPES,
  getSectionMarks, getCourseGrading, saveGradingCriteria, createCategory, getCategory, deleteCategory,
  createAssessment, getAssessment, updateAssessment, deleteAssessment, saveMarks,
  getAdminSectionMarks, setPercentageOverride, getAdminCourseGrading, saveAdminGradingCriteria,
  getAdminCourseGrades, setGradeOverride, generateGrades, getGradeReleases, updateGradeRelease, deleteGradeRelease,
  getMyCourseGrades, setMyGradeOverride, generateMyGrades, getMyGradeReleases, updateMyGradeRelease, deleteMyGradeRelease,
};
