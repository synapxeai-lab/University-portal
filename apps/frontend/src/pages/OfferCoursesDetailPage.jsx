import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LuArrowLeft, LuBookMarked, LuUsers, LuClock, LuX, LuPlus, LuLoaderCircle,
} from 'react-icons/lu';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';
import Toast from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { api } from '../services/api.js';
import { ordinal } from '../utils/ordinal.js';
import { ROLE_BASE } from '../utils/roleBase.js';

const STATUS_META = {
  ACTIVE:   { label: 'Active',   color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
  INACTIVE: { label: 'Inactive', color: '#64748B', bg: '#f1f5f9', border: '#E2E8F0' },
};

function AddOfferingModal({ availableCourses, onClose, onOffered }) {
  const [courseId, setCourseId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseId) { setError('Course is required'); return; }
    setSaving(true);
    try {
      await onOffered(Number(courseId));
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to offer course.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Offer Course</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Course Code <span style={{ color: '#b91c1c' }}>*</span></label>
            {availableCourses.length === 0 ? (
              <p className="field-hint">Every course in this department is already offered to this batch.</p>
            ) : (
              <select
                className={`form-input${error ? ' input-error' : ''}`}
                value={courseId} onChange={e => { setCourseId(e.target.value); setError(''); }}
              >
                <option value="">Select a course…</option>
                {availableCourses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            )}
            {error && <p className="field-error">{error}</p>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || availableCourses.length === 0}>
              {saving ? 'Offering…' : 'Offer Course'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function OfferCoursesDetailPage() {
  const { departmentId, batch: batchParam } = useParams();
  const batch = decodeURIComponent(batchParam);
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = ROLE_BASE[user?.role?.name] || '/student';
  const isAdmin = user?.role?.name === 'ADMIN';

  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOffer, setShowOffer] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null); // course
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const fetchDepartment = useCallback(async () => {
    try {
      const data = await api.get(`/departments/${departmentId}`);
      setDepartment(data.department);
    } catch (err) {
      setError(err.message || 'Failed to load department.');
      setDepartment(null);
    } finally { setLoading(false); }
  }, [departmentId]);

  useEffect(() => { setLoading(true); setError(''); fetchDepartment(); }, [fetchDepartment]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Offer Courses">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading batch…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !department) {
    return (
      <DashboardLayout pageTitle="Offer Courses">
        <button className="back-link" onClick={() => navigate(`${base}/offer-courses`)}>
          <LuArrowLeft size={15} /> Back to Offer Courses
        </button>
        <div className="alert alert-error">{error || 'Department not found.'}</div>
      </DashboardLayout>
    );
  }

  const batchSections = (department.sections || []).filter(s => s.batch === batch);

  if (batchSections.length === 0) {
    return (
      <DashboardLayout pageTitle="Offer Courses">
        <button className="back-link" onClick={() => navigate(`${base}/offer-courses`)}>
          <LuArrowLeft size={15} /> Back to Offer Courses
        </button>
        <div className="alert alert-error">Batch {batch} has no sections in {department.name}.</div>
      </DashboardLayout>
    );
  }

  const offeredCourses = [...new Map(
    batchSections.flatMap(s => (s.courseLinks || []).map(l => [l.course.id, l.course]))
  ).values()].sort((a, b) => a.code.localeCompare(b.code));

  const offeredIds = new Set(offeredCourses.map(c => c.id));
  const availableCourses = (department.courses || []).filter(c => !offeredIds.has(c.id));

  const handleOffer = async (courseId) => {
    const res = await api.post('/sections/offer', { departmentId: Number(departmentId), courseId, batch });
    await fetchDepartment();
    showToast(res.message);
  };

  const handleCancelOffer = async () => {
    if (!cancelTarget) return;
    try {
      const res = await api.delete('/sections/offer', { departmentId: Number(departmentId), courseId: cancelTarget.id, batch });
      await fetchDepartment();
      showToast(res.message);
    } catch (err) {
      showToast(err.message || 'Failed to cancel offering.', 'error');
    } finally { setCancelTarget(null); }
  };

  return (
    <DashboardLayout pageTitle={`Batch ${batch} · ${department.code}`}>
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      {showOffer && (
        <AddOfferingModal availableCourses={availableCourses} onClose={() => setShowOffer(false)} onOffered={handleOffer} />
      )}
      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Course Offering"
        message={`Are you sure you want to stop offering ${cancelTarget?.code} to Batch ${batch}? Any teacher assignments for this course in that batch's sections will be removed.`}
        onConfirm={handleCancelOffer}
        onCancel={() => setCancelTarget(null)}
      />

      <button className="back-link" onClick={() => navigate(`${base}/offer-courses`)}>
        <LuArrowLeft size={15} /> Back to Offer Courses
      </button>

      <div className="dept-detail-header" style={{ borderColor: department.bg }}>
        <div className="dept-detail-icon" style={{ background: department.bg, color: department.color }}>
          {department.code}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>Batch {batch} · {department.name}</h1>
          <p className="page-subtitle" style={{ marginBottom: '0.6rem' }}>Courses offered to every section of this batch.</p>
          <div className="dept-detail-meta">
            <span><LuUsers size={13} /> {batchSections.length} section{batchSections.length !== 1 ? 's' : ''}</span>
            <span><LuBookMarked size={13} /> {offeredCourses.length} of {department.courses.length} courses offered</span>
          </div>
        </div>
      </div>

      <div className="page-header">
        <h3 className="semester-heading" style={{ marginBottom: 0 }}>Offered Courses</h3>
        {isAdmin && (
          <button className="btn-primary btn-with-icon" onClick={() => setShowOffer(true)} style={{ flexShrink: 0 }}>
            <LuPlus size={16} /> Offer Courses
          </button>
        )}
      </div>

      {offeredCourses.length === 0 ? (
        <div className="table-empty">
          <p>No courses offered to this batch yet.</p>
        </div>
      ) : (
        <div className="course-list">
          {offeredCourses.map(c => {
            const sm = STATUS_META[c.status] || STATUS_META.ACTIVE;
            return (
              <div key={c.id} className="course-row">
                <button
                  className="course-row-main"
                  onClick={() => navigate(`${base}/courses/${c.id}`)}
                >
                  <div className="course-code-badge" style={{ color: department.color, background: department.bg }}>
                    {c.code}
                  </div>
                  <div className="course-info">
                    <p className="course-name">{c.name}</p>
                    <div className="course-row-meta">
                      <span className="course-row-semester">{ordinal(c.semester)} Semester</span>
                    </div>
                  </div>
                  <span className="status-pill" style={{ color: sm.color, background: sm.bg, borderColor: sm.border }}>
                    {sm.label}
                  </span>
                  <div className="course-credits">
                    <LuClock size={13} /> {c.creditHours} CR
                  </div>
                </button>
                {isAdmin && (
                  <div className="course-actions">
                    <button className="btn-del" onClick={() => setCancelTarget(c)} title="Cancel offering">
                      <LuX size={13} /> <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
