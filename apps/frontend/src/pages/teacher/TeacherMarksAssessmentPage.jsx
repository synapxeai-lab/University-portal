import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuLoaderCircle, LuPencil } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import TotalMarksModal from '../../components/TotalMarksModal.jsx';
import Toast from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { MARK_TYPE_LABELS, fmtMark } from '../../utils/marks.js';

// Inputs are kept as strings so a half-typed value ("7.") isn't mangled; an
// empty input means "not graded".
const toInput = (obtained) => (obtained === null ? '' : String(obtained));

export default function TeacherMarksAssessmentPage() {
  const { courseId, sectionId, assessmentId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEditTotal, setShowEditTotal] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const applyRoster = (roster) => {
    setValues(Object.fromEntries(roster.map(r => [r.enrollmentId, toInput(r.obtained)])));
    setDirty(false);
  };

  useEffect(() => {
    let cancelled = false;
    api.get(`/teachers/me/marks/assessments/${assessmentId}`)
      .then(res => { if (!cancelled) { setData(res); applyRoster(res.roster); } })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load.'); });
    return () => { cancelled = true; };
  }, [assessmentId]);

  const categoryPath = data
    ? `/teacher/marks/courses/${courseId}/sections/${sectionId}/categories/${data.assessment.category.id}`
    : `/teacher/marks/courses/${courseId}/sections/${sectionId}`;

  const backLink = (
    <button className="back-link" onClick={() => navigate(categoryPath)}>
      <LuArrowLeft size={15} /> Back to {data ? MARK_TYPE_LABELS[data.assessment.category.type] : 'Section'}
    </button>
  );

  if (!data && !error) {
    return (
      <DashboardLayout pageTitle="Marks">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading students…</p>
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

  const { course, section, assessment, roster } = data;
  const total = assessment.totalMarks;

  const invalidFor = (raw) => {
    if (raw.trim() === '') return '';
    const n = Number(raw);
    if (isNaN(n)) return 'Not a number';
    if (n < 0) return 'Cannot be negative';
    if (n > total) return `Max ${fmtMark(total)}`;
    return '';
  };
  const hasErrors = roster.some(r => invalidFor(values[r.enrollmentId] ?? ''));
  const gradedCount = roster.filter(r => (values[r.enrollmentId] ?? '').trim() !== '').length;

  const setValue = (enrollmentId, v) => {
    setValues(prev => ({ ...prev, [enrollmentId]: v }));
    setDirty(true);
  };

  const handleSave = async () => {
    const records = roster.map(r => {
      const raw = (values[r.enrollmentId] ?? '').trim();
      return { enrollmentId: r.enrollmentId, obtained: raw === '' ? null : Number(raw) };
    });
    setSaving(true);
    try {
      const res = await api.put(`/teachers/me/marks/assessments/${assessmentId}/marks`, { records });
      setData(prev => ({ ...prev, roster: res.roster }));
      applyRoster(res.roster);
      setToast({ msg: res.message || 'Marks saved.', type: 'success' });
    } catch (err) {
      setToast({ msg: err.message || 'Failed to save marks.', type: 'error' });
    } finally { setSaving(false); }
  };

  const handleUpdateTotal = async (totalMarks) => {
    const res = await api.put(`/teachers/me/marks/assessments/${assessmentId}`, { totalMarks });
    setData(prev => ({ ...prev, assessment: { ...prev.assessment, totalMarks: res.assessment.totalMarks } }));
    setToast({ msg: res.message || 'Total marks updated.', type: 'success' });
  };

  return (
    <DashboardLayout pageTitle={`Marks — ${assessment.title}`}>
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      {backLink}

      <div className="page-header">
        <div>
          <h1 className="page-title">{assessment.title} · Out of {fmtMark(total)}</h1>
          <p className="page-subtitle">
            {course.code} — {course.name} · Section {section.label} · Batch {section.batch} · {gradedCount} / {roster.length} graded
          </p>
        </div>
        <button className="btn-outline btn-with-icon" onClick={() => setShowEditTotal(true)} style={{ flexShrink: 0 }}>
          <LuPencil size={14} /> Edit Total
        </button>
      </div>

      {roster.length === 0 ? (
        <div className="table-empty"><p>No students are registered for this section yet.</p></div>
      ) : (
        <>
          <div className="table-card">
            <div className="table-scroll">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Roll No</th>
                    <th style={{ textAlign: 'right' }}>Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((r, idx) => {
                    const raw = values[r.enrollmentId] ?? '';
                    const err = invalidFor(raw);
                    return (
                      <tr key={r.enrollmentId}>
                        <td className="td-idx">{idx + 1}</td>
                        <td>{r.student.name}</td>
                        <td className="td-email">{r.student.rollNo}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
                            <input
                              className={`form-input${err ? ' input-error' : ''}`}
                              type="number" min="0" max={total} step="0.5"
                              value={raw} placeholder="—"
                              onChange={e => setValue(r.enrollmentId, e.target.value)}
                              style={{ width: 80, padding: '0.4rem 0.55rem', textAlign: 'right' }}
                              aria-label={`Marks for ${r.student.name}`}
                            />
                            <span style={{ fontSize: '0.82rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>/ {fmtMark(total)}</span>
                          </div>
                          {err && <p className="field-error" style={{ textAlign: 'right', margin: '0.2rem 0 0' }}>{err}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Leave a box empty to keep that student ungraded.</span>
            <button className="btn-primary" style={{ width: 'auto' }} disabled={saving || !dirty || hasErrors} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save Marks'}
            </button>
          </div>
        </>
      )}

      {showEditTotal && (
        <TotalMarksModal
          title={`Edit Total — ${assessment.title}`}
          submitLabel="Update Total"
          initialTotal={total}
          onSubmit={handleUpdateTotal}
          onClose={() => setShowEditTotal(false)}
        />
      )}
    </DashboardLayout>
  );
}
