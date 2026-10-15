const prisma = require('../db/prismaClient');

// `Student.section` is a free-text label collected on the Add/Edit Student
// form; it doesn't by itself enrol the student in a real `Section` (that's
// what course offerings and registration are actually keyed on). This keeps
// the real link in sync whenever a matching Section already exists —
// dropping any link that's for the wrong department/batch (definitely
// stale), and connecting to the one matching department+batch+label if the
// student doesn't already have a correctly-scoped section.
async function syncEnrolledSection(studentId) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { enrolledSections: true } });

  const stale = student.enrolledSections.filter(s => s.departmentId !== student.departmentId || s.batch !== student.batch);
  const hasCurrentSection = student.enrolledSections.some(s => s.departmentId === student.departmentId && s.batch === student.batch);

  const data = {};
  if (stale.length) data.disconnect = stale.map(s => ({ id: s.id }));
  if (!hasCurrentSection) {
    const match = await prisma.section.findFirst({
      where: { departmentId: student.departmentId, batch: student.batch, label: { equals: student.section, mode: 'insensitive' } },
    });
    if (match) data.connect = { id: match.id };
  }

  if (Object.keys(data).length) {
    await prisma.student.update({ where: { id: studentId }, data: { enrolledSections: data } });
  }
}

// The reverse direction: when a Section is created, any existing students
// whose department+batch+free-text-section already match it should be
// linked immediately, instead of waiting for their own record to be saved.
async function syncStudentsForNewSection(section) {
  const candidates = await prisma.student.findMany({
    where: { departmentId: section.departmentId, batch: section.batch, section: { equals: section.label, mode: 'insensitive' } },
    select: { id: true },
  });
  for (const { id } of candidates) {
    await syncEnrolledSection(id);
  }
}

module.exports = { syncEnrolledSection, syncStudentsForNewSection };
