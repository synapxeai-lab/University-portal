import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuClock, LuUserRound, LuLoaderCircle } from 'react-icons/lu';
import DashboardLayout from './DashboardLayout.jsx';
import { api } from '../services/api.js';
import { ordinal } from '../utils/ordinal.js';

// Lists the sections a course is offered to; each opens
// `${basePath}/courses/:courseId/sections/:sectionId`. Shared by admin Attendance and Marks.
export default function AdminSectionPicker({ pageTitle, basePath }) {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get(`/courses/${courseId}`);
        if (!cancelled) setCourse(data.course);
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
        <button className="back-link" onClick={() => navigate(basePath)}>
          <LuArrowLeft size={15} /> Back to {pageTitle}
        </button>
        <div className="alert alert-error">{error || 'Course not found.'}</div>
      </DashboardLayout>
    );
  }

  const department = course.department;
  const sectionLinks = course.sectionLinks || [];

  return (
    <DashboardLayout pageTitle={course.name}>
      <button className="back-link" onClick={() => navigate(basePath)}>
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

      {sectionLinks.length === 0 ? (
        <div className="table-empty">
          <p>This course isn't offered to any section yet.</p>
        </div>
      ) : (
        <div className="sections-grid">
          {sectionLinks.map(link => (
            <div
              key={link.id}
              className="section-detail-card section-detail-card-link"
              onClick={() => navigate(`${basePath}/courses/${course.id}/sections/${link.section.id}`)}
            >
              <div className="section-detail-header">
                <span className="section-detail-badge">Section {link.section.label} · Batch {link.section.batch}</span>
              </div>
              <p className="section-empty">
                <LuUserRound size={13} style={{ verticalAlign: '-2px', marginRight: '0.3rem' }} />
                {link.teacher ? link.teacher.name : 'No teacher assigned'}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
