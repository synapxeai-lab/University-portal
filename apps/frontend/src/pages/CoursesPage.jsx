import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  LuPlus, LuX, LuPencil, LuTrash2, LuChevronRight, LuClock, LuSearch, LuLoaderCircle,
} from 'react-icons/lu';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';
import FilterPills from '../components/FilterPills.jsx';
import Toast from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { api } from '../services/api.js';
import { ordinal } from '../utils/ordinal.js';
import { ROLE_BASE } from '../utils/roleBase.js';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const EMPTY_FORM = { departmentId: '', name: '', code: '', semester: '1', creditHours: '3' };

const STATUS_META = {
  ACTIVE:   { label: 'Active',   color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
  INACTIVE: { label: 'Inactive', color: '#64748B', bg: '#f1f5f9', border: '#E2E8F0' },
};

function CourseModal({ departments, initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial
    ? {
        departmentId: String(initial.departmentId),
        name: initial.name,
        code: initial.code,
        semester: String(initial.semester),
        creditHours: String(initial.creditHours),
      }
    : { ...EMPTY_FORM, departmentId: departments[0] ? String(departments[0].id) : '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState('');

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: '' }));
    setApiErr('');
  };

  const validate = () => {
    const e = {};
    if (!form.departmentId) e.departmentId = 'Department is required';
    if (!form.name.trim()) e.name = 'Course name is required';
    if (!form.code.trim()) e.code = 'Course code is required';
    if (!form.semester) e.semester = 'Semester is required';
    if (!form.creditHours || Number(form.creditHours) < 1) e.creditHours = 'Enter a valid credit hours value';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setApiErr('');
    try {
      const payload = {
        departmentId: Number(form.departmentId),
        name:         form.name.trim(),
        code:         form.code.trim().toUpperCase(),
        semester:     Number(form.semester),
        creditHours:  Number(form.creditHours),
      };
      if (isEdit) {
        const res = await api.put(`/courses/${initial.id}`, payload);
        onSaved(res.course, 'updated');
      } else {
        const res = await api.post('/courses', payload);
        onSaved(res.course, 'created');
      }
      onClose();
    } catch (err) {
      setApiErr(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Course' : 'Add Course'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        {apiErr && <div className="alert alert-error">{apiErr}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Department <span style={{ color: '#b91c1c' }}>*</span></label>
            <select
              className={`form-input${errors.departmentId ? ' input-error' : ''}`}
              name="departmentId" value={form.departmentId} onChange={handleChange}
            >
              {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
            </select>
            {errors.departmentId && <p className="field-error">{errors.departmentId}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Course Name <span style={{ color: '#b91c1c' }}>*</span></label>
            <input
              className={`form-input${errors.name ? ' input-error' : ''}`}
              name="name" type="text" value={form.name}
              onChange={handleChange} placeholder="e.g. Introduction to Programming"
              autoComplete="off"
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Course Code <span style={{ color: '#b91c1c' }}>*</span></label>
            <input
              className={`form-input${errors.code ? ' input-error' : ''}`}
              name="code" type="text" value={form.code}
              onChange={handleChange} placeholder="e.g. CS901"
              autoComplete="off"
            />
            {errors.code && <p className="field-error">{errors.code}</p>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Semester <span style={{ color: '#b91c1c' }}>*</span></label>
              <select
                className={`form-input${errors.semester ? ' input-error' : ''}`}
                name="semester" value={form.semester} onChange={handleChange}
              >
                {SEMESTERS.map(s => <option key={s} value={s}>{ordinal(s)} Semester</option>)}
              </select>
              {errors.semester && <p className="field-error">{errors.semester}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Credit Hours <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.creditHours ? ' input-error' : ''}`}
                name="creditHours" type="number" min="1" max="6" value={form.creditHours}
                onChange={handleChange} placeholder="e.g. 3"
              />
              {errors.creditHours && <p className="field-error">{errors.creditHours}</p>}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Course')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function CoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = ROLE_BASE[user?.role?.name] || '/student';
  const isAdmin = user?.role?.name === 'ADMIN';

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  useEffect(() => {
    api.get('/departments').then(data => setDepartments(data.departments)).catch(() => {});
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (deptFilter) params.set('departmentId', deptFilter);
      const data = await api.get(`/courses?${params}`);
      setCourses(data.courses);
    } catch (err) {
      showToast(err.message || 'Failed to load courses.', 'error');
    } finally { setLoading(false); }
  }, [search, deptFilter]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleSaved = (course, action) => {
    fetchCourses();
    showToast(`Course ${course.name} ${action} successfully.`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/courses/${deleteTarget.id}`);
      setCourses(p => p.filter(c => c.id !== deleteTarget.id));
      showToast(`Course ${deleteTarget.name} deleted.`);
    } catch (err) {
      showToast(err.message || 'Failed to delete course.', 'error');
    } finally { setDeleteTarget(null); }
  };

  return (
    <DashboardLayout pageTitle="Courses">
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Course"
        message={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.code})? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
      {modal === 'add' && (
        <CourseModal departments={departments} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal === 'edit' && editTarget && (
        <CourseModal
          departments={departments}
          initial={editTarget}
          onClose={() => { setModal(null); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="page-subtitle">{courses.length} courses across {departments.length} departments</p>
        </div>
        {isAdmin && (
          <button className="btn-primary btn-with-icon" onClick={() => setModal('add')} style={{ flexShrink: 0 }}>
            <LuPlus size={16} /> Add Course
          </button>
        )}
      </div>

      <div className="filters-bar">
        <div className="search-wrap">
          <span className="search-icon"><LuSearch size={15} /></span>
          <input
            className="search-input"
            type="text"
            placeholder="Search by course name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear"><LuX size={14} /></button>
          )}
        </div>
      </div>

      <FilterPills
        label="Department"
        value={deptFilter}
        onChange={setDeptFilter}
        options={[{ value: '', label: 'All' }, ...departments.map(d => ({ value: String(d.id), label: d.name }))]}
      />

      {loading ? (
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading courses…</p>
        </div>
      ) : (
        <div className="course-list">
          {courses.length === 0 ? (
            <div className="table-empty">
              <p>No courses match your filters.</p>
            </div>
          ) : courses.map(c => {
            const sm = STATUS_META[c.status] || STATUS_META.ACTIVE;
            return (
              <div key={c.id} className="course-row">
                <button
                  className="course-row-main"
                  onClick={() => navigate(`${base}/courses/${c.id}`)}
                >
                  <div className="course-code-badge" style={{ color: c.department.color, background: c.department.bg }}>
                    {c.code}
                  </div>
                  <div className="course-info">
                    <p className="course-name">{c.name}</p>
                    <div className="course-row-meta">
                      <span className="dept-badge-pill" style={{ color: c.department.color, background: c.department.bg }}>
                        {c.department.name}
                      </span>
                      <span className="course-row-semester">{ordinal(c.semester)} Semester</span>
                    </div>
                  </div>
                  <span className="status-pill" style={{ color: sm.color, background: sm.bg, borderColor: sm.border }}>
                    {sm.label}
                  </span>
                  <div className="course-credits">
                    <LuClock size={13} /> {c.creditHours} CR
                  </div>
                  <LuChevronRight size={16} className="course-card-chevron" />
                </button>
                {isAdmin && (
                  <div className="course-actions">
                    <button className="btn-edit" onClick={() => { setEditTarget(c); setModal('edit'); }} title="Edit course">
                      <LuPencil size={13} /> <span>Edit</span>
                    </button>
                    <button className="btn-del" onClick={() => setDeleteTarget(c)} title="Delete course">
                      <LuTrash2 size={13} /> <span>Delete</span>
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
