import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuChevronRight, LuClock, LuSearch, LuX, LuLoaderCircle } from 'react-icons/lu';
import DashboardLayout from './DashboardLayout.jsx';
import FilterPills from './FilterPills.jsx';
import { api } from '../services/api.js';
import { ordinal } from '../utils/ordinal.js';

// Lists every active course across departments; each opens `${basePath}/courses/:id`.
// Shared by the admin Attendance, Marks and grading sections. `actions` renders
// in the page header (e.g. a button); `children` render between the header and
// the course filters.
export default function AdminCoursePicker({ pageTitle, subtitle, basePath, actions = null, children = null }) {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    api.get('/departments').then(data => setDepartments(data.departments)).catch(() => {});
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (deptFilter) params.set('departmentId', deptFilter);
      // Only courses actually offered to a section have attendance or marks.
      params.set('status', 'ACTIVE');
      const data = await api.get(`/courses?${params}`);
      setCourses(data.courses);
    } catch {
      setCourses([]);
    } finally { setLoading(false); }
  }, [search, deptFilter]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  return (
    <DashboardLayout pageTitle={pageTitle}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {actions}
      </div>

      {children}

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

      <FilterPills
        label="Department"
        value={deptFilter}
        onChange={setDeptFilter}
        options={[{ value: '', label: 'All' }, ...departments.map(d => ({ value: String(d.id), label: d.name }))]}
      />

      {loading ? (
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading courses…</p>
        </div>
      ) : (
        <div className="course-list">
          {courses.length === 0 ? (
            <div className="table-empty">
              <p>No courses match your filters.</p>
            </div>
          ) : courses.map(c => (
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
                  <LuClock size={13} /> {c.creditHours} CR
                </div>
                <LuChevronRight size={16} className="course-card-chevron" />
              </button>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
