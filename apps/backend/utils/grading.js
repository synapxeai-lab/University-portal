// Letter grades and their default percentage ranges, highest first. Teachers
// can move the boundaries per course+section, but the set of grades is fixed.
const DEFAULT_GRADES = [
  { grade: 'A',  min: 85, max: 100 },
  { grade: 'A-', min: 80, max: 84 },
  { grade: 'B+', min: 75, max: 79 },
  { grade: 'B',  min: 71, max: 74 },
  { grade: 'B-', min: 68, max: 70 },
  { grade: 'C+', min: 64, max: 67 },
  { grade: 'C',  min: 61, max: 63 },
  { grade: 'C-', min: 58, max: 60 },
  { grade: 'D+', min: 54, max: 57 },
  { grade: 'D',  min: 50, max: 53 },
  { grade: 'F',  min: 0,  max: 49 },
];

const GRADE_LETTERS = DEFAULT_GRADES.map(g => g.grade);

// HEC 4.0 scale.
const GRADE_POINTS = {
  'A': 4.0, 'A-': 3.67, 'B+': 3.33, 'B': 3.0, 'B-': 2.67,
  'C+': 2.33, 'C': 2.0, 'C-': 1.67, 'D+': 1.33, 'D': 1.0, 'F': 0.0,
};

// Credit-hour weighted GPA over courses that have a grade; null when none do.
function computeGpa(courses) {
  const graded = courses.filter(c => c.gradePoints !== null);
  const credits = graded.reduce((sum, c) => sum + c.creditHours, 0);
  if (!credits) return null;
  const points = graded.reduce((sum, c) => sum + c.gradePoints * c.creditHours, 0);
  return Math.round((points / credits) * 100) / 100;
}

// Returns an error message, or null when the ranges are valid: every grade
// present in order, whole numbers, covering 0–100 with no gaps or overlaps.
function validateGrades(grades) {
  if (grades.length !== GRADE_LETTERS.length || grades.some((g, i) => g.grade !== GRADE_LETTERS[i])) {
    return 'Grades must list every grade from A to F in order.';
  }
  for (const g of grades) {
    if (!Number.isInteger(g.min) || !Number.isInteger(g.max)) return `${g.grade}: percentages must be whole numbers.`;
    if (g.min < 0 || g.max > 100) return `${g.grade}: percentages must be between 0 and 100.`;
    if (g.min > g.max) return `${g.grade}: minimum can't be greater than maximum.`;
  }
  if (grades[0].max !== 100) return `${grades[0].grade} must go up to 100%.`;
  if (grades[grades.length - 1].min !== 0) return `${grades[grades.length - 1].grade} must start at 0%.`;
  for (let i = 1; i < grades.length; i++) {
    if (grades[i].max !== grades[i - 1].min - 1) {
      return `${grades[i].grade} must end right below where ${grades[i - 1].grade} starts (${grades[i - 1].min - 1}%).`;
    }
  }
  return null;
}

// Highest grade whose minimum the percentage reaches; works for fractional
// percentages (e.g. an admin override of 84.5) since only minimums are compared.
function gradeFor(percentage, grades = DEFAULT_GRADES) {
  if (percentage === null || percentage === undefined) return null;
  return (grades.find(g => percentage >= g.min) || grades[grades.length - 1]).grade;
}

// Grades for each course+section key ("courseId-sectionId"), defaulting when unset.
async function loadGradesByKey(prisma, pairs) {
  const rows = pairs.length === 0 ? [] : await prisma.gradingCriteria.findMany({
    where: { OR: pairs.map(({ courseId, sectionId }) => ({ courseId, sectionId })) },
  });
  const byKey = new Map(rows.map(r => [`${r.courseId}-${r.sectionId}`, r.grades]));
  return (courseId, sectionId) => byKey.get(`${courseId}-${sectionId}`) || DEFAULT_GRADES;
}

// The generated grade a student may see for an enrollment: null until an admin
// has generated grades and the visible-from date has arrived.
function visibleGrade(enrollment, now = new Date()) {
  if (!enrollment.publishedGrade || !enrollment.gradeVisibleFrom) return null;
  return enrollment.gradeVisibleFrom <= now ? enrollment.publishedGrade : null;
}

module.exports = {
  DEFAULT_GRADES, GRADE_LETTERS, GRADE_POINTS,
  validateGrades, gradeFor, loadGradesByKey, computeGpa, visibleGrade,
};
