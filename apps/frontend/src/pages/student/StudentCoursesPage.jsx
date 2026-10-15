import { useEffect, useState } from 'react';
import { LuClock, LuLoaderCircle, LuBookOpen } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { api } from '../../services/api.js';

const SEMESTER_LABELS = { SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };

export default function StudentCoursesPage() {
  const [groups, setGroups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await api.get('/students/me/courses');
        if (!cancelled) setGroups(res.groups);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load courses.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalCourses = groups?.reduce((sum, g) => sum + g.courses.length, 0) ?? 0;

  return (
    <DashboardLayout pageTitle="My Courses">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Courses</h1>
          <p className="page-subtitle">
            {totalCourses > 0 ? `${totalCourses} course${totalCourses === 1 ? '' : 's'} registered across ${groups.length} semester${groups.length === 1 ? '' : 's'}` : 'Courses you register for will appear here, grouped by semester.'}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading courses…</p>
        </div>
      ) : error ? null : totalCourses === 0 ? (
        <div className="table-empty">
          <LuBookOpen size={32} color="#cbd5e1" />
          <p>You haven't registered for any courses yet. Visit the Registration page while enrollment is open.</p>
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
                {g.courses.map(c => (
                  <div key={c.id} className="course-row">
                    <div className="course-row-main">
                      <div className="course-code-badge" style={{ color: c.department.color, background: c.department.bg }}>
                        {c.code}
                      </div>
                      <div className="course-info">
                        <p className="course-name">{c.name}</p>
                        <div className="course-row-meta">
                          <span className="dept-badge-pill" style={{ color: c.department.color, background: c.department.bg }}>
                            {c.department.name}
                          </span>
                          <span className="course-row-semester">Section {c.section.label}</span>
                        </div>
                      </div>
                      <div className="course-credits">
                        <LuClock size={13} /> {c.creditHours} CR
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
