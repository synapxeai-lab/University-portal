import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuPlus, LuX, LuPencil, LuTrash2, LuSearch, LuGraduationCap, LuLoaderCircle } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';
import FilterPills from '../components/FilterPills.jsx';
import DetailsModal from '../components/DetailsModal.jsx';
import Toast from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { api } from '../services/api.js';

const EMPTY_FORM = {
  name: '', phone: '', email: '', address: '', cnic: '', qualification: '', departmentId: '',
  guardianName: '', guardianContact: '', guardianCnic: '',
};

function TeacherModal({ departments, initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial
    ? {
        name: initial.name, phone: initial.phone, email: initial.email, address: initial.address,
        cnic: initial.cnic, qualification: initial.qualification, departmentId: String(initial.departmentId),
        guardianName: initial.guardianName,
        guardianContact: initial.guardianContact, guardianCnic: initial.guardianCnic,
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

  const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Teacher name is required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.address.trim()) e.address = 'Address is required';
    if (!cnicRegex.test(form.cnic.trim())) e.cnic = 'CNIC must be in format 12345-1234567-1';
    if (!form.qualification.trim()) e.qualification = 'Qualification is required';
    if (!form.departmentId) e.departmentId = 'Department is required';
    if (!form.guardianName.trim()) e.guardianName = 'Guardian name is required';
    if (!form.guardianContact.trim()) e.guardianContact = 'Guardian contact is required';
    if (!cnicRegex.test(form.guardianCnic.trim())) e.guardianCnic = 'Guardian CNIC must be in format 12345-1234567-1';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setApiErr('');
    try {
      const payload = {
        ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])),
        departmentId: Number(form.departmentId),
      };
      if (isEdit) {
        const res = await api.put(`/teachers/${initial.id}`, payload);
        onSaved(res.teacher, 'updated');
      } else {
        const res = await api.post('/teachers', payload);
        onSaved(res.teacher, 'added');
      }
      onClose();
    } catch (err) {
      setApiErr(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Teacher' : 'Add Teacher'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        {apiErr && <div className="alert alert-error">{apiErr}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Teacher Name <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.name ? ' input-error' : ''}`}
                name="name" type="text" value={form.name}
                onChange={handleChange} placeholder="e.g. Dr. Ayesha Khan" autoComplete="off"
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Teacher Phone Number <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.phone ? ' input-error' : ''}`}
                name="phone" type="text" value={form.phone}
                onChange={handleChange} placeholder="e.g. 0300-1234567" autoComplete="off"
              />
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Teacher Email <span style={{ color: '#b91c1c' }}>*</span></label>
            <input
              className={`form-input${errors.email ? ' input-error' : ''}`}
              name="email" type="email" value={form.email}
              onChange={handleChange} placeholder="teacher@example.com" autoComplete="off"
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Address <span style={{ color: '#b91c1c' }}>*</span></label>
            <input
              className={`form-input${errors.address ? ' input-error' : ''}`}
              name="address" type="text" value={form.address}
              onChange={handleChange} placeholder="e.g. House 12, Street 4, F-8, Islamabad" autoComplete="off"
            />
            {errors.address && <p className="field-error">{errors.address}</p>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">CNIC <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.cnic ? ' input-error' : ''}`}
                name="cnic" type="text" value={form.cnic}
                onChange={handleChange} placeholder="e.g. 61101-1234567-1" autoComplete="off"
              />
              {errors.cnic && <p className="field-error">{errors.cnic}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Qualification <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.qualification ? ' input-error' : ''}`}
                name="qualification" type="text" value={form.qualification}
                onChange={handleChange} placeholder="e.g. PhD in Computer Science" autoComplete="off"
              />
              {errors.qualification && <p className="field-error">{errors.qualification}</p>}
            </div>
          </div>

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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Guardian Name <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.guardianName ? ' input-error' : ''}`}
                name="guardianName" type="text" value={form.guardianName}
                onChange={handleChange} placeholder="e.g. Muhammad Khan" autoComplete="off"
              />
              {errors.guardianName && <p className="field-error">{errors.guardianName}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Guardian Contact <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.guardianContact ? ' input-error' : ''}`}
                name="guardianContact" type="text" value={form.guardianContact}
                onChange={handleChange} placeholder="e.g. 0301-1234567" autoComplete="off"
              />
              {errors.guardianContact && <p className="field-error">{errors.guardianContact}</p>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Guardian CNIC <span style={{ color: '#b91c1c' }}>*</span></label>
            <input
              className={`form-input${errors.guardianCnic ? ' input-error' : ''}`}
              name="guardianCnic" type="text" value={form.guardianCnic}
              onChange={handleChange} placeholder="e.g. 61101-7654321-1" autoComplete="off"
            />
            {errors.guardianCnic && <p className="field-error">{errors.guardianCnic}</p>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Teacher')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function TeacherDetails({ teacher: t, onEdit, onClose }) {
  const assignments = t.sectionCourses || [];
  return (
    <DetailsModal
      title={t.name}
      subtitle={t.qualification}
      badge={t.department && (
        <span className="dept-badge-pill" style={{ color: t.department.color, background: t.department.bg }}>
          {t.department.name}
        </span>
      )}
      sections={[
        {
          heading: 'Personal Information',
          fields: [
            ['Full Name', t.name],
            ['CNIC', t.cnic],
            ['Qualification', t.qualification],
            ['Department', t.department && `${t.department.name} (${t.department.code})`],
          ],
        },
        {
          heading: 'Contact',
          fields: [
            ['Email', t.email],
            ['Phone', t.phone],
            ['Address', t.address],
          ],
        },
        {
          heading: 'Guardian',
          fields: [
            ['Guardian Name', t.guardianName],
            ['Guardian Contact', t.guardianContact],
            ['Guardian CNIC', t.guardianCnic],
          ],
        },
        {
          heading: `Teaching Assignments (${assignments.length})`,
          fields: [[
            'Courses & Sections',
            assignments.length === 0 ? 'No course assigned' : (
              <ul className="details-list">
                {assignments.map(sc => (
                  <li key={sc.id}>
                    <strong>{sc.course.code}</strong> — {sc.course.name}
                    <span className="td-date"> · Section {sc.section.label}, Batch {sc.section.batch}</span>
                  </li>
                ))}
              </ul>
            ),
          ]],
        },
      ]}
      onEdit={onEdit}
      onClose={onClose}
    />
  );
}

export default function TeachersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role?.name === 'ADMIN';

  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const data = await api.get(`/teachers?${params}`);
      setTeachers(data.teachers);
    } catch (err) {
      showToast(err.message || 'Failed to load teachers.', 'error');
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  useEffect(() => {
    api.get('/departments').then(data => setDepartments(data.departments)).catch(() => {});
  }, []);

  const filtered = useMemo(
    () => (departmentId ? teachers.filter(t => String(t.departmentId) === departmentId) : teachers),
    [teachers, departmentId],
  );

  const handleSaved = (teacher, action) => {
    fetchTeachers();
    showToast(`Teacher ${teacher.name} ${action} successfully.`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/teachers/${deleteTarget.id}`);
      setTeachers(p => p.filter(t => t.id !== deleteTarget.id));
      showToast(`Teacher ${deleteTarget.name} deleted.`);
    } catch (err) {
      showToast(err.message || 'Failed to delete teacher.', 'error');
    } finally { setDeleteTarget(null); }
  };

  return (
    <DashboardLayout pageTitle="Teachers">
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Teacher"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
      {viewTarget && (
        <TeacherDetails
          teacher={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={isAdmin ? () => { setEditTarget(viewTarget); setViewTarget(null); setModal('edit'); } : undefined}
        />
      )}
      {modal === 'add' && (
        <TeacherModal departments={departments} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal === 'edit' && editTarget && (
        <TeacherModal
          departments={departments}
          initial={editTarget}
          onClose={() => { setModal(null); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="page-subtitle">{filtered.length} teacher{filtered.length === 1 ? '' : 's'}</p>
        </div>
        {isAdmin && (
          <button className="btn-primary btn-with-icon" onClick={() => setModal('add')} style={{ flexShrink: 0 }}>
            <LuPlus size={16} /> Add Teacher
          </button>
        )}
      </div>

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

      <div className="filter-pills-row">
        <FilterPills
          label="Department"
          value={departmentId}
          onChange={setDepartmentId}
          options={[
            { value: '', label: 'All', count: teachers.length },
            ...departments.map(d => ({ value: String(d.id), label: d.name, count: teachers.filter(t => t.departmentId === d.id).length })),
          ]}
        />
      </div>

      <div className="table-card">
        {loading ? (
          <div className="table-empty">
            <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
            <p>Loading teachers…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <LuGraduationCap size={26} color="#cbd5e1" />
            <p>{teachers.length === 0 && !search ? 'No teachers added yet.' : 'No teachers match your filters.'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Teacher</th>
                  <th>Department</th>
                  <th>Courses</th>
                  <th>Contact</th>
                  <th>CNIC</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const courses = [...new Map((t.sectionCourses || []).map(sc => [sc.course.id, sc.course])).values()];
                  return (
                    <tr key={t.id} className="row-clickable" onClick={() => setViewTarget(t)} title="View details">
                      <td className="td-idx">{i + 1}</td>
                      <td>
                        <div className="td-name">{t.name}</div>
                        <div className="td-date">{t.qualification}</div>
                      </td>
                      <td>
                        {t.department ? (
                          <span className="dept-badge-pill" style={{ color: t.department.color, background: t.department.bg }}>
                            {t.department.code}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {courses.length === 0
                          ? <span className="td-date">No course assigned</span>
                          : courses.map(c => (
                            <div key={c.id} style={{ whiteSpace: 'nowrap' }} title={c.name}>
                              <strong>{c.code}</strong><span className="td-date"> · {c.name}</span>
                            </div>
                          ))}
                      </td>
                      <td>
                        <div className="td-email">{t.email}</div>
                        <div className="td-date">{t.phone}</div>
                      </td>
                      <td className="td-date" style={{ whiteSpace: 'nowrap' }}>{t.cnic}</td>
                      {isAdmin && (
                        <td onClick={e => e.stopPropagation()}>
                          <div className="td-actions">
                            <button className="btn-edit" onClick={() => { setEditTarget(t); setModal('edit'); }} title="Edit teacher">
                              <LuPencil size={13} /> <span>Edit</span>
                            </button>
                            <button className="btn-del" onClick={() => setDeleteTarget(t)} title="Delete teacher">
                              <LuTrash2 size={13} /> <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      )}
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
