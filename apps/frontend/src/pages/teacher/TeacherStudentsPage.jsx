import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuList, LuBookOpen, LuSearch, LuX, LuLoaderCircle, LuUsers } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import FilterPills from '../../components/FilterPills.jsx';
import MarksResult from '../../components/MarksResult.jsx';
import { TeacherCourseList } from '../../components/TeacherCoursePicker.jsx';
import { api } from '../../services/api.js';

const VIEWS = [
  { key: 'all',     label: 'All Students', icon: LuList },
  { key: 'courses', label: 'Course Wise',  icon: LuBookOpen },
];

const classKey = (c) => `${c.id}-${c.section.id}`;

// Fixed-height lines so each course's percentage sits level with its name.
const COURSE_LINE = { display: 'flex', alignItems: 'center', minHeight: '1.9rem', whiteSpace: 'nowrap' };

export default function TeacherStudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'courses' ? 'courses' : 'all';
  const setView = (key) => setSearchParams(key === 'all' ? {} : { view: key }, { replace: true });

  return (
    <DashboardLayout pageTitle="My Students">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Students</h1>
          <p className="page-subtitle">
            {view === 'all'
              ? 'Every student registered in the sections you teach.'
              : 'Pick a course, then a section, to see its class list.'}
          </p>
        </div>
      </div>

      <div className="view-tabs" role="tablist" aria-label="Students view">
        {VIEWS.map(v => (
          <button
            key={v.key}
            role="tab"
            aria-selected={view === v.key}
            className={`view-tab${view === v.key ? ' active' : ''}`}
            onClick={() => setView(v.key)}
          >
            <v.icon size={15} /> {v.label}
          </button>
        ))}
      </div>

      {view === 'all' ? <AllStudents /> : <TeacherCourseList basePath="/teacher/students" />}
    </DashboardLayout>
  );
}

function AllStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get('/teachers/me/students');
        if (!cancelled) setStudents(data.students);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load students.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // One filter option per course+section the teacher teaches, with counts.
  const classOptions = useMemo(() => {
    const byKey = new Map();
    students.forEach(s => s.courses.forEach(c => {
      const key = classKey(c);
      if (!byKey.has(key)) {
        byKey.set(key, { value: key, label: `${c.code} · Section ${c.section.label} (${c.section.batch})`, count: 0 });
      }
      byKey.get(key).count += 1;
    }));
    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter(s => !classFilter || s.courses.some(c => classKey(c) === classFilter))
      .filter(s => !q
        || s.name.toLowerCase().includes(q)
        || s.rollNo.toLowerCase().includes(q)
        || s.email.toLowerCase().includes(q));
  }, [students, search, classFilter]);

  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <>
      <div className="filters-bar">
        <div className="search-wrap">
          <span className="search-icon"><LuSearch size={15} /></span>
          <input
            className="search-input"
            type="text"
            placeholder="Search by name, roll no, or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear"><LuX size={14} /></button>
          )}
        </div>
      </div>

      {classOptions.length > 0 && (
        <div className="filter-pills-row">
          <FilterPills
            label="Course"
            value={classFilter}
            onChange={setClassFilter}
            options={[{ value: '', label: 'All', count: students.length }, ...classOptions]}
          />
        </div>
      )}

      <div className="table-card">
        {loading ? (
          <div className="table-empty">
            <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
            <p>Loading students…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <LuUsers size={26} color="#cbd5e1" />
            <p>{students.length === 0 ? 'No students are registered in your sections yet.' : 'No students match your filters.'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Department</th>
                  <th>Courses</th>
                  <th>Contact</th>
                  <th>Percentage &amp; Grade</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id}>
                    <td className="td-idx">{i + 1}</td>
                    <td>
                      <div className="td-name">{s.name}</div>
                      <div className="td-date">{s.rollNo} · Batch {s.batch}</div>
                    </td>
                    <td>
                      <span className="dept-badge-pill" style={{ color: s.department.color, background: s.department.bg }}>
                        {s.department.code}
                      </span>
                    </td>
                    <td>
                      {s.courses.map(c => (
                        <div key={c.id} style={COURSE_LINE}>
                          <span><strong>{c.code}</strong><span className="td-date"> · Section {c.section.label}</span></span>
                        </div>
                      ))}
                    </td>
                    <td>
                      <div className="td-email">{s.email}</div>
                      <div className="td-date">{s.phone}</div>
                    </td>
                    <td>
                      {/* One line per course, level with the Courses column; the
                          code is repeated when there's more than one to tell them apart. */}
                      {s.courses.map(c => (
                        <div key={c.id} style={{ ...COURSE_LINE, gap: '0.5rem' }}>
                          {s.courses.length > 1 && <span className="td-date" style={{ minWidth: '3.5rem' }}>{c.code}</span>}
                          <MarksResult summary={c.summary} />
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
