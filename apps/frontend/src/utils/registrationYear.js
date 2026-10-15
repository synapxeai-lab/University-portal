// Semester month windows: Spring = Jan–May, Summer = Jun–Aug, Fall = Sep–Dec.
// Mirrors apps/backend/utils/registrationYear.js — used only to preview the
// year the backend will compute; the backend remains the source of truth.
const SEMESTER_END_MONTH = { SPRING: 4, SUMMER: 7, FALL: 11 }; // 0-indexed

export function computeRegistrationYear(semester, now = new Date()) {
  const endMonth = SEMESTER_END_MONTH[semester];
  const year = now.getFullYear();
  const windowEnd = new Date(year, endMonth + 1, 0, 23, 59, 59, 999);
  return now > windowEnd ? year + 1 : year;
}
