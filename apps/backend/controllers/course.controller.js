const { z }  = require('zod');
const prisma = require('../db/prismaClient');
const { withCourseStatus } = require('../utils/courseStatus');

/* ── Validation schemas ─────────────────────────────────────────────────── */
const createCourseSchema = z.object({
  departmentId: z.number().int('Department is required'),
  name:         z.string().min(2, 'Course name must be at least 2 characters'),
  code:         z.string().min(1, 'Course code is required'),
  semester:     z.number().int().min(1, 'Semester must be between 1 and 8').max(8, 'Semester must be between 1 and 8'),
  creditHours:  z.number().int().min(1, 'Credit hours must be at least 1').max(6, 'Credit hours must be at most 6'),
});

const updateCourseSchema = z.object({
  departmentId: z.number().int().optional(),
  name:         z.string().min(2, 'Course name must be at least 2 characters').optional(),
  code:         z.string().min(1, 'Course code is required').optional(),
  semester:     z.number().int().min(1, 'Semester must be between 1 and 8').max(8, 'Semester must be between 1 and 8').optional(),
  creditHours:  z.number().int().min(1, 'Credit hours must be at least 1').max(6, 'Credit hours must be at most 6').optional(),
});

const include = {
  department: true,
  _count:     { select: { sectionLinks: true } },
};

const detailInclude = {
  department: true,
  sectionLinks: {
    include: { section: true, teacher: true },
    orderBy: [{ section: { batch: 'asc' } }, { section: { label: 'asc' } }],
  },
};

/* ── GET /api/courses ────────────────────────────────────────────────────── */
const getAllCourses = async (req, res, next) => {
  try {
    const { search = '', departmentId = '', semester = '', status = '' } = req.query;

    const courses = await prisma.course.findMany({
      where: {
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
        ...(departmentId ? { departmentId: parseInt(departmentId, 10) } : {}),
        ...(semester ? { semester: parseInt(semester, 10) } : {}),
        ...(status === 'ACTIVE'   ? { sectionLinks: { some: {} } } : {}),
        ...(status === 'INACTIVE' ? { sectionLinks: { none: {} } } : {}),
      },
      include,
      orderBy: [{ departmentId: 'asc' }, { semester: 'asc' }, { code: 'asc' }],
    });

    return res.status(200).json({ success: true, courses: courses.map(withCourseStatus) });
  } catch (err) { next(err); }
};

/* ── GET /api/courses/:id ────────────────────────────────────────────────── */
const getCourse = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid course ID.' });

    const course = await prisma.course.findUnique({ where: { id }, include: detailInclude });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    return res.status(200).json({ success: true, course: withCourseStatus(course) });
  } catch (err) { next(err); }
};

/* ── POST /api/courses ───────────────────────────────────────────────────── */
const createCourse = async (req, res, next) => {
  try {
    const parsed = createCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { departmentId, name, code, semester, creditHours } = parsed.data;

    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });

    const existing = await prisma.course.findUnique({ where: { code } });
    if (existing) return res.status(409).json({ success: false, message: 'A course with this code already exists.' });

    // Sections are only linked to this course via the Offer Courses page.
    const course = await prisma.course.create({
      data: { name, code, semester, creditHours, departmentId },
      include,
    });

    return res.status(201).json({ success: true, message: 'Course created successfully.', course: withCourseStatus(course) });
  } catch (err) { next(err); }
};

/* ── PUT /api/courses/:id ────────────────────────────────────────────────── */
const updateCourse = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid course ID.' });

    const parsed = updateCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const target = await prisma.course.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ success: false, message: 'Course not found.' });

    const { departmentId, code } = parsed.data;

    if (departmentId) {
      const department = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    if (code && code !== target.code) {
      const clash = await prisma.course.findUnique({ where: { code } });
      if (clash) return res.status(409).json({ success: false, message: 'A course with this code already exists.' });
    }

    // Moving a course to a different department drops its old section links;
    // it must be re-offered to the new department's batches from the Offer Courses page.
    if (departmentId && departmentId !== target.departmentId) {
      await prisma.sectionCourse.deleteMany({ where: { courseId: id } });
    }

    const course = await prisma.course.update({
      where:  { id },
      data:   parsed.data,
      include,
    });

    return res.status(200).json({ success: true, message: 'Course updated successfully.', course: withCourseStatus(course) });
  } catch (err) { next(err); }
};

/* ── DELETE /api/courses/:id ─────────────────────────────────────────────── */
const deleteCourse = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid course ID.' });

    const target = await prisma.course.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ success: false, message: 'Course not found.' });

    await prisma.course.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Course deleted successfully.' });
  } catch (err) { next(err); }
};

module.exports = { getAllCourses, getCourse, createCourse, updateCourse, deleteCourse };
