import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuPlus, LuX, LuCalendarClock, LuSettings2 } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import Toast from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { computeRegistrationYear } from '../../utils/registrationYear.js';

const SEMESTERS = ['SPRING', 'SUMMER', 'FALL'];
const SEMESTER_LABELS = { SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
const DEFAULT_CREDIT_LIMIT = 15;

const STATUS_META = {
  UPCOMING: { label: 'Upcoming', color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4' },
  ACTIVE:   { label: 'Active',   color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
  CLOSED:   { label: 'Closed',   color: '#64748B', bg: '#f1f5f9', border: '#E2E8F0' },
};

const EMPTY_FORM = { semester: 'SPRING', startDate: '', endDate: '' };

const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function StartRegistrationModal({ onClose, onStarted }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState('');

  const previewYear = computeRegistrationYear(form.semester);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: '' }));
    setApiErr('');
  };

  const validate = () => {
    const e = {};
    if (!form.semester) e.semester = 'Semester is required';
    if (!form.startDate) e.startDate = 'Start date is required';
    if (!form.endDate) e.endDate = 'End date is required';
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      e.endDate = 'End date must be after the start date';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setApiErr('');
    try {
      const res = await api.post('/registrations', form);
      onStarted(res.registration, res.message);
      onClose();
    } catch (err) {
      setApiErr(err.message || 'Failed to start registration.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Start Registration</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        {apiErr && <div className="alert alert-error">{apiErr}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Semester <span style={{ color: '#b91c1c' }}>*</span></label>
            <select
              className={`form-input${errors.semester ? ' input-error' : ''}`}
              name="semester" value={form.semester} onChange={handleChange}
            >
              {SEMESTERS.map(s => <option key={s} value={s}>{SEMESTER_LABELS[s]}</option>)}
            </select>
            {errors.semester && <p className="field-error">{errors.semester}</p>}
            <p className="field-hint">This will open registration for {SEMESTER_LABELS[form.semester]} {previewYear}.</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.startDate ? ' input-error' : ''}`}
                name="startDate" type="date" value={form.startDate}
                onChange={handleChange}
              />
              {errors.startDate && <p className="field-error">{errors.startDate}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">End Date <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.endDate ? ' input-error' : ''}`}
                name="endDate" type="date" value={form.endDate}
                onChange={handleChange}
              />
              {errors.endDate && <p className="field-error">{errors.endDate}</p>}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Starting…' : 'Start Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function BatchLimitsModal({ registration, onClose, onChanged }) {
  const [limits, setLimits] = useState(registration.limits || []);
  const [batch, setBatch] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!batch.trim() || !creditLimit) return;
    setSaving(true); setApiErr('');
    try {
      const res = await api.put(`/registrations/${registration.id}/limits`, {
        batch: batch.trim(), creditLimit: Number(creditLimit),
      });
      setLimits(prev => [...prev.filter(l => l.batch !== res.limit.batch), res.limit].sort((a, b) => a.batch.localeCompare(b.batch)));
      setBatch(''); setCreditLimit('');
      onChanged();
    } catch (err) {
      setApiErr(err.message || 'Failed to save credit limit.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (l) => {
    try {
      await api.delete(`/registrations/${registration.id}/limits/${encodeURIComponent(l.batch)}`);
      setLimits(prev => prev.filter(x => x.batch !== l.batch));
      onChanged();
    } catch (err) {
      setApiErr(err.message || 'Failed to remove credit limit.');
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Credit Limits — {SEMESTER_LABELS[registration.semester]} {registration.year}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        <p className="field-hint" style={{ marginBottom: '1rem' }}>
          Batches without an override use the default limit of {DEFAULT_CREDIT_LIMIT} credit hours.
        </p>

        {apiErr && <div className="alert alert-error">{apiErr}</div>}

        {limits.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {limits.map(l => (
              <div key={l.batch} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Batch {l.batch}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>{l.creditLimit} CR</span>
                  <button className="btn-icon-danger" onClick={() => handleDelete(l)} aria-label={`Remove limit for batch ${l.batch}`}>
                    <LuX size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label className="form-label">Batch</label>
            <input className="form-input" value={batch} onChange={e => setBatch(e.target.value)} placeholder="e.g. 2025" />
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: 110 }}>
            <label className="form-label">Credit Limit</label>
            <input className="form-input" type="number" min="1" max="60" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="15" />
          </div>
          <button type="submit" className="btn-primary" disabled={saving} style={{ flexShrink: 0, width: 'auto' }}>
            {saving ? 'Saving…' : 'Set'}
          </button>
        </form>

        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function RegistrationPage() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);
  const [limitsFor, setLimitsFor] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const fetchRegistrations = useCallback(async () => {
    try {
      const data = await api.get('/registrations');
      setRegistrations(data.registrations);
    } catch (err) {
      showToast(err.message || 'Failed to load registrations.', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  const handleStarted = (registration, message) => {
    fetchRegistrations();
    showToast(message);
  };

  return (
    <DashboardLayout pageTitle="Registration">
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      {showStart && (
        <StartRegistrationModal onClose={() => setShowStart(false)} onStarted={handleStarted} />
      )}
      {limitsFor && (
        <BatchLimitsModal
          registration={limitsFor}
          onClose={() => setLimitsFor(null)}
          onChanged={fetchRegistrations}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Registration</h1>
          <p className="page-subtitle">Open a registration window for students to enroll in a semester.</p>
        </div>
        <button className="btn-primary btn-with-icon" onClick={() => setShowStart(true)} style={{ flexShrink: 0 }}>
          <LuPlus size={16} /> Start Registration
        </button>
      </div>

      {loading ? (
        <div className="table-empty">
          <p>Loading registrations…</p>
        </div>
      ) : registrations.length === 0 ? (
        <div className="table-empty">
          <LuCalendarClock size={32} color="#cbd5e1" />
          <p>No registrations yet. Start one to open enrollment for a semester.</p>
        </div>
      ) : (
        <div className="sections-grid">
          {registrations.map(r => {
            const sm = STATUS_META[r.status] || STATUS_META.UPCOMING;
            return (
              <div key={r.id} className="section-detail-card">
                <div className="section-detail-header">
                  <span className="section-detail-badge">{SEMESTER_LABELS[r.semester]} {r.year}</span>
                  <span className="status-pill" style={{ color: sm.color, background: sm.bg, borderColor: sm.border }}>
                    {sm.label}
                  </span>
                </div>
                <p className="section-empty">{formatDate(r.startDate)} – {formatDate(r.endDate)}</p>
                <p className="section-empty">
                  {r.limits?.length > 0
                    ? `${r.limits.length} batch credit override${r.limits.length === 1 ? '' : 's'}`
                    : `Default limit: ${DEFAULT_CREDIT_LIMIT} CR for every batch`}
                </p>
                <button
                  className="btn-outline btn-with-icon"
                  style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                  onClick={() => setLimitsFor(r)}
                >
                  <LuSettings2 size={13} /> Credit Limits
                </button>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
