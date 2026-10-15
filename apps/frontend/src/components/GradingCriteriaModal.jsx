import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LuX, LuRotateCcw } from 'react-icons/lu';

const toRows = (grades) => grades.map(g => ({ grade: g.grade, min: String(g.min), max: String(g.max) }));

// Rebuilds every grade from A's minimum by scaling the default scale's
// boundaries proportionally (A from 85 → 90 moves D from 50 → 53, etc.).
// Each lower grade keeps at least a 1% band, so ranges never collapse.
function scaleFromTop(topMin, defaults) {
  const last = defaults.length - 1;
  const factor = topMin / defaults[0].min;
  const mins = defaults.map((g, i) => (i === 0 ? topMin : i === last ? 0 : Math.round(g.min * factor)));
  for (let i = 1; i < last; i++) {
    mins[i] = Math.max(Math.min(mins[i], mins[i - 1] - 1), last - i);
  }
  return defaults.map((g, i) => ({ grade: g.grade, min: mins[i], max: i === 0 ? 100 : mins[i - 1] - 1 }));
}

// Percentage range for each letter grade, highest first. Ranges stay
// contiguous: changing A's minimum recalculates every other grade, and
// changing any other boundary moves just the neighbouring grade's edge.
// A's maximum (100) and F's minimum (0) are fixed.
// `onSubmit(grades)` should return a promise; a rejection's message is shown.
export default function GradingCriteriaModal({ grades, defaultGrades, onSubmit, onClose }) {
  const [rows, setRows] = useState(() => toRows(grades));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const last = rows.length - 1;

  const update = (i, field, value) => {
    setError('');
    setRows(prev => {
      const n = Number(value);
      // A's minimum needs room for a 1% band per lower grade above F's 0.
      if (i === 0 && field === 'min' && value.trim() !== '' && Number.isInteger(n) && n >= last && n <= 100) {
        return toRows(scaleFromTop(n, defaultGrades));
      }

      const next = prev.map(r => ({ ...r }));
      next[i][field] = value;
      if (value.trim() !== '' && Number.isInteger(n)) {
        if (field === 'min' && i < last) next[i + 1].max = String(n - 1);
        if (field === 'max' && i > 0)    next[i - 1].min = String(n + 1);
      }
      return next;
    });
  };

  const rowError = (r) => {
    const min = Number(r.min), max = Number(r.max);
    if (r.min.trim() === '' || r.max.trim() === '' || !Number.isInteger(min) || !Number.isInteger(max)) return 'Whole numbers only';
    if (min < 0 || max > 100) return 'Must be within 0–100';
    if (min > max) return 'Min is above max';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const bad = rows.find(rowError);
    if (bad) { setError(`${bad.grade}: ${rowError(bad).toLowerCase()}.`); return; }

    setSaving(true);
    setError('');
    try {
      await onSubmit(rows.map(r => ({ grade: r.grade, min: Number(r.min), max: Number(r.max) })));
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save grading criteria.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Grading Criteria</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 0.9rem' }}>
          Set A's minimum and the other grades are calculated automatically. You can still fine-tune any range; neighbouring grades adjust so there are no gaps.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="grading-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Grade</th>
                  <th style={{ textAlign: 'center' }}>Min %</th>
                  <th style={{ textAlign: 'center' }}>Max %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const invalid = !!rowError(r);
                  return (
                    <tr key={r.grade}>
                      <td className="grade-letter">{r.grade}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          className={`form-input${invalid ? ' has-error' : ''}`}
                          type="number" min="0" max="100" step="1"
                          style={{ width: 80, textAlign: 'center', padding: '0.35rem' }}
                          value={r.min} disabled={i === last}
                          onChange={e => update(i, 'min', e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          className={`form-input${invalid ? ' has-error' : ''}`}
                          type="number" min="0" max="100" step="1"
                          style={{ width: 80, textAlign: 'center', padding: '0.35rem' }}
                          value={r.max} disabled={i === 0}
                          onChange={e => update(i, 'max', e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="modal-actions">
            <button
              type="button" className="btn-outline btn-with-icon" style={{ marginRight: 'auto' }}
              onClick={() => { setRows(toRows(defaultGrades)); setError(''); }} disabled={saving}
            >
              <LuRotateCcw size={14} /> Reset to Default
            </button>
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Criteria'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
