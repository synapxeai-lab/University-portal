export const ATTENDANCE_STATUSES = ['PRESENT', 'LATE', 'ABSENT'];

export const ATTENDANCE_META = {
  PRESENT: { label: 'Present', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
  LATE:    { label: 'Late',    color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  ABSENT:  { label: 'Absent',  color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
};

export const todayStr = () => new Date().toISOString().slice(0, 10);

// Attendance dates are stored as UTC midnight, so format in UTC to avoid
// showing the previous day in timezones behind UTC.
export const formatAttendanceDate = (iso) => new Date(iso).toLocaleDateString('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});
