const { z }  = require('zod');
const prisma = require('../db/prismaClient');
const { computeRegistrationYear } = require('../utils/registrationYear');
const { withRegistrationStatus } = require('../utils/registrationStatus');

const SEMESTERS = ['SPRING', 'SUMMER', 'FALL'];

/* ── Validation schema ───────────────────────────────────────────────────── */
const startRegistrationSchema = z.object({
  semester:  z.enum(SEMESTERS, { errorMap: () => ({ message: 'Semester must be Spring, Summer, or Fall' }) }),
  startDate: z.coerce.date({ errorMap: () => ({ message: 'A valid start date is required' }) }),
  endDate:   z.coerce.date({ errorMap: () => ({ message: 'A valid end date is required' }) }),
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after the start date',
  path: ['endDate'],
});

const label = (semester) => semester.charAt(0) + semester.slice(1).toLowerCase();

const include = { limits: { orderBy: { batch: 'asc' } } };

/* ── GET /api/registrations ──────────────────────────────────────────────── */
const getAllRegistrations = async (req, res, next) => {
  try {
    const registrations = await prisma.registration.findMany({
      include,
      orderBy: [{ year: 'desc' }, { startDate: 'desc' }],
    });
    return res.status(200).json({ success: true, registrations: registrations.map(withRegistrationStatus) });
  } catch (err) { next(err); }
};

/* ── POST /api/registrations ─────────────────────────────────────────────── */
const startRegistration = async (req, res, next) => {
  try {
    const parsed = startRegistrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { semester, startDate, endDate } = parsed.data;

    // Year isn't client input — it's derived from the semester's month window
    // vs. today, so admins can't request a mismatched or ambiguous year.
    const year = computeRegistrationYear(semester);

    const existing = await prisma.registration.findUnique({
      where: { semester_year: { semester, year } },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A registration for ${label(semester)} ${year} already exists.`,
      });
    }

    const registration = await prisma.registration.create({
      data: { semester, year, startDate, endDate },
      include,
    });

    return res.status(201).json({
      success: true,
      message: `Registration started for ${label(semester)} ${year}.`,
      registration: withRegistrationStatus(registration),
    });
  } catch (err) { next(err); }
};

/* ── Validation schema ───────────────────────────────────────────────────── */
const setBatchLimitSchema = z.object({
  batch:       z.string().min(1, 'Batch is required'),
  creditLimit: z.number().int().min(1, 'Credit limit must be at least 1').max(60, 'Credit limit is too high'),
});

/* ── PUT /api/registrations/:id/limits ───────────────────────────────────── */
const setBatchLimit = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid registration ID.' });

    const parsed = setBatchLimitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const { batch, creditLimit } = parsed.data;

    const registration = await prisma.registration.findUnique({ where: { id } });
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found.' });

    const limit = await prisma.registrationLimit.upsert({
      where:  { registrationId_batch: { registrationId: id, batch } },
      update: { creditLimit },
      create: { registrationId: id, batch, creditLimit },
    });

    return res.status(200).json({
      success: true,
      message: `Credit limit for batch ${batch} set to ${creditLimit}.`,
      limit,
    });
  } catch (err) { next(err); }
};

/* ── DELETE /api/registrations/:id/limits/:batch ─────────────────────────── */
const deleteBatchLimit = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid registration ID.' });

    const registration = await prisma.registration.findUnique({ where: { id } });
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found.' });

    const { batch } = req.params;
    await prisma.registrationLimit.deleteMany({ where: { registrationId: id, batch } });

    return res.status(200).json({ success: true, message: `Credit limit override for batch ${batch} removed.` });
  } catch (err) { next(err); }
};

module.exports = { getAllRegistrations, startRegistration, setBatchLimit, deleteBatchLimit };
