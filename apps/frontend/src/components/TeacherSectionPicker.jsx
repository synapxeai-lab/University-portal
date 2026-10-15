import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuClock, LuUsers, LuLoaderCircle } from 'react-icons/lu';
import DashboardLayout from './DashboardLayout.jsx';
import { api } from '../services/api.js';
import { ordinal } from '../utils/ordinal.js';

// Lists the sections the teacher teaches for one course; each opens
// `${basePath}/courses/:courseId/sections/:sectionId`. Shared by Attendance,
// Marks and My Students; `backPath` overrides where "Back" goes.
export default function TeacherSectionPicker({ pageTitle, basePath, backPath = basePath }) {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get(`/teachers/me/courses/${courseId}`);
        if (!cancelled) { setCourse(data.course); setSections(data.sections); }
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Failed to load course.'); setCourse(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId]);

  if (loading) {
    return (
      <DashboardLayout pageTitle={pageTitle}>
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading course…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !course) {
    return (
      <DashboardLayout pageTitle={pageTitle}>
        <button className="back-link" onClick={() => navigate(backPath)}>
          <LuArrowLeft size={15} /> Back to {pageTitle}
        </button>
        <div className="alert alert-error">{error || 'Course not found.'}</div>
      </DashboardLayout>
    );
  }

  const department = course.department;

  return (
    <DashboardLayout pageTitle={course.name}>
      <button className="back-link" onClick={() => navigate(backPath)}>
        <LuArrowLeft size={15} /> Back to {pageTitle}
      </button>

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

      <h3 className="semester-heading" style={{ marginBottom: '0.9rem' }}>Pick a Section</h3>

      {sections.length === 0 ? (
        <div className="table-empty">
          <p>You are not assigned to any section for this course.</p>
        </div>
      ) : (
        <div className="sections-grid">
          {sections.map(s => (
            <div
              key={s.id}
              className="section-detail-card section-detail-card-link"
              onClick={() => navigate(`${basePath}/courses/${course.id}/sections/${s.id}`)}
            >
              <div className="section-detail-header">
                <span className="section-detail-badge">Section {s.label} · Batch {s.batch}</span>
              </div>
              <p className="section-empty"><LuUsers size={13} style={{ verticalAlign: '-2px', marginRight: '0.3rem' }} />{s.studentCount} student{s.studentCount === 1 ? '' : 's'} registered</p>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
