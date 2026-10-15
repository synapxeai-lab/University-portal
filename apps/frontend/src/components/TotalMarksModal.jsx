import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LuX } from 'react-icons/lu';

// Asks for an assessment's total marks. `onSubmit(totalMarks)` should return a
// promise; a rejection's message is shown inside the modal.
export default function TotalMarksModal({ title, submitLabel, initialTotal = '', onSubmit, onClose }) {
  const [value, setValue] = useState(String(initialTotal));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const total = Number(value);
    if (value.trim() === '' || isNaN(total) || total <= 0) {
      setError('Enter total marks greater than 0.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(total);
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Total Marks <span style={{ color: '#b91c1c' }}>*</span></label>
            <input
              className={`form-input${error ? ' input-error' : ''}`}
              type="number" min="0" step="0.5" autoFocus
              value={value} onChange={e => { setValue(e.target.value); setError(''); }}
              placeholder="e.g. 10"
            />
            {error && <p className="field-error">{error}</p>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
