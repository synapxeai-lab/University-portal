import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuArrowLeft, LuCalendarDays, LuChevronRight, LuLoaderCircle, LuPlus } from 'react-icons/lu';
import AttendanceRoster from './AttendanceRoster.jsx';
import { ATTENDANCE_STATUSES, ATTENDANCE_META, formatAttendanceDate } from '../utils/attendance.js';

// Attendance for one course+section, shared by the teacher and admin pages.
// Three views, kept in the URL so the browser back button works:
//   (none)            → list of dates attendance was saved for
//   ?date=YYYY-MM-DD  → roster for that date, editable
//   ?add=1            → roster with a date picker to take new attendance
export default function AttendanceSessions({ fetchDates, fetchRoster, saveRoster }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get('date');
  const adding = searchParams.get('add') === '1';

  const [dates, setDates] = useState(null);
  const [error, setError] = useState('');

  const loadDates = useCallback(() => (
    fetchDates()
      .then(res => { setDates(res.dates); setError(''); })
      .catch(err => setError(err.message || 'Failed to load attendance dates.'))
  ), []);

  useEffect(() => { loadDates(); }, [loadDates]);

  const backToList = () => setSearchParams({});

  if (date || adding) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button className="back-link" style={{ marginBottom: 0 }} onClick={backToList}>
            <LuArrowLeft size={15} /> All attendance dates
          </button>
          <h3 className="semester-heading" style={{ margin: 0 }}>
            {adding ? 'Add Attendance' : formatAttendanceDate(`${date}T00:00:00Z`)}
          </h3>
        </div>
        <AttendanceRoster
          key={date || 'new'}
          fetchRoster={fetchRoster}
          saveRoster={saveRoster}
          initialDate={date || undefined}
          lockDate={!!date}
          // After adding, switch to that date's view so the list and URL stay in sync.
          onSaved={(saved) => { loadDates(); if (adding) setSearchParams({ date: saved }, { replace: true }); }}
        />
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <h3 className="semester-heading" style={{ margin: 0 }}>
          Attendance Records{dates ? ` (${dates.length})` : ''}
        </h3>
        <button className="btn-primary btn-with-icon" onClick={() => setSearchParams({ add: '1' })}>
          <LuPlus size={16} /> Add Attendance
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        {!dates && !error ? (
          <div className="table-empty">
            <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
            <p>Loading attendance…</p>
          </div>
        ) : dates?.length === 0 ? (
          <div className="table-empty">
            <LuCalendarDays size={28} color="#cbd5e1" />
            <p>No attendance saved yet. Use <strong>Add Attendance</strong> to take today's attendance.</p>
          </div>
        ) : dates && (
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  {ATTENDANCE_STATUSES.map(s => <th key={s} style={{ textAlign: 'center' }}>{ATTENDANCE_META[s].label}</th>)}
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dates.map((d, i) => (
                  <tr
                    key={d.date} className="row-clickable" title="View attendance"
                    onClick={() => setSearchParams({ date: d.date.slice(0, 10) })}
                  >
                    <td className="td-idx">{i + 1}</td>
                    <td className="td-name" style={{ whiteSpace: 'nowrap' }}>{formatAttendanceDate(d.date)}</td>
                    {ATTENDANCE_STATUSES.map(s => {
                      const m = ATTENDANCE_META[s];
                      return (
                        <td key={s} style={{ textAlign: 'center' }}>
                          <span className="status-pill" style={{ color: m.color, background: m.bg, borderColor: m.border }}>{d[s]}</span>
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{d.total}</td>
                    <td style={{ textAlign: 'right' }}><LuChevronRight size={16} color="#94a3b8" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
