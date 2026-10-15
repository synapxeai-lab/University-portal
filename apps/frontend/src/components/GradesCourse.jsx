import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuClock, LuLoaderCircle, LuPencil, LuSearch, LuX, LuUsers, LuSend } from 'react-icons/lu';
import DashboardLayout from './DashboardLayout.jsx';
import FilterPills from './FilterPills.jsx';
import GenerateGradesModal from './GenerateGradesModal.jsx';
import { formatAttendanceDate } from '../utils/attendance.js';
import Toast from './Toast.jsx';
import { api } from '../services/api.js';
import { percentStyle, fmtMark } from '../utils/marks.js';
import { ordinal } from '../utils/ordinal.js';

const MUTED     = { color: '#64748B', background: '#f1f5f9', borderColor: '#E2E8F0' };
const LIVE      = { color: '#166534', background: '#dcfce7', borderColor: '#bbf7d0' };
const SCHEDULED = { color: '#92400e', background: '#fef3c7', borderColor: '#fde68a' };

function GradeModal({ row, grades, onSave, onClose }) {
  const { summary } = row;
  const [grade, setGrade] = useState(summary.grade || grades[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (value) => {
    setSaving(true);
    setError('');
    try {
      await onSave(value);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to change grade.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Change Grade</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-mid)', marginBottom: '1rem', lineHeight: 1.6 }}>
          <strong>{row.student.name}</strong> ({row.student.rollNo})<br />
          {summary.percentage === null
            ? 'No marks graded yet.'
            : <>Percentage: {fmtMark(summary.percentage)}% · Grade from criteria: <strong>{summary.computedGrade}</strong></>}
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={e => { e.preventDefault(); submit(grade); }} noValidate>
          <div className="form-group">
            <label className="form-label">Grade <span style={{ color: '#b91c1c' }}>*</span></label>
            <select className="form-input" value={grade} onChange={e => setGrade(e.target.value)} autoFocus>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <p className="field-hint">This replaces the grade calculated from the grading criteria. Marks and percentage aren't changed.</p>
          </div>

          <div className="modal-actions">
            {summary.gradeAdjusted && (
              <button type="button" className="btn-outline" onClick={() => submit(null)} disabled={saving} style={{ marginRight: 'auto' }}>
                Use Calculated Grade
              </button>
            )}
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Grade'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// What students see: the generated grade and when it becomes visible. Flags
// when the grade has changed since it was generated.
function PublishedCell({ published, current }) {
  if (!published) return <span className="status-pill" style={MUTED}>Not generated</span>;
  const visible = new Date(published.visibleFrom) <= new Date();
  const outdated = current && current !== published.grade;
  return (
    <>
      <span className="status-pill" style={visible ? LIVE : SCHEDULED}>
        {published.grade} · {visible ? 'Visible' : `From ${formatAttendanceDate(published.visibleFrom)}`}
      </span>
      {outdated && (
        <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: '0.2rem' }}>Grade changed — generate again</div>
      )}
    </>
  );
}

// Every student in one course with percentage, grade and published grade.
// Shared by admin (`apiBase` '/marks', all sections) and teacher
// ('/teachers/me', only their sections).
export default function GradesCourse({ apiBase, backPath, coursesUrl, allLabel }) {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const [showGenerate, setShowGenerate] = useState(false);

  const load = useCallback(() => (
    api.get(`${apiBase}/courses/${courseId}/grades`)
      .then(res => { setData(res); setError(''); })
      .catch(err => setError(err.message || 'Failed to load grades.'))
  ), [apiBase, courseId]);

  useEffect(() => { load(); }, [load]);

  const sectionsById = useMemo(() => new Map((data?.sections || []).map(s => [s.id, s])), [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.students
      .filter(r => !sectionFilter || String(r.sectionId) === sectionFilter)
      .filter(r => !q || r.student.name.toLowerCase().includes(q) || r.student.rollNo.toLowerCase().includes(q));
  }, [data, sectionFilter, search]);

  const handleSave = async (grade) => {
    const row = editing;
    const res = await api.put(`${apiBase}/enrollments/${row.enrollmentId}/grade`, { grade });
    setData(prev => ({
      ...prev,
      students: prev.students.map(r => (r.enrollmentId === row.enrollmentId ? { ...r, summary: res.summary } : r)),
    }));
    setToast({ msg: res.message, type: 'success' });
  };

  const backLink = (
    <button className="back-link" onClick={() => navigate(backPath)}>
      <LuArrowLeft size={15} /> Back to Grades
    </button>
  );

  if (!data && !error) {
    return (
      <DashboardLayout pageTitle="Grades">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading grades…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout pageTitle="Grades">
        {backLink}
        <div className="alert alert-error">{error}</div>
      </DashboardLayout>
    );
  }

  const { course, sections, students, grades } = data;
  const { department } = course;

  return (
    <DashboardLayout pageTitle={`Grades — ${course.name}`}>
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      {backLink}

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
            <span><LuUsers size={13} /> {students.length} student{students.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        <button className="btn-primary btn-with-icon" onClick={() => setShowGenerate(true)} style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
          <LuSend size={15} /> Generate Grades
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-wrap">
          <span className="search-icon"><LuSearch size={15} /></span>
          <input
            className="search-input" type="text" placeholder="Search by name or roll no…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear"><LuX size={14} /></button>
          )}
        </div>
      </div>

      {sections.length > 0 && (
        <div className="filter-pills-row">
          <FilterPills
            label="Section"
            value={sectionFilter}
            onChange={setSectionFilter}
            options={[
              { value: '', label: 'All', count: students.length },
              ...sections.map(s => ({
                value: String(s.id),
                label: `Section ${s.label} (${s.batch})`,
                count: students.filter(r => r.sectionId === s.id).length,
              })),
            ]}
          />
        </div>
      )}

      <div className="table-card">
        {filtered.length === 0 ? (
          <div className="table-empty">
            <LuUsers size={26} color="#cbd5e1" />
            <p>{students.length === 0 ? 'No students are registered for this course yet.' : 'No students match your filters.'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Section</th>
                  <th style={{ textAlign: 'center' }}>Marks</th>
                  <th style={{ textAlign: 'center' }}>Percentage</th>
                  <th style={{ textAlign: 'center' }}>Grade</th>
                  <th style={{ textAlign: 'center' }}>Published</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const { summary } = r;
                  const section = sectionsById.get(r.sectionId);
                  return (
                    <tr key={r.enrollmentId}>
                      <td className="td-idx">{i + 1}</td>
                      <td>
                        <div className="td-name">{r.student.name}</div>
                        <div className="td-date">{r.student.rollNo}</div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div>Section {section?.label}</div>
                        <div className="td-date">{section?.teacher ? section.teacher.name : 'No teacher'}</div>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {summary.total > 0 ? `${fmtMark(summary.obtained)} / ${fmtMark(summary.total)}` : '—'}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {summary.percentage === null
                          ? <span className="status-pill" style={MUTED}>No marks</span>
                          : (
                            <span className="status-pill" style={percentStyle(summary.percentage)}>
                              {fmtMark(summary.percentage)}%{summary.adjusted ? ' · Adjusted' : ''}
                            </span>
                          )}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: summary.grade ? 'var(--primary)' : '#cbd5e1' }}>
                          {summary.grade || '—'}
                        </div>
                        {summary.gradeAdjusted && (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                            Changed{summary.computedGrade ? ` · was ${summary.computedGrade}` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <PublishedCell published={r.published} current={summary.grade} />
                      </td>
                      <td>
                        <div className="td-actions">
                          <button className="btn-edit" onClick={() => setEditing(r)} title="Change grade" style={{ whiteSpace: 'nowrap' }}>
                            <LuPencil size={12} style={{ verticalAlign: '-1px', marginRight: '0.25rem' }} />Change Grade
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <GradeModal row={editing} grades={grades} onSave={handleSave} onClose={() => setEditing(null)} />}
      {showGenerate && (
        <GenerateGradesModal
          apiBase={apiBase}
          coursesUrl={coursesUrl}
          allLabel={allLabel}
          initialCourseId={course.id}
          onGenerated={res => { setToast({ msg: res.message, type: 'success' }); load(); }}
          onClose={() => setShowGenerate(false)}
        />
      )}
    </DashboardLayout>
  );
}
