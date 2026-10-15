const { z }  = require('zod');
const prisma = require('../db/prismaClient');
const { withCourseStatus } = require('../utils/courseStatus');

/* ── Validation schemas ─────────────────────────────────────────────────── */
// studentsCount isn't accepted from the client — it's derived from actual
// Student rows (see withComputedStatuses), never manually set.
const createDepartmentSchema = z.object({
  name:          z.string().min(2, 'Name must be at least 2 characters'),
  code:          z.string().min(1, 'Code is required'),
  color:         z.string().min(1, 'Color is required'),
  bg:            z.string().min(1, 'Background color is required'),
  description:   z.string().min(1, 'Description is required'),
  head:          z.string().min(1, 'Head of department is required'),
});

const updateDepartmentSchema = z.object({
  name:          z.string().min(2, 'Name must be at least 2 characters').optional(),
  code:          z.string().min(1, 'Code is required').optional(),
  color:         z.string().min(1, 'Color is required').optional(),
  bg:            z.string().min(1, 'Background color is required').optional(),
  description:   z.string().min(1, 'Description is required').optional(),
  head:          z.string().min(1, 'Head of department is required').optional(),
});

const include = {
  _count: { select: { students: true } },
  courses: { include: { _count: { select: { sectionLinks: true } } } },
  sections: {
    include: {
      courseLinks: {
        include: {
          course:  { include: { _count: { select: { sectionLinks: true } } } },
          teacher: true,
        },
      },
      _count: { select: { students: true } },
    },
    orderBy: { label: 'asc' },
  },
};

// Course objects are embedded in two places here (department.courses, and
// department.sections[].courseLinks[].course) — both need computed status.
// studentsCount is likewise derived here from the real Student count rather
// than trusted as a stored value, so it can never drift from reality.
function withComputedStatuses(department) {
  const { _count, ...rest } = department;
  return {
    ...rest,
    studentsCount: _count?.students ?? department.studentsCount ?? 0,
    courses: (department.courses || []).map(withCourseStatus),
    sections: (department.sections || []).map(section => ({
      ...section,
      courseLinks: (section.courseLinks || []).map(link => ({ ...link, course: withCourseStatus(link.course) })),
    })),
  };
}

/* ── GET /api/departments ───────────────────────────────────────────────── */
const getAllDepartments = async (req, res, next) => {
  try {
    const { search = '' } = req.query;

    const departments = await prisma.department.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      } : {},
      include,
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ success: true, departments: departments.map(withComputedStatuses) });
  } catch (err) { next(err); }
};

/* ── GET /api/departments/:id ───────────────────────────────────────────── */
const getDepartment = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid department ID.' });

    const department = await prisma.department.findUnique({ where: { id }, include });
    if (!department) return res.status(404).json({ success: false, message: 'Department not found.' });

    return res.status(200).json({ success: true, department: withComputedStatuses(department) });
  } catch (err) { next(err); }
};

/* ── POST /api/departments ──────────────────────────────────────────────── */
const createDepartment = async (req, res, next) => {
  try {
    const parsed = createDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { name, code, ...rest } = parsed.data;

    const existing = await prisma.department.findFirst({ where: { OR: [{ name }, { code }] } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A department with this name or code already exists.' });
    }

    const department = await prisma.department.create({
      data:    { name, code, ...rest },
      include,
    });

    return res.status(201).json({ success: true, message: 'Department created successfully.', department: withComputedStatuses(department) });
  } catch (err) { next(err); }
};

/* ── PUT /api/departments/:id ───────────────────────────────────────────── */
const updateDepartment = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid department ID.' });

    const parsed = updateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const target = await prisma.department.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ success: false, message: 'Department not found.' });

    const { name, code } = parsed.data;
    if ((name && name !== target.name) || (code && code !== target.code)) {
      const clash = await prisma.department.findFirst({
        where: {
          id: { not: id },
          OR: [...(name ? [{ name }] : []), ...(code ? [{ code }] : [])],
        },
      });
      if (clash) return res.status(409).json({ success: false, message: 'A department with this name or code already exists.' });
    }

    const department = await prisma.department.update({
      where:  { id },
      data:   parsed.data,
      include,
    });

    return res.status(200).json({ success: true, message: 'Department updated successfully.', department: withComputedStatuses(department) });
  } catch (err) { next(err); }
};

/* ── DELETE /api/departments/:id ────────────────────────────────────────── */
const deleteDepartment = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid department ID.' });

    const target = await prisma.department.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ success: false, message: 'Department not found.' });

    await prisma.department.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Department deleted successfully.' });
  } catch (err) { next(err); }
};

module.exports = { getAllDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment };
