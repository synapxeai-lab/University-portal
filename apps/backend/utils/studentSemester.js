// New intakes always begin in Fall: Fall of the batch year is semester 1, and
// each subsequent Fall/Spring advances it by one. Summer doesn't advance
// progression — it reflects the semester the batch just completed (same as
// that year's Spring).
function computeStudentSemester(batch, registrationSemester, registrationYear) {
  const batchYear = parseInt(batch, 10);
  if (isNaN(batchYear)) return null;
  const diff = registrationYear - batchYear;
  return registrationSemester === 'FALL' ? 2 * diff + 1 : 2 * diff;
}

module.exports = { computeStudentSemester };
