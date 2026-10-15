import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LuArrowLeft, LuClock, LuLoaderCircle, LuClipboardList, LuUsers } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { api } from '../../services/api.js';
import { MARK_TYPE_LABELS, MARK_TYPE_ORDER, semesterLabel, percentStyle, fmtMark, summaryText } from '../../utils/marks.js';

const NOT_GRADED_STYLE = { color: '#64748B', background: '#f1f5f9', borderColor: '#E2E8F0' };

export default function StudentCourseMarksPage() {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get(`/students/me/marks/${enrollmentId}`)
      .then(res => { if (!cancelled) setCourse(res.course); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load marks.'); });
    return () => { cancelled = true; };
  }, [enrollmentId]);

  const backTo = course ? `/student/marks?semester=${course.semester}-${course.year}` : '/student/marks';
  const backLink = (
    <button className="back-link" onClick={() => navigate(backTo)}>
      <LuArrowLeft size={15} /> Back to Marks
    </button>
  );

  if (!course && !error) {
    return (
      <DashboardLayout pageTitle="Marks">
        {backLink}
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading marks…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout pageTitle="Marks">
        {backLink}
        <div className="alert alert-error">{error}</div>
      </DashboardLayout>
    );
  }

  const { department, summary } = course;
  const byType = MARK_TYPE_ORDER
    .map(type => ({ type, items: course.marks.filter(m => m.type === type) }))
    .filter(t => t.items.length > 0);

  return (
    <DashboardLayout pageTitle={course.name}>
      {backLink}

      <div className="dept-detail-header" style={{ borderColor: department.bg }}>
        <div className="dept-detail-icon" style={{ background: department.bg, color: department.color }}>
          {course.code}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>{course.name}</h1>
          <p className="page-subtitle" style={{ marginBottom: '0.6rem' }}>
            {department.name} ({department.code})
          </p>
          <div className="dept-detail-meta">
            <span>{semesterLabel(course)}</span>
            <span><LuUsers size={13} /> Section {course.section.label}</span>
            <span><LuClock size={13} /> {course.creditHours} Credit Hours</span>
          </div>
        </div>
        {summaryText(summary) && (
          <span className="status-pill" style={{ ...percentStyle(summary.percentage), fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}>
            {summaryText(summary)}
          </span>
        )}
      </div>

      {summary.adjusted && (
        <div className="alert" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: 'var(--text-mid)' }}>
          Your course percentage was set to {fmtMark(summary.percentage)}% by the administration
          {summary.computedPercentage !== null ? ` (calculated from marks: ${summary.computedPercentage}%).` : '.'}
        </div>
      )}

      {byType.length === 0 ? (
        <div className="table-empty">
          <LuClipboardList size={32} color="#cbd5e1" />
          <p>Your teacher hasn't added any marks for this course yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {byType.map(({ type, items }) => {
            const graded   = items.filter(m => m.obtained !== null);
            const obtained = graded.reduce((s, m) => s + m.obtained, 0);
            const total    = graded.reduce((s, m) => s + m.total, 0);
            return (
              <div key={type} className="table-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 className="semester-heading" style={{ margin: 0 }}>{MARK_TYPE_LABELS[type] || type}</h3>
                  {graded.length > 0 ? (
                    <span className="status-pill" style={percentStyle(Math.round((obtained / total) * 100))}>
                      {fmtMark(obtained)} / {fmtMark(total)}
                    </span>
                  ) : (
                    <span className="status-pill" style={NOT_GRADED_STYLE}>Not graded yet</span>
                  )}
                </div>
                <div className="table-scroll">
                  <table className="users-table marks-table">
                    <thead>
                      <tr>
                        <th>Assessment</th>
                        <th>Obtained</th>
                        <th>Total</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(m => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 600 }}>{m.title}</td>
                          <td>{m.obtained === null ? <span className="status-pill" style={NOT_GRADED_STYLE}>Not graded</span> : fmtMark(m.obtained)}</td>
                          <td>{fmtMark(m.total)}</td>
                          <td>{m.obtained === null ? '—' : `${Math.round((m.obtained / m.total) * 100)}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
