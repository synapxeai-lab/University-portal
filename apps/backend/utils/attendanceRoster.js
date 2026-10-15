const prisma = require('../db/prismaClient');

const ATTENDANCE_STATUSES = ['PRESENT', 'LATE', 'ABSENT'];

// Roster is derived from Enrollment, not Section membership — a student only
// ever appears here once they've registered for this specific course+section.
async function getRosterForDate(courseId, sectionId, date) {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, sectionId },
    include: { student: true },
    orderBy: { student: { name: 'asc' } },
  });

  const existing = await prisma.attendance.findMany({
    where: { enrollmentId: { in: enrollments.map(e => e.id) }, date },
  });
  const statusByEnrollment = new Map(existing.map(a => [a.enrollmentId, a.status]));

  return enrollments.map(e => ({
    enrollmentId: e.id,
    student: { id: e.student.id, name: e.student.name, rollNo: e.student.rollNo },
    status: statusByEnrollment.get(e.id) ?? null,
  }));
}

// Silently ignores any record whose enrollmentId doesn't actually belong to
// this course+section, instead of trusting the caller's payload outright.
async function saveAttendance(courseId, sectionId, date, records) {
  const enrollments = await prisma.enrollment.findMany({ where: { courseId, sectionId }, select: { id: true } });
  const validIds = new Set(enrollments.map(e => e.id));
  const toSave = records.filter(r => validIds.has(r.enrollmentId) && ATTENDANCE_STATUSES.includes(r.status));

  await Promise.all(toSave.map(r => prisma.attendance.upsert({
    where: { enrollmentId_date: { enrollmentId: r.enrollmentId, date } },
    update: { status: r.status },
    create: { enrollmentId: r.enrollmentId, date, status: r.status },
  })));

  return getRosterForDate(courseId, sectionId, date);
}

// Every date attendance was taken for this course+section, newest first, with
// a per-status count for each date.
async function getAttendanceDates(courseId, sectionId) {
  const enrollments = await prisma.enrollment.findMany({ where: { courseId, sectionId }, select: { id: true } });
  const counts = await prisma.attendance.groupBy({
    by: ['date', 'status'],
    where: { enrollmentId: { in: enrollments.map(e => e.id) } },
    _count: { _all: true },
  });

  const byDate = new Map();
  for (const c of counts) {
    const key = c.date.toISOString();
    if (!byDate.has(key)) byDate.set(key, { date: c.date, PRESENT: 0, LATE: 0, ABSENT: 0, total: 0 });
    const entry = byDate.get(key);
    entry[c.status] = c._count._all;
    entry.total += c._count._all;
  }
  return [...byDate.values()].sort((a, b) => b.date - a.date);
}

module.exports = { ATTENDANCE_STATUSES, getRosterForDate, saveAttendance, getAttendanceDates };
