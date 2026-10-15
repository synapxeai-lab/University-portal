import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuPlus, LuX, LuPencil, LuTrash2, LuSearch, LuUser, LuLoaderCircle } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';
import FilterPills from '../components/FilterPills.jsx';
import DetailsModal from '../components/DetailsModal.jsx';
import Toast from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { api } from '../services/api.js';

const EMPTY_FORM = {
  name: '', rollNo: '', email: '', departmentId: '', batch: '', section: '', cnic: '', phone: '', address: '',
  guardianName: '', guardianContact: '', guardianCnic: '',
};

function StudentModal({ departments, initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial
    ? {
        name: initial.name, rollNo: initial.rollNo, email: initial.email,
        departmentId: String(initial.departmentId), batch: initial.batch, section: initial.section,
        cnic: initial.cnic, phone: initial.phone, address: initial.address, guardianName: initial.guardianName,
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
    if (!form.name.trim()) e.name = 'Student name is required';
    if (!form.rollNo.trim()) e.rollNo = 'Roll number is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.departmentId) e.departmentId = 'Department is required';
    if (!form.batch.trim()) e.batch = 'Batch is required';
    if (!form.section.trim()) e.section = 'Section is required';
    if (!cnicRegex.test(form.cnic.trim())) e.cnic = 'CNIC must be in format 12345-1234567-1';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (!form.address.trim()) e.address = 'Address is required';
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
        const res = await api.put(`/students/${initial.id}`, payload);
        onSaved(res.student, 'updated');
      } else {
        const res = await api.post('/students', payload);
        onSaved(res.student, 'added');
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
          <h2 className="modal-title">{isEdit ? 'Edit Student' : 'Add Student'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        {apiErr && <div className="alert alert-error">{apiErr}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Student Name <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.name ? ' input-error' : ''}`}
                name="name" type="text" value={form.name}
                onChange={handleChange} placeholder="e.g. Ahmed Raza" autoComplete="off"
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Roll No <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.rollNo ? ' input-error' : ''}`}
                name="rollNo" type="text" value={form.rollNo}
                onChange={handleChange} placeholder="e.g. CS-2021-045" autoComplete="off"
              />
              {errors.rollNo && <p className="field-error">{errors.rollNo}</p>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Student Email <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.email ? ' input-error' : ''}`}
                name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="student@example.com" autoComplete="off"
              />
              {errors.email && <p className="field-error">{errors.email}</p>}
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Batch <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.batch ? ' input-error' : ''}`}
                name="batch" type="text" value={form.batch}
                onChange={handleChange} placeholder="e.g. 2021" autoComplete="off"
              />
              {errors.batch && <p className="field-error">{errors.batch}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Section <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.section ? ' input-error' : ''}`}
                name="section" type="text" value={form.section}
                onChange={handleChange} placeholder="e.g. A" autoComplete="off"
              />
              {errors.section && <p className="field-error">{errors.section}</p>}
            </div>
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
              <label className="form-label">Phone No <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.phone ? ' input-error' : ''}`}
                name="phone" type="text" value={form.phone}
                onChange={handleChange} placeholder="e.g. 0300-1234567" autoComplete="off"
              />
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>
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
              <label className="form-label">Guardian Name <span style={{ color: '#b91c1c' }}>*</span></label>
              <input
                className={`form-input${errors.guardianName ? ' input-error' : ''}`}
                name="guardianName" type="text" value={form.guardianName}
                onChange={handleChange} placeholder="e.g. Muhammad Khan" autoComplete="off"
              />
              {errors.guardianName && <p className="field-error">{errors.guardianName}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Guardian Phone No <span style={{ color: '#b91c1c' }}>*</span></label>
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
              {loading ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Student')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function StudentDetails({ student: s, onEdit, onClose }) {
  return (
    <DetailsModal
      title={s.name}
      subtitle={`${s.rollNo} · Batch ${s.batch} · Section ${s.section}`}
      badge={s.department && (
        <span className="dept-badge-pill" style={{ color: s.department.color, background: s.department.bg }}>
          {s.department.name}
        </span>
      )}
      sections={[
        {
          heading: 'Personal Information',
          fields: [
            ['Full Name', s.name],
            ['CNIC', s.cnic],
          ],
        },
        {
          heading: 'Academic',
          fields: [
            ['Roll No', s.rollNo],
            ['Department', s.department && `${s.department.name} (${s.department.code})`],
            ['Batch', s.batch],
            ['Section', s.section],
          ],
        },
        {
          heading: 'Contact',
          fields: [
            ['Email', s.email],
            ['Phone', s.phone],
            ['Address', s.address],
          ],
        },
        {
          heading: 'Guardian',
          fields: [
            ['Guardian Name', s.guardianName],
            ['Guardian Contact', s.guardianContact],
            ['Guardian CNIC', s.guardianCnic],
          ],
        },
      ]}
      onEdit={onEdit}
      onClose={onClose}
    />
  );
}

export default function StudentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role?.name === 'ADMIN';

  const [students, setStudents] = useState([]);
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

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const data = await api.get(`/students?${params}`);
      setStudents(data.students);
    } catch (err) {
      showToast(err.message || 'Failed to load students.', 'error');
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  useEffect(() => {
    api.get('/departments').then(data => setDepartments(data.departments)).catch(() => {});
  }, []);

  const filtered = useMemo(
    () => (departmentId ? students.filter(s => String(s.departmentId) === departmentId) : students),
    [students, departmentId],
  );

  const handleSaved = (student, action) => {
    fetchStudents();
    showToast(`Student ${student.name} ${action} successfully.`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/students/${deleteTarget.id}`);
      setStudents(p => p.filter(s => s.id !== deleteTarget.id));
      showToast(`Student ${deleteTarget.name} deleted.`);
    } catch (err) {
      showToast(err.message || 'Failed to delete student.', 'error');
    } finally { setDeleteTarget(null); }
  };

  return (
    <DashboardLayout pageTitle="Students">
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Student"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
      {viewTarget && (
        <StudentDetails
          student={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={isAdmin ? () => { setEditTarget(viewTarget); setViewTarget(null); setModal('edit'); } : undefined}
        />
      )}
      {modal === 'add' && (
        <StudentModal departments={departments} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal === 'edit' && editTarget && (
        <StudentModal
          departments={departments}
          initial={editTarget}
          onClose={() => { setModal(null); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{filtered.length} student{filtered.length === 1 ? '' : 's'}</p>
        </div>
        {isAdmin && (
          <button className="btn-primary btn-with-icon" onClick={() => setModal('add')} style={{ flexShrink: 0 }}>
            <LuPlus size={16} /> Add Student
          </button>
        )}
      </div>

      <div className="filters-bar">
        <div className="search-wrap">
          <span className="search-icon"><LuSearch size={15} /></span>
          <input
            className="search-input"
            type="text"
            placeholder="Search by name, email, or roll no…"
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
            { value: '', label: 'All', count: students.length },
            ...departments.map(d => ({ value: String(d.id), label: d.name, count: students.filter(s => s.departmentId === d.id).length })),
          ]}
        />
      </div>

      <div className="table-card">
        {loading ? (
          <div className="table-empty">
            <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
            <p>Loading students…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <LuUser size={26} color="#cbd5e1" />
            <p>{students.length === 0 && !search ? 'No students added yet.' : 'No students match your filters.'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Department</th>
                  <th>Batch / Section</th>
                  <th>Contact</th>
                  <th>CNIC</th>
                  <th>Guardian</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} className="row-clickable" onClick={() => setViewTarget(s)} title="View details">
                    <td className="td-idx">{i + 1}</td>
                    <td>
                      <div className="td-name">{s.name}</div>
                      <div className="td-date">{s.rollNo}</div>
                    </td>
                    <td>
                      {s.department ? (
                        <span className="dept-badge-pill" style={{ color: s.department.color, background: s.department.bg }}>
                          {s.department.code}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div>Batch {s.batch}</div>
                      <div className="td-date">Section {s.section}</div>
                    </td>
                    <td>
                      <div className="td-email">{s.email}</div>
                      <div className="td-date">{s.phone}</div>
                    </td>
                    <td className="td-date" style={{ whiteSpace: 'nowrap' }}>{s.cnic}</td>
                    <td>
                      <div>{s.guardianName}</div>
                      <div className="td-date">{s.guardianContact}</div>
                    </td>
                    {isAdmin && (
                      <td onClick={e => e.stopPropagation()}>
                        <div className="td-actions">
                          <button className="btn-edit" onClick={() => { setEditTarget(s); setModal('edit'); }} title="Edit student">
                            <LuPencil size={13} /> <span>Edit</span>
                          </button>
                          <button className="btn-del" onClick={() => setDeleteTarget(s)} title="Delete student">
                            <LuTrash2 size={13} /> <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
