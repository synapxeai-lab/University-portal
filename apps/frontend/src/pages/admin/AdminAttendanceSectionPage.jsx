import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuLoaderCircle } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import AttendanceSessions from '../../components/AttendanceSessions.jsx';
import { api } from '../../services/api.js';

export default function AdminAttendanceSectionPage() {
  const { courseId, sectionId } = useParams();
  const navigate = useNavigate();

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const today = new Date().toISOString().slice(0, 10);
        const data = await api.get(`/sections/${sectionId}/courses/${courseId}/attendance?date=${today}`);
        if (!cancelled) setInfo(data);
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Failed to load section.'); setInfo(null); }
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

  if (error || !info) {
    return (
      <DashboardLayout pageTitle="Attendance">
        <button className="back-link" onClick={() => navigate(`/admin/attendance/courses/${courseId}`)}>
          <LuArrowLeft size={15} /> Back to Course
        </button>
        <div className="alert alert-error">{error || 'Section not found.'}</div>
      </DashboardLayout>
    );
  }

  const { course, section, teacher } = info;

  return (
    <DashboardLayout pageTitle={`Attendance — Section ${section.label}`}>
      <button className="back-link" onClick={() => navigate(`/admin/attendance/courses/${courseId}`)}>
        <LuArrowLeft size={15} /> Back to {course.name}
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Section {section.label} · Batch {section.batch}</h1>
          <p className="page-subtitle">
            {course.code} — {course.name} {teacher ? `· Taught by ${teacher.name}` : '· No teacher assigned'}
          </p>
        </div>
      </div>

      <AttendanceSessions
        fetchDates={() => api.get(`/sections/${sectionId}/courses/${courseId}/attendance/dates`)}
        fetchRoster={(date) => api.get(`/sections/${sectionId}/courses/${courseId}/attendance?date=${date}`)}
        saveRoster={(date, records) => api.post(`/sections/${sectionId}/courses/${courseId}/attendance`, { date, records })}
      />
    </DashboardLayout>
  );
}
