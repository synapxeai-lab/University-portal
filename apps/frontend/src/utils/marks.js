import { ordinal } from './ordinal.js';

const SEMESTER_LABELS = { SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };

export const MARK_TYPE_LABELS = {
  QUIZ: 'Quizzes', ASSIGNMENT: 'Assignments', MID: 'Mid Term',
  PROJECT: 'Projects', FINAL: 'Final Term',
};
// Singular, for "Add Quiz" style buttons.
export const MARK_TYPE_ITEM = {
  QUIZ: 'Quiz', ASSIGNMENT: 'Assignment', MID: 'Mid Term',
  PROJECT: 'Project', FINAL: 'Final Term',
};
export const MARK_TYPE_ORDER = ['QUIZ', 'ASSIGNMENT', 'MID', 'PROJECT', 'FINAL'];

// "1st Semester — Fall 2026", falling back to just the calendar term.
export function semesterLabel({ semester, year, semesterNumber }) {
  const calendar = `${SEMESTER_LABELS[semester]} ${year}`;
  return semesterNumber >= 1 && semesterNumber <= 8 ? `${ordinal(semesterNumber)} Semester — ${calendar}` : calendar;
}

export function percentStyle(pct) {
  if (pct >= 70) return { color: '#166534', background: '#dcfce7', borderColor: '#bbf7d0' };
  if (pct >= 50) return { color: '#92400e', background: '#fef3c7', borderColor: '#fde68a' };
  return { color: '#b91c1c', background: '#fef2f2', borderColor: '#fecaca' };
}

export const fmtMark = (n) => (Number.isInteger(n) ? n : n.toFixed(1));

// Pill text for a course summary; null when there's nothing to show yet.
// An admin-adjusted percentage replaces the calculated one.
// Students only receive a grade once an admin has generated it and it's visible.
export function summaryText(summary) {
  const grade = summary.grade ? ` · Grade ${summary.grade}` : '';
  if (summary.adjusted) return `${fmtMark(summary.percentage)}%${grade} · Adjusted`;
  if (summary.total > 0) return `${fmtMark(summary.obtained)} / ${fmtMark(summary.total)} · ${summary.percentage}%${grade}`;
  return null;
}
