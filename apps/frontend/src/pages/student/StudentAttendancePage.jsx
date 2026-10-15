import { useEffect, useState } from 'react';
import { LuClock, LuLoaderCircle, LuClipboardList, LuChevronDown, LuChevronRight } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { api } from '../../services/api.js';

const SEMESTER_LABELS = { SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
const STATUS_META = {
  PRESENT: { label: 'Present', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
  LATE:    { label: 'Late',    color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  ABSENT:  { label: 'Absent',  color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function CourseAttendance({ course }) {
  const [open, setOpen] = useState(false);
  const { summary } = course;

  return (
    <div className="course-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <button className="course-row-main" onClick={() => setOpen(p => !p)}>
        <div className="course-code-badge" style={{ color: course.department.color, background: course.department.bg }}>
          {course.code}
        </div>
        <div className="course-info">
          <p className="course-name">{course.name}</p>
          <div className="course-row-meta">
            <span className="dept-badge-pill" style={{ color: course.department.color, background: course.department.bg }}>
              {course.department.name}
            </span>
            <span className="course-row-semester">Section {course.section.label}</span>
          </div>
        </div>
        {summary.total > 0 ? (
          <span className="status-pill" style={{
            color: summary.percentage >= 75 ? '#166534' : '#b91c1c',
            background: summary.percentage >= 75 ? '#dcfce7' : '#fef2f2',
            borderColor: summary.percentage >= 75 ? '#bbf7d0' : '#fecaca',
          }}>
            {summary.percentage}% · {summary.total} class{summary.total === 1 ? '' : 'es'}
          </span>
        ) : (
          <span className="status-pill" style={{ color: '#64748B', background: '#f1f5f9', borderColor: '#E2E8F0' }}>
            No records yet
          </span>
        )}
        {open ? <LuChevronDown size={16} className="course-card-chevron" /> : <LuChevronRight size={16} className="course-card-chevron" />}
      </button>

      {open && (
        <div style={{ padding: '0 1.1rem 1.1rem 1.1rem' }}>
          {summary.total === 0 ? (
            <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>No attendance has been marked for this course yet.</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                <span className="status-pill" style={{ color: STATUS_META.PRESENT.color, background: STATUS_META.PRESENT.bg, borderColor: STATUS_META.PRESENT.border }}>
                  {summary.present} Present
                </span>
                <span className="status-pill" style={{ color: STATUS_META.LATE.color, background: STATUS_META.LATE.bg, borderColor: STATUS_META.LATE.border }}>
                  {summary.late} Late
                </span>
                <span className="status-pill" style={{ color: STATUS_META.ABSENT.color, background: STATUS_META.ABSENT.bg, borderColor: STATUS_META.ABSENT.border }}>
                  {summary.absent} Absent
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {course.records.map(r => {
                  const meta = STATUS_META[r.status];
                  return (
                    <div key={r.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.7rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-mid)' }}>{formatDate(r.date)}</span>
                      <span className="status-pill" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>{meta.label}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentAttendancePage() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/students/me/attendance')
      .then(res => { if (!cancelled) setGroups(res.groups); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load attendance.'); });
    return () => { cancelled = true; };
  }, []);

  const totalCourses = groups?.reduce((sum, g) => sum + g.courses.length, 0) ?? 0;

  return (
    <DashboardLayout pageTitle="Attendance">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Your attendance across every course you've registered in, grouped by semester.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!groups && !error ? (
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading attendance…</p>
        </div>
      ) : error ? null : totalCourses === 0 ? (
        <div className="table-empty">
          <LuClipboardList size={32} color="#cbd5e1" />
          <p>You aren't registered for any courses yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {groups.map((g, idx) => (
            <div key={`${g.semester}-${g.year}`}>
              {idx > 0 && <hr className="sidebar-divider" style={{ margin: '0 0 1.75rem' }} />}
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.75rem' }}>
                {SEMESTER_LABELS[g.semester]} {g.year}
              </h3>
              <div className="course-list">
                {g.courses.map(c => <CourseAttendance key={c.id} course={c} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
