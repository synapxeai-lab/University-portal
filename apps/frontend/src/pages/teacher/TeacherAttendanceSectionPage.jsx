import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuLoaderCircle } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import AttendanceSessions from '../../components/AttendanceSessions.jsx';
import { api } from '../../services/api.js';

export default function TeacherAttendanceSectionPage() {
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
      <DashboardLayout pageTitle="Attendance">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading section…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !section) {
    return (
      <DashboardLayout pageTitle="Attendance">
        <button className="back-link" onClick={() => navigate(`/teacher/attendance/courses/${courseId}`)}>
          <LuArrowLeft size={15} /> Back to Course
        </button>
        <div className="alert alert-error">{error || 'Section not found.'}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={`Attendance — Section ${section.label}`}>
      <button className="back-link" onClick={() => navigate(`/teacher/attendance/courses/${courseId}`)}>
        <LuArrowLeft size={15} /> Back to {course.name}
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Section {section.label} · Batch {section.batch}</h1>
          <p className="page-subtitle">{course.code} — {course.name}</p>
        </div>
      </div>

      <AttendanceSessions
        fetchDates={() => api.get(`/teachers/me/courses/${courseId}/sections/${sectionId}/attendance/dates`)}
        fetchRoster={(date) => api.get(`/teachers/me/courses/${courseId}/sections/${sectionId}/attendance?date=${date}`)}
        saveRoster={(date, records) => api.post(`/teachers/me/courses/${courseId}/sections/${sectionId}/attendance`, { date, records })}
      />
    </DashboardLayout>
  );
}
