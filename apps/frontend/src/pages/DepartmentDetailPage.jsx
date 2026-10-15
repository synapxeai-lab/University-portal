import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LuArrowLeft, LuUser, LuUsers, LuBookOpen, LuClock, LuChevronRight, LuLoaderCircle, LuPlus, LuTrash2, LuX,
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

function AddSectionModal({ onClose, onAdded }) {
  const [batch, setBatch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!batch.trim()) { setError('Batch is required'); return; }
    setSaving(true);
    try {
      await onAdded(batch.trim());
    } catch (err) {
      setError(err.message || 'Failed to add section.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Section</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Batch <span style={{ color: '#b91c1c' }}>*</span></label>
            <input
              className={`form-input${error ? ' input-error' : ''}`}
              type="text" value={batch} placeholder="e.g. 2021" autoComplete="off"
              onChange={e => { setBatch(e.target.value); setError(''); }}
            />
            {error && <p className="field-error">{error}</p>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function DepartmentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = ROLE_BASE[user?.role?.name] || '/student';
  const isAdmin = user?.role?.name === 'ADMIN';

  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // section
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const fetchDepartment = useCallback(async () => {
    try {
      const data = await api.get(`/departments/${id}`);
      setDepartment(data.department);
    } catch (err) {
      setError(err.message || 'Failed to load department.');
      setDepartment(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { setLoading(true); setError(''); fetchDepartment(); }, [fetchDepartment]);

  const handleAddSection = async (batch) => {
    const res = await api.post('/sections', { departmentId: Number(id), batch });
    await fetchDepartment();
    setShowAddSection(false);
    showToast(res.message);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/sections/${deleteTarget.id}`);
      await fetchDepartment();
      showToast(`Section ${deleteTarget.label} deleted.`);
    } catch (err) {
      showToast(err.message || 'Failed to delete section.', 'error');
    } finally { setDeleteTarget(null); }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Department">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading department…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !department) {
    return (
      <DashboardLayout pageTitle="Department">
        <button className="back-link" onClick={() => navigate(`${base}/departments`)}>
          <LuArrowLeft size={15} /> Back to Departments
        </button>
        <div className="alert alert-error">{error || 'Department not found.'}</div>
      </DashboardLayout>
    );
  }

  const semesters = [...new Set(department.courses.map(c => c.semester))].sort((a, b) => a - b);

  return (
    <DashboardLayout pageTitle={department.name}>
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      {showAddSection && (
        <AddSectionModal onClose={() => setShowAddSection(false)} onAdded={handleAddSection} />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Section"
        message={`Are you sure you want to delete Section ${deleteTarget?.label}? Any enrolled students will be unenrolled and all per-course teacher assignments for this section will be removed. This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <button className="back-link" onClick={() => navigate(`${base}/departments`)}>
        <LuArrowLeft size={15} /> Back to Departments
      </button>

      <div className="dept-detail-header" style={{ borderColor: department.bg }}>
        <div className="dept-detail-icon" style={{ background: department.bg, color: department.color }}>
          {department.code}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>{department.name}</h1>
          <p className="page-subtitle" style={{ marginBottom: '0.6rem' }}>{department.description}</p>
          <div className="dept-detail-meta">
            <span><LuUser size={13} /> Head: {department.head}</span>
            <span><LuUsers size={13} /> {department.studentsCount} students</span>
            <span><LuBookOpen size={13} /> {department.courses.length} courses</span>
          </div>
        </div>
      </div>

      <div className="page-header">
        <h3 className="semester-heading" style={{ marginBottom: 0 }}>Sections</h3>
        {isAdmin && (
          <button className="btn-primary btn-with-icon" onClick={() => setShowAddSection(true)} style={{ flexShrink: 0 }}>
            <LuPlus size={16} /> Add Section
          </button>
        )}
      </div>

      {(department.sections || []).length === 0 ? (
        <div className="table-empty" style={{ marginBottom: '1.5rem' }}>
          <p>No sections yet. Add one to start enrolling students.</p>
        </div>
      ) : (
        <div className="sections-grid" style={{ marginBottom: '1.5rem' }}>
          {department.sections.map(section => {
            const assignedCount = (section.courseLinks || []).filter(l => l.teacher).length;
            const totalCount = (section.courseLinks || []).length;
            return (
              <div
                key={section.id}
                className="section-detail-card section-detail-card-link"
                onClick={() => navigate(`${base}/sections/${section.id}`)}
              >
                <div className="section-detail-header">
                  <span className="section-detail-badge">Section {section.label} · Batch {section.batch}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn-icon-danger"
                      title={`Delete Section ${section.label}`}
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(section); }}
                    >
                      <LuTrash2 size={13} />
                    </button>
                  )}
                </div>
                <p className="section-empty">{section._count?.students ?? 0} students enrolled</p>
                <p className="section-empty">{assignedCount} of {totalCount} courses have a teacher assigned</p>
              </div>
            );
          })}
        </div>
      )}

      <h3 className="semester-heading" style={{ marginBottom: '0.9rem' }}>Courses</h3>

      {semesters.map(sem => (
        <div key={sem} className="semester-block">
          <h3 className="semester-heading">{ordinal(sem)} Semester</h3>
          <div className="course-list">
            {department.courses.filter(c => c.semester === sem).map(c => {
              const sm = STATUS_META[c.status] || STATUS_META.ACTIVE;
              return (
                <button
                  key={c.id}
                  className="course-card course-card-link"
                  onClick={() => navigate(`${base}/courses/${c.id}`)}
                >
                  <div className="course-code-badge" style={{ color: department.color, background: department.bg }}>
                    {c.code}
                  </div>
                  <div className="course-info">
                    <p className="course-name">{c.name}</p>
                  </div>
                  <span className="status-pill" style={{ color: sm.color, background: sm.bg, borderColor: sm.border }}>
                    {sm.label}
                  </span>
                  <div className="course-credits">
                    <LuClock size={13} /> {c.creditHours} CR
                  </div>
                  <LuChevronRight size={16} className="course-card-chevron" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </DashboardLayout>
  );
}
