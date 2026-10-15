import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { LuPlus, LuX, LuLoaderCircle } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';
import Toast from '../components/Toast.jsx';
import { api } from '../services/api.js';
import { ROLE_BASE } from '../utils/roleBase.js';

function OfferCourseModal({ departments, onClose, onOffered }) {
  const firstDept = departments[0] || null;
  const [departmentId, setDepartmentId] = useState(firstDept ? String(firstDept.id) : '');
  const [courseId, setCourseId] = useState('');
  const [batch, setBatch] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState('');

  const department = departments.find(d => String(d.id) === departmentId) || null;
  const courses = department?.courses || [];
  const batches = [...new Set((department?.sections || []).map(s => s.batch))];

  const handleDepartmentChange = (e) => {
    setDepartmentId(e.target.value);
    setCourseId('');
    setBatch('');
    setErrors({});
    setApiErr('');
  };

  const validate = () => {
    const e = {};
    if (!departmentId) e.departmentId = 'Department is required';
    if (!courseId) e.courseId = 'Course is required';
    if (!batch) e.batch = 'Batch is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setApiErr('');
    try {
      await onOffered({ departmentId: Number(departmentId), courseId: Number(courseId), batch });
      onClose();
    } catch (err) {
      setApiErr(err.message || 'Failed to offer course.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Offer Course</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        {apiErr && <div className="alert alert-error">{apiErr}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Department <span style={{ color: '#b91c1c' }}>*</span></label>
            {departments.length === 0 ? (
              <p className="field-hint">No departments found. Add one from the Departments page first.</p>
            ) : (
              <select
                className={`form-input${errors.departmentId ? ' input-error' : ''}`}
                value={departmentId} onChange={handleDepartmentChange}
              >
                {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
              </select>
            )}
            {errors.departmentId && <p className="field-error">{errors.departmentId}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Course Code <span style={{ color: '#b91c1c' }}>*</span></label>
            {department && courses.length === 0 ? (
              <p className="field-hint">This department has no courses yet.</p>
            ) : (
              <select
                className={`form-input${errors.courseId ? ' input-error' : ''}`}
                value={courseId} onChange={e => { setCourseId(e.target.value); setErrors(p => ({ ...p, courseId: '' })); }}
                disabled={courses.length === 0}
              >
                <option value="">Select a course…</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            )}
            {errors.courseId && <p className="field-error">{errors.courseId}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Batch <span style={{ color: '#b91c1c' }}>*</span></label>
            {department && batches.length === 0 ? (
              <p className="field-hint">This department has no sections yet. Add a section (with a batch) from the Department page first.</p>
            ) : (
              <select
                className={`form-input${errors.batch ? ' input-error' : ''}`}
                value={batch} onChange={e => { setBatch(e.target.value); setErrors(p => ({ ...p, batch: '' })); }}
                disabled={batches.length === 0}
              >
                <option value="">Select a batch…</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            {errors.batch && <p className="field-error">{errors.batch}</p>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || courses.length === 0 || batches.length === 0}>
              {saving ? 'Offering…' : 'Offer Course'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function OfferCoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = ROLE_BASE[user?.role?.name] || '/student';
  const isAdmin = user?.role?.name === 'ADMIN';

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOffer, setShowOffer] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await api.get('/departments');
      setDepartments(data.departments);
    } catch (err) {
      showToast(err.message || 'Failed to load departments.', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  const handleOffer = async ({ departmentId, courseId, batch }) => {
    const res = await api.post('/sections/offer', { departmentId, courseId, batch });
    await fetchDepartments();
    showToast(res.message);
  };

  // One card per Department + Batch combination — courses offered are shown on the detail page.
  const rows = departments.flatMap(d => {
    const batches = [...new Set((d.sections || []).map(s => s.batch))];
    return batches.map(batch => {
      const batchSections = d.sections.filter(s => s.batch === batch);
      const offeredCourseIds = new Set();
      batchSections.forEach(s => (s.courseLinks || []).forEach(l => offeredCourseIds.add(l.course.id)));
      return {
        department: d,
        batch,
        sectionCount: batchSections.length,
        offeredCount: offeredCourseIds.size,
      };
    });
  });

  return (
    <DashboardLayout pageTitle="Offer Courses">
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      {showOffer && (
        <OfferCourseModal departments={departments} onClose={() => setShowOffer(false)} onOffered={handleOffer} />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Offer Courses</h1>
          <p className="page-subtitle">Link a course to every section of a department's batch.</p>
        </div>
        {isAdmin && (
          <button className="btn-primary btn-with-icon" onClick={() => setShowOffer(true)} style={{ flexShrink: 0 }}>
            <LuPlus size={16} /> Offer Courses
          </button>
        )}
      </div>

      {loading ? (
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading offerings…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="table-empty">
          <p>No batches yet. Add a section from a Department page to create one.</p>
        </div>
      ) : (
        <div className="sections-grid">
          {rows.map(({ department, batch, sectionCount, offeredCount }) => (
            <div
              key={`${department.id}-${batch}`}
              className="section-detail-card section-detail-card-link"
              onClick={() => navigate(`${base}/offer-courses/${department.id}/${encodeURIComponent(batch)}`)}
            >
              <div className="section-detail-header">
                <span className="section-detail-badge">Batch {batch} · {department.code}</span>
              </div>
              <p className="section-empty">
                {sectionCount} section{sectionCount !== 1 ? 's' : ''} · {offeredCount} course{offeredCount !== 1 ? 's' : ''} offered
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
