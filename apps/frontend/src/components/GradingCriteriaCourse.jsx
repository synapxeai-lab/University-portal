import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuClock, LuLoaderCircle, LuPencil } from 'react-icons/lu';
import DashboardLayout from './DashboardLayout.jsx';
import GradingCriteriaModal from './GradingCriteriaModal.jsx';
import Toast from './Toast.jsx';
import { api } from '../services/api.js';
import { ordinal } from '../utils/ordinal.js';

const BADGE_CUSTOM  = { color: '#0F766E', background: '#F0FDFA', borderColor: '#99F6E4' };
const BADGE_DEFAULT = { color: '#64748B', background: '#f1f5f9', borderColor: '#E2E8F0' };

// Grading criteria for every section of one course, shared by teacher and admin.
// Criteria are stored per course+section, so each section has its own card.
//   apiBase:     '/teachers/me' or '/marks' — GET {apiBase}/courses/:id/grading,
//                PUT {apiBase}/courses/:id/sections/:sectionId/grading
//   backPath:    the course list to return to
//   showTeacher: show who teaches each section (admin view)
export default function GradingCriteriaCourse({ apiBase, backPath, showTeacher = false }) {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  useEffect(() => {
    let cancelled = false;
    api.get(`${apiBase}/courses/${courseId}/grading`)
      .then(res => { if (!cancelled) { setData(res); setError(''); } })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load grading criteria.'); });
    return () => { cancelled = true; };
  }, [apiBase, courseId]);

  const handleSave = async (grades) => {
    const section = editing;
    const res = await api.put(`${apiBase}/courses/${courseId}/sections/${section.id}/grading`, { grades });
    setData(prev => ({
      ...prev,
      sections: prev.sections.map(s => (s.id === section.id ? { ...s, grading: res.grading } : s)),
    }));
    setToast({ msg: res.message || 'Grading criteria saved.', type: 'success' });
  };

  const backLink = (
    <button className="back-link" onClick={() => navigate(backPath)}>
      <LuArrowLeft size={15} /> Back to Grading Criteria
    </button>
  );

  if (!data && !error) {
    return (
      <DashboardLayout pageTitle="Grading Criteria">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading grading criteria…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout pageTitle="Grading Criteria">
        {backLink}
        <div className="alert alert-error">{error}</div>
      </DashboardLayout>
    );
  }

  const { course, sections, defaultGrades } = data;
  const { department } = course;

  return (
    <DashboardLayout pageTitle={`Grading — ${course.name}`}>
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
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
            <span>{ordinal(course.semester)} Semester</span>
            <span><LuClock size={13} /> {course.creditHours} Credit Hours</span>
          </div>
        </div>
      </div>

      <div className="grading-cards">
        {sections.map(s => (
          <div key={s.id} className="section-detail-card">
            <div className="section-detail-header" style={{ marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="section-detail-badge">Section {s.label} · Batch {s.batch}</span>
                <span className="status-pill" style={s.grading.custom ? BADGE_CUSTOM : BADGE_DEFAULT}>
                  {s.grading.custom ? 'Custom' : 'Default'}
                </span>
                {showTeacher && (
                  <span className="td-date">{s.teacher ? `Taught by ${s.teacher.name}` : 'No teacher assigned'}</span>
                )}
              </div>
              <button className="btn-outline btn-with-icon section-assign-btn" onClick={() => setEditing(s)}>
                <LuPencil size={13} /> Change Grading Criteria
              </button>
            </div>

            <div className="table-card grading-table-card">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th style={{ textAlign: 'center' }}>Minimum %</th>
                    <th style={{ textAlign: 'center' }}>Maximum %</th>
                    <th>Percentage Range</th>
                  </tr>
                </thead>
                <tbody>
                  {s.grading.grades.map(g => (
                    <tr key={g.grade}>
                      <td className="grade-letter">{g.grade}</td>
                      <td style={{ textAlign: 'center' }}>{g.min}</td>
                      <td style={{ textAlign: 'center' }}>{g.max}</td>
                      <td className="td-date">{g.min === g.max ? `${g.min}%` : `${g.min}% – ${g.max}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <GradingCriteriaModal
          grades={editing.grading.grades}
          defaultGrades={defaultGrades}
          onSubmit={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </DashboardLayout>
  );
}
