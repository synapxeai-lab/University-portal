import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuUser, LuPhone, LuMail, LuHash, LuLoaderCircle } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import MarksResult from '../../components/MarksResult.jsx';
import { api } from '../../services/api.js';

export default function TeacherSectionDetailPage() {
  const { courseId, sectionId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get(`/teachers/me/courses/${courseId}/sections/${sectionId}`);
        if (!cancelled) { setCourse(data.course); setSection(data.section); }
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Failed to load section.'); setSection(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId, sectionId]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Section">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading section…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !section) {
    return (
      <DashboardLayout pageTitle="Section">
        <button className="back-link" onClick={() => navigate(`/teacher/students/courses/${courseId}`)}>
          <LuArrowLeft size={15} /> Back to Course
        </button>
        <div className="alert alert-error">{error || 'Section not found.'}</div>
      </DashboardLayout>
    );
  }

  const { department, students } = section;

  return (
    <DashboardLayout pageTitle={`Section ${section.label}`}>
      <button className="back-link" onClick={() => navigate(`/teacher/students/courses/${courseId}`)}>
        <LuArrowLeft size={15} /> Back to {course.name}
      </button>

      <div className="dept-detail-header" style={{ borderColor: department.bg }}>
        <div className="dept-detail-icon" style={{ background: department.bg, color: department.color }}>
          {department.code}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>Section {section.label} · Batch {section.batch}</h1>
          <p className="page-subtitle" style={{ marginBottom: '0.6rem' }}>
            {course.code} — {course.name}
          </p>
          <div className="dept-detail-meta">
            <span><LuUser size={13} /> {students.length} student{students.length === 1 ? '' : 's'} enrolled</span>
          </div>
        </div>
      </div>

      <h3 className="semester-heading" style={{ marginBottom: '0.9rem' }}>Enrolled Students</h3>

      <div className="dept-list">
        {students.length === 0 ? (
          <div className="table-empty"><p>No students enrolled in this section yet.</p></div>
        ) : students.map(s => (
          <div key={s.id} className="teacher-row">
            <div className="dept-row-icon" style={{ background: '#dcfce7', color: '#166534' }}>
              <LuUser size={20} />
            </div>
            <div className="dept-row-body">
              <h3 className="dept-row-name">{s.name}</h3>
              <div className="dept-row-meta" style={{ marginTop: '0.2rem' }}>
                <span><LuHash size={13} /> {s.rollNo}</span>
                <span><LuPhone size={13} /> {s.phone}</span>
                <span><LuMail size={13} /> {s.email}</span>
              </div>
            </div>
            <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <MarksResult summary={s.summary} />
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
