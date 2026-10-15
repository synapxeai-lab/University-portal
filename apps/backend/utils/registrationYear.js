// Semester month windows: Spring = Jan–May, Summer = Jun–Aug, Fall = Sep–Dec.
const SEMESTER_END_MONTH = { SPRING: 4, SUMMER: 7, FALL: 11 }; // 0-indexed

// A semester's window is assumed to fall in the current year unless that
// window has already fully passed, in which case it rolls to next year.
function computeRegistrationYear(semester, now = new Date()) {
  const endMonth = SEMESTER_END_MONTH[semester];
  const year = now.getFullYear();
  const windowEnd = new Date(year, endMonth + 1, 0, 23, 59, 59, 999);
  return now > windowEnd ? year + 1 : year;
}

module.exports = { SEMESTER_END_MONTH, computeRegistrationYear };
