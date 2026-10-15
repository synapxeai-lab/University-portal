import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LuX, LuPencil, LuTrash2, LuRefreshCw, LuLoaderCircle } from 'react-icons/lu';
import ConfirmDialog from './ConfirmDialog.jsx';
import { api } from '../services/api.js';
import { formatAttendanceDate } from '../utils/attendance.js';

const LIVE      = { color: '#166534', background: '#dcfce7', borderColor: '#bbf7d0' };
const SCHEDULED = { color: '#92400e', background: '#fef3c7', borderColor: '#fde68a' };

const isVisible = (iso) => new Date(iso) <= new Date();

function VisibilityPill({ release }) {
  const { visibleFrom, visibleTo } = release;
  const visible = isVisible(visibleTo);
  const label = visibleFrom === visibleTo
    ? formatAttendanceDate(visibleFrom)
    : `${formatAttendanceDate(visibleFrom)} – ${formatAttendanceDate(visibleTo)}`;
  return (
    <>
      <div style={{ whiteSpace: 'nowrap' }}>{label}</div>
      <span className="status-pill" style={{ ...(visible ? LIVE : SCHEDULED), marginTop: '0.25rem' }}>
        {visible ? 'Visible to students' : 'Scheduled'}
      </span>
    </>
  );
}

// Change a release's visible-from date, or regenerate it from current grades.
function EditReleaseModal({ apiBase, release, onDone, onClose }) {
  const [date, setDate] = useState(release.visibleTo.slice(0, 10));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const run = async (kind) => {
    if (!date) { setError('Pick a date.'); return; }
    setBusy(kind);
    setError('');
    try {
      const res = kind === 'regenerate'
        ? await api.post(`${apiBase}/grades/generate`, { courseId: release.course.id, visibleFrom: date })
        : await api.put(`${apiBase}/grades/releases/${release.course.id}`, { visibleFrom: date });
      onDone(res.message);
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally { setBusy(''); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Generated Grades</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-mid)', marginBottom: '1rem', lineHeight: 1.6 }}>
          <strong>{release.course.code} — {release.course.name}</strong><br />
          {release.students} student{release.students === 1 ? '' : 's'} · generated {release.generatedAt ? formatAttendanceDate(release.generatedAt) : '—'}
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={e => { e.preventDefault(); run('date'); }} noValidate>
          <div className="form-group">
            <label className="form-label">Visible to students from <span style={{ color: '#b91c1c' }}>*</span></label>
            <input className="form-input" type="date" value={date} onChange={e => { setDate(e.target.value); setError(''); }} />
            <p className="field-hint">
              Save Date only moves the date. Regenerate also refreshes every student's grade from their current marks and any grade changes.
            </p>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline btn-with-icon" style={{ marginRight: 'auto' }} onClick={() => run('regenerate')} disabled={!!busy}>
              <LuRefreshCw size={14} /> {busy === 'regenerate' ? 'Regenerating…' : 'Regenerate'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose} disabled={!!busy}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!!busy}>{busy === 'date' ? 'Saving…' : 'Save Date'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Generated grades per course, shown above the course list on the Grades page.
// `apiBase` is '/marks' (admin) or '/teachers/me' (teacher, own sections only).
export default function GradeReleases({ apiBase = '/marks', releases, error, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const handleUnpublish = async () => {
    const release = removing;
    setRemoving(null);
    try {
      const res = await api.delete(`${apiBase}/grades/releases/${release.course.id}`);
      onChanged(res.message, 'success');
    } catch (err) {
      onChanged(err.message || 'Failed to unpublish grades.', 'error');
    }
  };

  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h3 className="semester-heading">Generated Grades{releases ? ` (${releases.length})` : ''}</h3>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-card">
        {!releases && !error ? (
          <div className="table-empty">
            <LuLoaderCircle size={22} className="spin" color="#94a3b8" />
            <p>Loading generated grades…</p>
          </div>
        ) : releases?.length === 0 ? (
          <div className="table-empty">
            <p>No grades generated yet. Use <strong>Generate Grades</strong> to publish grades to students.</p>
          </div>
        ) : releases && (
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Course</th>
                  <th>Department</th>
                  <th style={{ textAlign: 'center' }}>Students</th>
                  <th>Visible From</th>
                  <th>Generated On</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((r, i) => (
                  <tr key={r.courseId}>
                    <td className="td-idx">{i + 1}</td>
                    <td>
                      <div className="td-name">{r.course.code}</div>
                      <div className="td-date">{r.course.name}</div>
                    </td>
                    <td>
                      <span className="dept-badge-pill" style={{ color: r.course.department.color, background: r.course.department.bg }}>
                        {r.course.department.code}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.students}</td>
                    <td><VisibilityPill release={r} /></td>
                    <td className="td-date" style={{ whiteSpace: 'nowrap' }}>{r.generatedAt ? formatAttendanceDate(r.generatedAt) : '—'}</td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-edit" onClick={() => setEditing(r)} title="Edit generated grades">
                          <LuPencil size={13} /> <span>Edit</span>
                        </button>
                        <button className="btn-del" onClick={() => setRemoving(r)} title="Unpublish grades">
                          <LuTrash2 size={13} /> <span>Unpublish</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditReleaseModal apiBase={apiBase} release={editing} onDone={msg => onChanged(msg, 'success')} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={!!removing}
        title="Unpublish Grades"
        message={removing && `Remove the generated grades for ${removing.course.code}? Students will no longer see these grades on their transcript or marks.`}
        confirmLabel="Unpublish"
        onConfirm={handleUnpublish}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}

