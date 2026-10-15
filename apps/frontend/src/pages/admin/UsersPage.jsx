import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  LuTriangleAlert, LuCircleCheck, LuX, LuSearch, LuEye, LuEyeOff,
  LuPencil, LuTrash2, LuLoaderCircle, LuUsers, LuPlus,
} from 'react-icons/lu';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import FilterPills from '../../components/FilterPills.jsx';

/* ── Role badge colours ──────────────────────────────────────────────────── */
const ROLE_COLORS = {
  ADMIN:   { color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', avatarBg: '#ede9fe', avatarText: '#5b21b6' },
  TEACHER: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', avatarBg: '#dbeafe', avatarText: '#1e40af' },
  STUDENT: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', avatarBg: '#dcfce7', avatarText: '#15803d' },
};

const ROLES = ['ADMIN', 'TEACHER', 'STUDENT'];

const EMPTY_FORM = { name: '', email: '', roleName: 'STUDENT', password: '', confirmPassword: '' };

/* ── Toast notification ──────────────────────────────────────────────────── */
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!msg) return null;
  const isErr = type === 'error';
  return createPortal(
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      background: isErr ? '#fff1f2' : '#f0fdf4',
      border: `1px solid ${isErr ? '#fecdd3' : '#bbf7d0'}`,
      color: isErr ? '#be123c' : '#15803d',
      padding: '0.75rem 1.1rem', borderRadius: 10,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      fontSize: '0.87rem', fontWeight: 600, maxWidth: 340,
      animation: 'fadeIn 0.2s ease',
    }}>
      {isErr ? <LuTriangleAlert size={17} /> : <LuCircleCheck size={17} />}
      <span>{msg}</span>
      <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'inherit' }}><LuX size={15} /></button>
    </div>,
    document.body
  );
}

/* ── Confirmation dialog ─────────────────────────────────────────────────── */
function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  if (!open) return null;
  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: '#1E293B' }}>Confirm Action</h3>
        <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '1.5rem', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── User form modal ─────────────────────────────────────────────────────── */
function UserModal({ mode, initial, onClose, onSaved }) {
  const [form,    setForm]    = useState(initial || EMPTY_FORM);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [apiErr,  setApiErr]  = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [showCPw, setShowCPw] = useState(false);

  const isEdit = mode === 'edit';

  // Create mode only: emails are picked from students/teachers who don't yet have a login,
  // so a new user can only ever be linked to a real, un-onboarded profile.
  const [students, setStudents]         = useState([]);
  const [teachers, setTeachers]         = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    setLoadingOptions(true);
    Promise.all([
      api.get('/students?unlinked=true'),
      api.get('/teachers?unlinked=true'),
    ]).then(([s, t]) => {
      if (cancelled) return;
      setStudents(s.students);
      setTeachers(t.teachers);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoadingOptions(false); });
    return () => { cancelled = true; };
  }, [isEdit]);

  const validate = () => {
    const e = {};
    if (!form.name.trim())          e.name  = 'Full name is required';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email.trim())         e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.roleName)             e.roleName = 'Role is required';
    if (!isEdit || form.password) {
      if (!isEdit && !form.password) e.password = 'Password is required';
      if (form.password && form.password.length < 6) e.password = 'Password must be at least 6 characters';
      if (form.password && form.password !== form.confirmPassword)
        e.confirmPassword = 'Passwords do not match';
    }
    return e;
  };

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setErrors(p => ({ ...p, [e.target.name]: '' }));
    setApiErr('');
  };

  // Switching role in create mode invalidates the previously chosen email
  // (a student email isn't a valid teacher email, and vice versa).
  const handleRoleChange = (e) => {
    const roleName = e.target.value;
    setForm(p => ({ ...p, roleName, ...(isEdit ? {} : { email: '' }) }));
    setErrors(p => ({ ...p, roleName: '', email: '' }));
    setApiErr('');
  };

  // Picking an email from the Student/Teacher dropdown also carries over their real name.
  const handleProfileSelect = (e) => {
    const email = e.target.value;
    const list = form.roleName === 'STUDENT' ? students : teachers;
    const match = list.find(p => p.email === email);
    setForm(p => ({ ...p, email, name: match ? match.name : p.name }));
    setErrors(p => ({ ...p, email: '', name: '' }));
    setApiErr('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setApiErr('');
    try {
      const payload = { name: form.name.trim(), email: form.email.trim(), roleName: form.roleName };
      if (!isEdit || form.password) {
        payload.password        = form.password;
        payload.confirmPassword = form.confirmPassword;
      }
      if (isEdit) {
        const res = await api.put(`/users/${initial.id}`, payload);
        onSaved(res.user, 'updated');
      } else {
        const res = await api.post('/users', payload);
        onSaved(res.user, 'created');
      }
      onClose();
    } catch (err) {
      setApiErr(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit User' : 'Create New User'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        {apiErr && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            <LuTriangleAlert size={16} /> {apiErr}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Name + Email */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name <span style={{ color: '#be123c' }}>*</span></label>
              <input
                className={`form-input${errors.name ? ' input-error' : ''}`}
                name="name" type="text" value={form.name}
                onChange={handleChange} placeholder="e.g. John Smith"
                autoComplete="off"
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Email Address <span style={{ color: '#be123c' }}>*</span></label>
              {!isEdit && (form.roleName === 'STUDENT' || form.roleName === 'TEACHER') ? (
                (() => {
                  const list = form.roleName === 'STUDENT' ? students : teachers;
                  const noun = form.roleName === 'STUDENT' ? 'student' : 'teacher';
                  return (
                    <>
                      <select
                        className={`form-input${errors.email ? ' input-error' : ''}`}
                        name="email" value={form.email} onChange={handleProfileSelect}
                        disabled={loadingOptions || list.length === 0}
                      >
                        <option value="">{loadingOptions ? 'Loading…' : `Select a ${noun}…`}</option>
                        {list.map(p => <option key={p.id} value={p.email}>{p.name} — {p.email}</option>)}
                      </select>
                      {!loadingOptions && list.length === 0 && (
                        <p className="field-hint">
                          Every {noun} already has a login, or none have been added yet.
                        </p>
                      )}
                    </>
                  );
                })()
              ) : (
                <input
                  className={`form-input${errors.email ? ' input-error' : ''}`}
                  name="email" type="email" value={form.email}
                  onChange={handleChange} placeholder="user@university.edu"
                  autoComplete="off"
                />
              )}
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>
          </div>

          {/* Role */}
          <div className="form-group">
              <label className="form-label">Role <span style={{ color: '#be123c' }}>*</span></label>
            <select
              className={`form-input${errors.roleName ? ' input-error' : ''}`}
              name="roleName" value={form.roleName} onChange={handleRoleChange}
            >
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
            </select>
            {errors.roleName && <p className="field-error">{errors.roleName}</p>}
          </div>

          {/* Password + Confirm Password */}
          <div className="form-row">
            <div className="form-group" style={isEdit && !form.password ? { gridColumn: '1 / -1' } : undefined}>
              <label className="form-label">
                Password{!isEdit && <span style={{ color: '#be123c' }}>*</span>}
              </label>
              <div className="form-input-wrap">
                <input
                  className={`form-input${errors.password ? ' input-error' : ''}`}
                  name="password" type={showPw ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  placeholder={isEdit ? 'Leave blank to keep unchanged' : 'Min. 6 characters'}
                  autoComplete="new-password"
                />
                <button type="button" className="form-input-action" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
                  {showPw ? <LuEyeOff size={16} /> : <LuEye size={16} />}
                </button>
              </div>
              {isEdit && <p className="field-hint">Leave blank to keep current password</p>}
              {errors.password && <p className="field-error">{errors.password}</p>}
            </div>

            {(!isEdit || form.password) && (
              <div className="form-group">
                <label className="form-label">
                  Confirm Password {!isEdit && <span style={{ color: '#be123c' }}>*</span>}
                </label>
                <div className="form-input-wrap">
                  <input
                    className={`form-input${errors.confirmPassword ? ' input-error' : ''}`}
                    name="confirmPassword" type={showCPw ? 'text' : 'password'}
                    value={form.confirmPassword} onChange={handleChange}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  <button type="button" className="form-input-action" onClick={() => setShowCPw(p => !p)} tabIndex={-1}>
                    {showCPw ? <LuEyeOff size={16} /> : <LuEye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ── Main Users Page ─────────────────────────────────────────────────────── */
export default function UsersPage() {
  const { user: currentUser } = useAuth();

  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState('');
  const [modal,       setModal]       = useState(null);   // null | 'create' | 'edit'
  const [editTarget,  setEditTarget]  = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [toast,       setToast]       = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  /* Lock body scroll + close on Escape while any modal/dialog is open */
  useEffect(() => {
    const isOpen = !!modal || !!deleteTarget;
    // Lock both <html> and <body> to fully prevent background scroll
    const prev = document.body.style.overflow;
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    const onKey = (e) => {
      if (e.key === 'Escape') {
        setModal(null);
        setEditTarget(null);
        setDeleteTarget(null);
      }
    };
    if (isOpen) window.addEventListener('keydown', onKey);

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [modal, deleteTarget]);

  /* Fetch users */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)     params.set('search', search);
      if (roleFilter) params.set('role',   roleFilter);
      const data = await api.get(`/users?${params}`);
      setUsers(data.users);
    } catch (err) {
      showToast(err.message || 'Failed to load users.', 'error');
    } finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* After save (create / edit) */
  const handleSaved = (savedUser, action) => {
    if (action === 'created') {
      setUsers(p => [savedUser, ...p]);
    } else {
      setUsers(p => p.map(u => u.id === savedUser.id ? savedUser : u));
    }
    showToast(`User ${savedUser.name} ${action} successfully.`);
  };

  /* Delete */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setUsers(p => p.filter(u => u.id !== deleteTarget.id));
      showToast(`User ${deleteTarget.name} deleted.`);
    } catch (err) {
      showToast(err.message || 'Failed to delete user.', 'error');
    } finally { setDeleteTarget(null); }
  };

  const openEdit = (u) => { setEditTarget(u); setModal('edit'); };

  /* Derived counts for header */
  const counts = { total: users.length, ...ROLES.reduce((acc, r) => ({ ...acc, [r]: users.filter(u => u.role.name === r).length }), {}) };

  return (
    <DashboardLayout pageTitle="User Management">

      {/* ── Toast ─────────────────────────────────────────────── */}
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />

      {/* ── Confirm delete ────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Create / Edit modal ───────────────────────────────── */}
      {modal === 'create' && (
        <UserModal mode="create" onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal === 'edit' && editTarget && (
        <UserModal
          mode="edit"
          initial={{ ...editTarget, roleName: editTarget.role.name, password: '', confirmPassword: '' }}
          onClose={() => { setModal(null); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">
            {counts.total} user{counts.total !== 1 ? 's' : ''} &nbsp;·&nbsp;
            {counts.ADMIN} admin{counts.ADMIN !== 1 ? 's' : ''} &nbsp;·&nbsp;
            {counts.TEACHER} teacher{counts.TEACHER !== 1 ? 's' : ''} &nbsp;·&nbsp;
            {counts.STUDENT} student{counts.STUDENT !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary btn-with-icon" onClick={() => setModal('create')} style={{ flexShrink: 0 }}>
          <LuPlus size={16} /> Create User
        </button>
      </div>

      {/* ── Filters bar ───────────────────────────────────────── */}
      <div className="filters-bar">
        <div className="search-wrap">
          <span className="search-icon"><LuSearch size={15} /></span>
          <input
            className="search-input"
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear"><LuX size={14} /></button>
          )}
        </div>
      </div>

      <FilterPills
        label="Role"
        value={roleFilter}
        onChange={setRoleFilter}
        options={[{ value: '', label: 'All' }, ...ROLES.map(r => ({ value: r, label: r.charAt(0) + r.slice(1).toLowerCase() }))]}
      />

      {/* ── Table card ────────────────────────────────────────── */}
      <div className="table-card">
        {loading ? (
          <div className="table-empty">
            <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
            <p>Loading users…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="table-empty">
            <LuUsers size={32} color="#cbd5e1" />
            <p>{search || roleFilter ? 'No users match your filters.' : 'No users found. Create the first one!'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => {
                  const rc = ROLE_COLORS[u.role.name] || ROLE_COLORS.STUDENT;
                  const isMe = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className={isMe ? 'row-me' : ''}>
                      <td className="td-idx">{idx + 1}</td>
                      <td>
                        <div className="td-user">
                          <div className="td-avatar" style={{ background: rc.avatarBg, color: rc.avatarText }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="td-name">{u.name}</span>
                            {isMe && <span className="badge-you">you</span>}
                          </div>
                        </div>
                      </td>
                      <td className="td-email">{u.email}</td>
                      <td>
                        <span className="role-pill" style={{ color: rc.color, background: rc.bg, borderColor: rc.border }}>
                          {u.role.name}
                        </span>
                      </td>
                      <td className="td-date">
                        {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <div className="td-actions">
                          <button className="btn-edit" onClick={() => openEdit(u)} title="Edit user">
                            <LuPencil size={13} /> Edit
                          </button>
                          <button
                            className="btn-del"
                            onClick={() => setDeleteTarget(u)}
                            disabled={isMe}
                            title={isMe ? 'You cannot delete your own account' : 'Delete user'}
                          >
                            <LuTrash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}