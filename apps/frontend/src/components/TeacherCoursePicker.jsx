import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuChevronRight, LuClock, LuSearch, LuX, LuLoaderCircle, LuLayers } from 'react-icons/lu';
import DashboardLayout from './DashboardLayout.jsx';
import { api } from '../services/api.js';
import { ordinal } from '../utils/ordinal.js';

// Searchable list of the signed-in teacher's courses; each opens
// `${basePath}/courses/:id`. Used inside pages that bring their own layout.
export function TeacherCourseList({ basePath }) {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get('/teachers/me/courses');
        if (!cancelled) setCourses(data.courses);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load courses.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [courses, search]);

  return (
    <>
      {courses.length > 0 && (
        <div className="filters-bar">
          <div className="search-wrap">
            <span className="search-icon"><LuSearch size={15} /></span>
            <input
              className="search-input"
              type="text"
              placeholder="Search by course name or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear"><LuX size={14} /></button>
            )}
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading courses…</p>
        </div>
      ) : !error && (
        <div className="course-list">
          {filtered.length === 0 ? (
            <div className="table-empty">
              <p>{courses.length === 0 ? 'You are not assigned to teach any courses yet.' : 'No courses match your search.'}</p>
            </div>
          ) : filtered.map(c => (
            <div key={c.id} className="course-row">
              <button
                className="course-row-main"
                onClick={() => navigate(`${basePath}/courses/${c.id}`)}
              >
                <div className="course-code-badge" style={{ color: c.department.color, background: c.department.bg }}>
                  {c.code}
                </div>
                <div className="course-info">
                  <p className="course-name">{c.name}</p>
                  <div className="course-row-meta">
                    <span className="dept-badge-pill" style={{ color: c.department.color, background: c.department.bg }}>
                      {c.department.name}
                    </span>
                    <span className="course-row-semester">{ordinal(c.semester)} Semester</span>
                  </div>
                </div>
                <div className="course-credits">
                  <LuLayers size={13} /> {c.sectionCount} section{c.sectionCount === 1 ? '' : 's'}
                </div>
                <div className="course-credits">
                  <LuClock size={13} /> {c.creditHours} CR
                </div>
                <LuChevronRight size={16} className="course-card-chevron" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Full page listing the teacher's courses; each opens `${basePath}/courses/:id`.
// Shared by the Attendance and Marks sections.
export default function TeacherCoursePicker({ pageTitle, subtitle, basePath }) {
  return (
    <DashboardLayout pageTitle={pageTitle}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      <TeacherCourseList basePath={basePath} />
    </DashboardLayout>
  );
}
