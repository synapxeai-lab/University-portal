const prisma = require('../db/prismaClient');
const { FEE_PER_CREDIT_HOUR, PAYMENT_ACCOUNT_NUMBER } = require('./fee');

// Recomputes a student's fee challan for one registration period from their
// currently-registered credit hours in that period. If the amount changed on
// a challan that was already paid/pending, the extra credits mean the old
// payment no longer covers it, so it's reset to UNPAID.
const syncChallan = async (studentId, registrationId) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, registrationId },
    include: { course: true },
  });
  if (enrollments.length === 0) return;

  const amount = enrollments.reduce((sum, e) => sum + e.course.creditHours, 0) * FEE_PER_CREDIT_HOUR;

  const existing = await prisma.challan.findUnique({
    where: { studentId_registrationId: { studentId, registrationId } },
  });

  if (existing) {
    if (existing.amount === amount) return;
    await prisma.challan.update({
      where: { id: existing.id },
      data: { amount, status: 'UNPAID' },
    });
  } else {
    await prisma.challan.create({
      data: { studentId, registrationId, amount, accountNumber: PAYMENT_ACCOUNT_NUMBER },
    });
  }
};

// Self-heal: make sure every registration period a student has any
// enrollment in has an up-to-date challan. The registerCourse hook covers
// the common case, but enrollments created any other way (data predating
// this feature, a direct DB fix, etc.) would otherwise never get one — so
// this re-derives challans from Enrollment on every read instead of trusting
// the hook alone, same as this codebase's other self-heal-on-load reads.
const syncChallansForStudent = async (studentId) => {
  const registrations = await prisma.enrollment.findMany({
    where: { studentId },
    select: { registrationId: true },
    distinct: ['registrationId'],
  });
  for (const { registrationId } of registrations) {
    await syncChallan(studentId, registrationId);
  }
};

// Same self-heal, but for every student with at least one enrollment —
// used by the admin challans list so it doesn't only catch up once each
// student happens to visit their own fee challan page.
const syncAllChallans = async () => {
  const pairs = await prisma.enrollment.findMany({
    select: { studentId: true, registrationId: true },
    distinct: ['studentId', 'registrationId'],
  });
  for (const { studentId, registrationId } of pairs) {
    await syncChallan(studentId, registrationId);
  }
};

module.exports = { syncChallan, syncChallansForStudent, syncAllChallans };
