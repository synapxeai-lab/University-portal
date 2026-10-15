import { useEffect, useState } from 'react';
import { LuLoaderCircle, LuCheckCheck } from 'react-icons/lu';
import Toast from './Toast.jsx';
import { ATTENDANCE_STATUSES as STATUSES, ATTENDANCE_META as STATUS_META, todayStr } from '../utils/attendance.js';

// Shared by the teacher and admin attendance pages — both mark/edit the same
// shape of roster, just scoped to different API calls.
// `lockDate` hides the date picker (editing a date that's already saved);
// `onSaved(date)` runs after a successful save.
export default function AttendanceRoster({ fetchRoster, saveRoster, initialDate = todayStr(), lockDate = false, onSaved }) {
  const [date, setDate] = useState(initialDate);
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = () => setToast({ msg: '', type: 'success' });

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setDirty(false);
    fetchRoster(date)
      .then(data => { if (!cancelled) setRoster(data.roster); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load attendance.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date]);

  const setStatus = (enrollmentId, status) => {
    setRoster(prev => prev.map(r => r.enrollmentId === enrollmentId ? { ...r, status } : r));
    setDirty(true);
  };

  const markAll = (status) => {
    setRoster(prev => prev.map(r => ({ ...r, status })));
    setDirty(true);
  };

  const handleSave = async () => {
    const records = roster.filter(r => r.status).map(r => ({ enrollmentId: r.enrollmentId, status: r.status }));
    setSaving(true);
    try {
      const res = await saveRoster(date, records);
      setRoster(res.roster);
      setDirty(false);
      showToast(res.message || 'Attendance saved.');
      onSaved?.(date);
    } catch (err) {
      showToast(err.message || 'Failed to save attendance.', 'error');
    } finally { setSaving(false); }
  };

  const counts = Object.fromEntries(STATUSES.map(s => [s, roster?.filter(r => r.status === s).length ?? 0]));
  const unmarked = roster ? roster.filter(r => !r.status).length : 0;

  return (
    <div>
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {lockDate ? <span /> : (
          <div className="form-group" style={{ maxWidth: 220, marginBottom: 0 }}>
            <label className="form-label">Date</label>
            <input
              className="form-input" type="date" value={date} max={todayStr()}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        )}
        {roster && roster.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <span key={s} className="status-pill" style={{ color: STATUS_META[s].color, background: STATUS_META[s].bg, borderColor: STATUS_META[s].border }}>
                {STATUS_META[s].label} {counts[s]}
              </span>
            ))}
            {unmarked > 0 && (
              <span className="status-pill" style={{ color: '#64748B', background: '#f1f5f9', borderColor: '#E2E8F0' }}>
                Unmarked {unmarked}
              </span>
            )}
            <button type="button" className="btn-outline btn-with-icon section-assign-btn" onClick={() => markAll('PRESENT')}>
              <LuCheckCheck size={14} /> Mark all present
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading roster…</p>
        </div>
      ) : error ? null : roster.length === 0 ? (
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
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((r, idx) => (
                    <tr key={r.enrollmentId}>
                      <td className="td-idx">{idx + 1}</td>
                      <td>{r.student.name}</td>
                      <td className="td-email">{r.student.rollNo}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {STATUSES.map(s => {
                            const meta = STATUS_META[s];
                            const active = r.status === s;
                            return (
                              <button
                                key={s} type="button"
                                onClick={() => setStatus(r.enrollmentId, s)}
                                className="status-pill"
                                style={{
                                  fontFamily: 'inherit', cursor: 'pointer',
                                  color: active ? meta.color : '#94a3b8',
                                  background: active ? meta.bg : '#f8fafc',
                                  borderColor: active ? meta.border : '#e2e8f0',
                                }}
                              >
                                {meta.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn-primary" disabled={saving || !dirty} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
