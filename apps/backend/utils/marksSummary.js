const { gradeFor, loadGradesByKey } = require('./grading');

// Course total for one student. Only graded assessments count toward the total,
// so an ungraded quiz doesn't drag the percentage down. An admin override, when
// set, replaces the computed percentage but the computed one is still reported.
// The letter grade follows the final percentage using the given grading ranges,
// unless an admin has set the grade directly.
function summarizeMarks(items, percentageOverride = null, grades, gradeOverride = null) {
  const graded   = items.filter(m => m.obtained !== null);
  const obtained = graded.reduce((sum, m) => sum + m.obtained, 0);
  const total    = graded.reduce((sum, m) => sum + m.total, 0);
  const computedPercentage = total ? Math.round((obtained / total) * 100) : null;
  const adjusted = percentageOverride !== null && percentageOverride !== undefined;
  const percentage = adjusted ? percentageOverride : computedPercentage;
  const computedGrade = gradeFor(percentage, grades);
  const gradeAdjusted = !!gradeOverride;

  return {
    obtained, total, computedPercentage, adjusted, percentage,
    computedGrade, gradeAdjusted,
    grade: gradeAdjusted ? gradeOverride : computedGrade,
  };
}

// Summaries for many enrollments at once (each must include `marks`), keyed by
// enrollment id. Loads the assessments and grading ranges for every
// course+section involved in two queries rather than per enrollment.
async function summarizeEnrollments(prisma, enrollments) {
  if (enrollments.length === 0) return new Map();
  const pairs = enrollments.map(e => ({ courseId: e.courseId, sectionId: e.sectionId }));

  const [categories, gradesFor] = await Promise.all([
    prisma.assessmentCategory.findMany({ where: { OR: pairs }, include: { assessments: true } }),
    loadGradesByKey(prisma, pairs),
  ]);

  return new Map(enrollments.map(e => {
    const obtainedByAssessment = new Map(e.marks.map(m => [m.assessmentId, m.obtained]));
    const items = categories
      .filter(c => c.courseId === e.courseId && c.sectionId === e.sectionId)
      .flatMap(c => c.assessments.map(a => ({ obtained: obtainedByAssessment.get(a.id) ?? null, total: a.totalMarks })));
    return [e.id, summarizeMarks(items, e.percentageOverride, gradesFor(e.courseId, e.sectionId), e.gradeOverride)];
  }));
}

module.exports = { summarizeMarks, summarizeEnrollments };
