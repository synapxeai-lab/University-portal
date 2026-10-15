import { useCallback, useEffect, useState } from 'react';
import { LuClock, LuLoaderCircle, LuCalendarClock, LuCircleCheck, LuChevronDown, LuUser } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import Toast from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { ordinal } from '../../utils/ordinal.js';

const SEMESTER_LABELS = { SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };

function SectionPicker({ course, value, onChange }) {
  const locked = course.registered || course.sections.length <= 1;
  const current = course.sections.find(s => s.id === value) ?? course.sections[0];
  const teacherName = (s) => s?.teacher ? s.teacher.name : 'No teacher assigned';

  return (
    <div className="section-picker">
      <span className="section-picker-label">Section</span>
      {locked ? (
        <div className="section-picker-static" title={`Section ${current?.label} — ${teacherName(current)}`}>
          <span className="section-picker-badge">{current?.label}</span>
          <LuUser size={13} className="section-picker-icon" />
          <span className="section-picker-teacher">{teacherName(current)}</span>
        </div>
      ) : (
        <div className="section-picker-control">
          <span className="section-picker-badge">{current?.label}</span>
          <select
            value={value ?? ''}
            onChange={e => onChange(Number(e.target.value))}
            aria-label={`Section for ${course.code}`}
          >
            {course.sections.map(s => (
              <option key={s.id} value={s.id}>
                Section {s.label} — {teacherName(s)}
              </option>
            ))}
          </select>
          <span className="section-picker-teacher">{teacherName(current)}</span>
          <LuChevronDown size={15} className="section-picker-chevron" />
        </div>
      )}
    </div>
  );
}

export default function StudentRegistrationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selections, setSelections] = useState({}); // courseId -> sectionId
  const [selected, setSelected] = useState(new Set()); // courseIds checked for registration
  const [registering, setRegistering] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/students/me/registrations');
      setData(res);
      if (res.courses) {
        setSelections(prev => {
          const next = { ...prev };
          for (const c of res.courses) {
            if (next[c.id] === undefined) next[c.id] = c.registeredSectionId ?? c.defaultSectionId;
          }
          return next;
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load offered courses.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSelected = (courseId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId); else next.add(courseId);
      return next;
    });
  };

  const selectedCourses = data?.courses?.filter(c => selected.has(c.id)) ?? [];
  const selectedCredits = selectedCourses.reduce((sum, c) => sum + c.creditHours, 0);
  const willExceed = data ? (data.creditsUsed + selectedCredits > data.creditLimit) : false;

  const handleRegisterSelected = async () => {
    if (selectedCourses.length === 0 || willExceed) return;
    setRegistering(true);
    let succeeded = 0;
    const failures = [];

    for (const course of selectedCourses) {
      const sectionId = selections[course.id];
      try {
        await api.post('/students/me/registrations', { courseId: course.id, sectionId });
        succeeded += 1;
        setData(prev => ({
          ...prev,
          creditsUsed: prev.creditsUsed + course.creditHours,
          courses: prev.courses.map(c => c.id === course.id
            ? { ...c, registered: true, registeredSectionId: sectionId }
            : c),
        }));
        setSelected(prev => { const next = new Set(prev); next.delete(course.id); return next; });
      } catch (err) {
        failures.push(`${course.code}: ${err.message || 'failed'}`);
      }
    }

    if (failures.length === 0) {
      showToast(`Registered for ${succeeded} course${succeeded === 1 ? '' : 's'} successfully.`);
    } else if (succeeded === 0) {
      showToast(failures.join(' · '), 'error');
    } else {
      showToast(`Registered ${succeeded} course(s). Failed: ${failures.join(' · ')}`, 'error');
    }
    setRegistering(false);
  };

  const registrationLabel = data?.registration
    ? `${SEMESTER_LABELS[data.registration.semester]} ${data.registration.year} Registration`
    : '';

  return (
    <DashboardLayout pageTitle="Registration">
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Course Registration</h1>
          <p className="page-subtitle">
            {data?.registrationOpen && data.courses?.length > 0
              ? `${registrationLabel} · ${ordinal(data.semester)} Semester · ${data.creditsUsed} / ${data.creditLimit} credit hours used`
              : 'Offered courses for your current semester appear here while registration is open.'}
          </p>
        </div>
        {data?.registrationOpen && data.courses?.length > 0 && (
          <button
            className="btn-primary btn-with-icon"
            style={{ flexShrink: 0 }}
            disabled={selectedCourses.length === 0 || willExceed || registering}
            title={willExceed ? `Selected courses would exceed your ${data.creditLimit} credit hour limit` : undefined}
            onClick={handleRegisterSelected}
          >
            {registering
              ? 'Registering…'
              : `Register${selectedCourses.length ? ` (${selectedCourses.length} · ${selectedCredits} CR)` : ''}`}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading offered courses…</p>
        </div>
      ) : error ? null : !data.registrationOpen ? (
        <div className="table-empty">
          <LuCalendarClock size={32} color="#cbd5e1" />
          <p>{data.message}</p>
        </div>
      ) : data.courses.length === 0 ? (
        <div className="table-empty">
          <LuCalendarClock size={32} color="#cbd5e1" />
          <p>{data.message}</p>
        </div>
      ) : (
        <div className="course-list">
          {data.courses.map(c => (
            <div key={c.id} className="course-row">
              <div className="course-row-main">
                {c.registered ? (
                  <span className="status-pill" style={{ color: '#166534', background: '#dcfce7', borderColor: '#bbf7d0', flexShrink: 0 }}>
                    <LuCircleCheck size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} /> Registered
                  </span>
                ) : (
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelected(c.id)}
                    style={{ width: 17, height: 17, flexShrink: 0, cursor: 'pointer' }}
                    aria-label={`Select ${c.code} to register`}
                  />
                )}
                <div className="course-code-badge" style={{ color: c.department.color, background: c.department.bg }}>
                  {c.code}
                </div>
                <div className="course-info">
                  <p className="course-name">{c.name}</p>
                  <div className="course-row-meta">
                    <span className="dept-badge-pill" style={{ color: c.department.color, background: c.department.bg }}>
                      {c.department.name}
                    </span>
                  </div>
                </div>
                <SectionPicker
                  course={c}
                  value={selections[c.id]}
                  onChange={id => setSelections(p => ({ ...p, [c.id]: id }))}
                />
                <div className="course-credits">
                  <LuClock size={13} /> {c.creditHours} CR
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
