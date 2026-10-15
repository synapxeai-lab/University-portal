// A course is ACTIVE only while it's offered to at least one section; otherwise INACTIVE.
// Callers must include either `_count: { select: { sectionLinks: true } }` or the full
// `sectionLinks` relation on the course for this to compute correctly.
function withCourseStatus(course) {
  if (!course) return course;
  const { _count, ...rest } = course;
  const offeredCount = course.sectionLinks?.length ?? _count?.sectionLinks ?? 0;
  return { ...rest, status: offeredCount > 0 ? 'ACTIVE' : 'INACTIVE' };
}

module.exports = { withCourseStatus };
