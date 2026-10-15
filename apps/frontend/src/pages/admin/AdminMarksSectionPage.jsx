import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuLoaderCircle, LuPencil, LuX, LuClipboardList } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import Toast from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { percentStyle, fmtMark } from '../../utils/marks.js';

const MUTED = { color: '#64748B', background: '#f1f5f9', borderColor: '#E2E8F0' };

function PercentageModal({ row, onSave, onClose }) {
  const { summary } = row;
  const [value, setValue] = useState(summary.adjusted ? String(summary.percentage) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (percentage) => {
    setSaving(true);
    setError('');
    try {
      await onSave(percentage);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update percentage.');
    } finally { setSaving(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const n = Number(value);
    if (value.trim() === '' || isNaN(n) || n < 0 || n > 100) {
      setError('Enter a percentage between 0 and 100.');
      return;
    }
    submit(n);
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Adjust Course Percentage</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-mid)', marginBottom: '1rem', lineHeight: 1.6 }}>
          <strong>{row.student.name}</strong> ({row.student.rollNo})<br />
          Calculated from marks: {summary.computedPercentage === null
            ? 'no marks graded yet'
            : `${fmtMark(summary.obtained)} / ${fmtMark(summary.total)} = ${summary.computedPercentage}%`}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Course Percentage <span style={{ color: '#b91c1c' }}>*</span></label>
            <input
              className={`form-input${error ? ' input-error' : ''}`}
              type="number" min="0" max="100" step="0.5" autoFocus
              value={value} onChange={e => { setValue(e.target.value); setError(''); }}
              placeholder={summary.computedPercentage !== null ? String(summary.computedPercentage) : 'e.g. 75'}
            />
            {error && <p className="field-error">{error}</p>}
            <p className="field-hint">The student sees this percentage instead of the calculated one. Teacher-entered marks aren't changed.</p>
          </div>

          <div className="modal-actions">
            {summary.adjusted && (
              <button type="button" className="btn-outline" onClick={() => submit(null)} disabled={saving} style={{ marginRight: 'auto' }}>
                Remove Adjustment
              </button>
            )}
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function AdminMarksSectionPage() {
  const { courseId, sectionId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const load = useCallback(() => (
    api.get(`/marks/courses/${courseId}/sections/${sectionId}`)
      .then(res => { setData(res); setError(''); })
      .catch(err => setError(err.message || 'Failed to load marks.'))
  ), [courseId, sectionId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (percentage) => {
    const res = await api.put(`/marks/enrollments/${editing.enrollmentId}/percentage`, { percentage });
    setToast({ msg: res.message || 'Saved.', type: 'success' });
    await load();
  };

  const backLink = (
    <button className="back-link" onClick={() => navigate(`/admin/marks/courses/${courseId}`)}>
      <LuArrowLeft size={15} /> Back to {data?.course?.name || 'Course'}
    </button>
  );

  if (!data && !error) {
    return (
      <DashboardLayout pageTitle="Marks">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading marks…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout pageTitle="Marks">
        {backLink}
        <div className="alert alert-error">{error}</div>
      </DashboardLayout>
    );
  }

  const { course, section, teacher, assessments, students } = data;

  return (
    <DashboardLayout pageTitle={`Marks — Section ${section.label}`}>
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      {backLink}

      <div className="page-header">
        <div>
          <h1 className="page-title">Section {section.label} · Batch {section.batch}</h1>
          <p className="page-subtitle">
            {course.code} — {course.name} {teacher ? `· Taught by ${teacher.name}` : '· No teacher assigned'}
          </p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="table-empty">
          <LuClipboardList size={32} color="#cbd5e1" />
          <p>No students are registered for this section yet.</p>
        </div>
      ) : (
        <>
          {assessments.length === 0 && (
            <div className="alert" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: 'var(--text-mid)' }}>
              The teacher hasn't added any quizzes, assignments or exams for this section yet.
            </div>
          )}
          <div className="table-card">
            <div className="table-scroll">
              <table className="users-table marks-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Roll No</th>
                    {assessments.map(a => (
                      <th key={a.id} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {a.title}<br />
                        <span style={{ fontWeight: 500, color: '#94a3b8' }}>/ {fmtMark(a.totalMarks)}</span>
                      </th>
                    ))}
                    <th style={{ textAlign: 'center' }}>Total</th>
                    <th style={{ textAlign: 'center' }}>Percentage</th>
                    <th style={{ textAlign: 'center' }}>Grade</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {students.map((r, idx) => {
                    const { summary } = r;
                    return (
                      <tr key={r.enrollmentId}>
                        <td className="td-idx">{idx + 1}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{r.student.name}</td>
                        <td className="td-email" style={{ whiteSpace: 'nowrap' }}>{r.student.rollNo}</td>
                        {assessments.map(a => {
                          const v = r.marks[a.id];
                          return (
                            <td key={a.id} style={{ textAlign: 'center', color: v === null ? '#cbd5e1' : undefined }}>
                              {v === null ? '—' : fmtMark(v)}
                            </td>
                          );
                        })}
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {summary.total > 0 ? `${fmtMark(summary.obtained)} / ${fmtMark(summary.total)}` : '—'}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {summary.percentage === null ? (
                            <span className="status-pill" style={MUTED}>No marks</span>
                          ) : (
                            <>
                              <span className="status-pill" style={percentStyle(summary.percentage)}>
                                {fmtMark(summary.percentage)}%{summary.adjusted ? ' · Adjusted' : ''}
                              </span>
                              {summary.adjusted && (
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                  {summary.computedPercentage === null ? 'no marks graded' : `was ${summary.computedPercentage}%`}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: summary.grade ? undefined : '#cbd5e1' }}>
                          {summary.grade || '—'}
                        </td>
                        <td>
                          <button className="btn-edit" onClick={() => setEditing(r)} title="Adjust course percentage" style={{ whiteSpace: 'nowrap' }}>
                            <LuPencil size={12} style={{ verticalAlign: '-1px', marginRight: '0.25rem' }} />Edit %
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editing && <PercentageModal row={editing} onSave={handleSave} onClose={() => setEditing(null)} />}
    </DashboardLayout>
  );
}
