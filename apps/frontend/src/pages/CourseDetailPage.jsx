import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LuArrowLeft, LuClock, LuPhone, LuMail, LuLoaderCircle } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { api } from '../services/api.js';
import { ordinal } from '../utils/ordinal.js';
import { ROLE_BASE } from '../utils/roleBase.js';

const STATUS_META = {
  ACTIVE:   { label: 'Active',   color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
  INACTIVE: { label: 'Inactive', color: '#64748B', bg: '#f1f5f9', border: '#E2E8F0' },
};

export default function CourseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = ROLE_BASE[user?.role?.name] || '/student';

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get(`/courses/${id}`);
        if (!cancelled) setCourse(data.course);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load course.');
          setCourse(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Course">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading course…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !course) {
    return (
      <DashboardLayout pageTitle="Course">
        <button className="back-link" onClick={() => navigate(`${base}/courses`)}>
          <LuArrowLeft size={15} /> Back to Courses
        </button>
        <div className="alert alert-error">{error || 'Course not found.'}</div>
      </DashboardLayout>
    );
  }

  const sm = STATUS_META[course.status] || STATUS_META.ACTIVE;
  const department = course.department;
  const sectionLinks = course.sectionLinks || [];

  return (
    <DashboardLayout pageTitle={course.name}>
      <button className="back-link" onClick={() => navigate(`${base}/courses`)}>
        <LuArrowLeft size={15} /> Back to Courses
      </button>

      <div className="dept-detail-header" style={{ borderColor: department.bg }}>
        <div className="dept-detail-icon" style={{ background: department.bg, color: department.color }}>
          {course.code}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>{course.name}</h1>
          <p className="page-subtitle" style={{ marginBottom: '0.6rem' }}>
            <Link to={`${base}/departments/${department.id}`} className="course-detail-dept-link">
              {department.name} ({department.code})
            </Link>
          </p>
          <div className="dept-detail-meta">
            <span>{ordinal(course.semester)} Semester</span>
            <span><LuClock size={13} /> {course.creditHours} Credit Hours</span>
            <span className="status-pill" style={{ color: sm.color, background: sm.bg, borderColor: sm.border }}>
              {sm.label}
            </span>
          </div>
        </div>
      </div>

      <h3 className="semester-heading" style={{ marginBottom: '0.9rem' }}>Currently Taught By</h3>

      {sectionLinks.length === 0 ? (
        <div className="table-empty">
          <p>This course is not currently offered to any batch. Offer it from the Offer Courses page.</p>
        </div>
      ) : (
        <div className="sections-grid">
          {sectionLinks.map(link => (
            <div key={link.id} className="section-detail-card">
              <div className="section-detail-header">
                <span className="section-detail-badge">Section {link.section.label} · Batch {link.section.batch}</span>
              </div>
              {link.teacher ? (
                <div className="section-teacher-info">
                  <p className="section-teacher-name">{link.teacher.name}</p>
                  <p className="section-teacher-detail"><LuPhone size={12} /> {link.teacher.phone}</p>
                  <p className="section-teacher-detail"><LuMail size={12} /> {link.teacher.email}</p>
                </div>
              ) : (
                <p className="section-empty">No teacher assigned yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
