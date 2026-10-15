import { ordinal } from './ordinal.js';

export const SEMESTER_LABELS = { SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
export const SEMESTER_RANK = { SPRING: 0, SUMMER: 1, FALL: 2 };

export const STATUS_META = {
  UNPAID:           { label: 'Unpaid',            color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  PENDING_APPROVAL: { label: 'Awaiting Approval', color: '#a16207', bg: '#fefce8', border: '#fde68a' },
  PAID:             { label: 'Paid',              color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
};

export const formatPKR = (n) => `Rs. ${n.toLocaleString('en-PK')}`;

export const calendarLabel = (c) => `${SEMESTER_LABELS[c.registration.semester]} ${c.registration.year}`;

export const semesterLabel = (c) =>
  c.semester >= 1 && c.semester <= 8 ? `${ordinal(c.semester)} Semester — ${calendarLabel(c)}` : calendarLabel(c);
