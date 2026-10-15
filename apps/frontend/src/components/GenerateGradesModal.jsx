import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuX } from 'react-icons/lu';
import { api } from '../services/api.js';
import { todayStr } from '../utils/attendance.js';

// Snapshots every student's current grade for one course (or all offered
// courses) and schedules when students can see it. `onGenerated(res)` runs on
// success with the API response. `apiBase` is '/marks' (admin) or '/teachers/me'
// (teacher, limited to their sections); `coursesUrl` lists the selectable courses.
export default function GenerateGradesModal({ apiBase = '/marks', coursesUrl = '/courses?status=ACTIVE', allLabel = 'All courses', initialCourseId = '', onGenerated, onClose }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(String(initialCourseId));
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Only offered courses have students to grade.
    api.get(coursesUrl).then(res => setCourses(res.courses)).catch(() => {});
  }, [coursesUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) { setError('Pick the date grades become visible.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`${apiBase}/grades/generate`, { courseId: courseId ? Number(courseId) : null, visibleFrom: date });
      onGenerated(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to generate grades.');
    } finally { setSaving(false); }
  };

  const isToday = date === todayStr();

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Generate Grades</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-mid)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Takes each student's current grade (including any grade you've changed) and publishes it to their
          transcript and marks. Generating again replaces the previous grades.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Course <span style={{ color: '#b91c1c' }}>*</span></label>
            <select className="form-input" value={courseId} onChange={e => setCourseId(e.target.value)}>
              <option value="">{allLabel}</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Visible to students from <span style={{ color: '#b91c1c' }}>*</span></label>
            <input className="form-input" type="date" value={date} min={todayStr()} onChange={e => { setDate(e.target.value); setError(''); }} />
            <p className="field-hint">
              {isToday ? 'Students will see their grades right away.' : 'Students will see their grades from this date.'}
            </p>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Generating…' : 'Generate Grades'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
