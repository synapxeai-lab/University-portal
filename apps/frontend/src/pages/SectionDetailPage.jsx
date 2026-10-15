import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  LuArrowLeft, LuUser, LuUserCheck, LuPhone, LuMail, LuHash, LuX, LuTrash2, LuLoaderCircle,
} from 'react-icons/lu';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';
import Toast from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { api } from '../services/api.js';
import { ROLE_BASE } from '../utils/roleBase.js';

function AssignTeacherModal({ courseName, onClose, onAssigned }) {
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [teacherQuery, setTeacherQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get('/teachers');
        if (!cancelled) setTeachers(data.teachers);
      } catch (err) {
        if (!cancelled) setFetchError(err.message || 'Failed to load teachers.');
      } finally {
        if (!cancelled) setLoadingTeachers(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = teachers.filter(t => t.name.toLowerCase().includes(teacherQuery.trim().toLowerCase()));

  const selectTeacher = (t) => {
    setTeacherId(t.id);
    setTeacherQuery(t.name);
    setDropdownOpen(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teacherId) { setError(teacherQuery.trim() ? 'Select a teacher from the list' : 'Teacher is required'); return; }
    setSaving(true);
    try {
      await onAssigned(teacherId);
    } catch (err) {
      setError(err.message || 'Failed to assign teacher.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Assign Teacher — {courseName}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Teacher <span style={{ color: '#b91c1c' }}>*</span></label>
            {loadingTeachers ? (
              <p className="field-hint">Loading teachers…</p>
            ) : fetchError ? (
              <p className="field-error">{fetchError}</p>
            ) : teachers.length === 0 ? (
              <p className="field-hint">No teachers found. Add one from the Teachers page first.</p>
            ) : (
              <>
                <input
                  className={`form-input${error ? ' input-error' : ''}`}
                  type="text" value={teacherQuery} placeholder="Type to search teachers…" autoComplete="off"
                  onChange={e => { setTeacherQuery(e.target.value); setTeacherId(''); setDropdownOpen(true); setError(''); }}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 120)}
                />
                {dropdownOpen && (
                  <div className="teacher-suggest-list">
                    {filtered.length > 0 ? filtered.map(t => (
                      <button type="button" key={t.id} className="teacher-suggest-item" onMouseDown={() => selectTeacher(t)}>
                        <span className="teacher-suggest-name">{t.name}</span>
                        <span className="teacher-suggest-email">{t.email}</span>
                      </button>
                    )) : (
                      <p className="teacher-suggest-empty">No teachers match "{teacherQuery}"</p>
                    )}
                  </div>
                )}
              </>
            )}
            {error && <p className="field-error">{error}</p>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={teachers.length === 0 || saving}>
              {saving ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function SectionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = ROLE_BASE[user?.role?.name] || '/student';
  const isAdmin = user?.role?.name === 'ADMIN';

  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignCourseLink, setAssignCourseLink] = useState(null); // { courseId, courseName }
  const [deleteSectionConfirm, setDeleteSectionConfirm] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const fetchSection = useCallback(async () => {
    try {
      const data = await api.get(`/sections/${id}`);
      setSection(data.section);
    } catch (err) {
      setError(err.message || 'Failed to load section.');
      setSection(null);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { setLoading(true); setError(''); fetchSection(); }, [fetchSection]);

  const handleRemoveStudent = async (studentId) => {
    try {
      const res = await api.delete(`/sections/${id}/students/${studentId}`);
      setSection(res.section);
      showToast('Student removed from section.');
    } catch (err) {
      showToast(err.message || 'Failed to remove student.', 'error');
    }
  };

  const handleAssignTeacher = async (teacherId) => {
    const res = await api.put(`/sections/${id}/courses/${assignCourseLink.courseId}/assign`, { teacherId: Number(teacherId) });
    setSection(res.section);
    setAssignCourseLink(null);
    showToast(res.message);
  };

  const handleDeleteSection = async () => {
    try {
      await api.delete(`/sections/${id}`);
      showToast(`Section ${section.label} deleted.`);
      navigate(`${base}/departments/${section.department.id}`);
    } catch (err) {
      showToast(err.message || 'Failed to delete section.', 'error');
      setDeleteSectionConfirm(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Section">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading section…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !section) {
    return (
      <DashboardLayout pageTitle="Section">
        <button className="back-link" onClick={() => navigate(`${base}/departments`)}>
          <LuArrowLeft size={15} /> Back to Departments
        </button>
        <div className="alert alert-error">{error || 'Section not found.'}</div>
      </DashboardLayout>
    );
  }

  const { department, students, courseLinks } = section;

  return (
    <DashboardLayout pageTitle={`Section ${section.label}`}>
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      {assignCourseLink && (
        <AssignTeacherModal
          courseName={assignCourseLink.courseName}
          onClose={() => setAssignCourseLink(null)}
          onAssigned={handleAssignTeacher}
        />
      )}
      <ConfirmDialog
        open={deleteSectionConfirm}
        title="Delete Section"
        message={`Are you sure you want to delete Section ${section.label}? Any enrolled students will be unenrolled and all per-course teacher assignments will be removed. This action cannot be undone.`}
        onConfirm={handleDeleteSection}
        onCancel={() => setDeleteSectionConfirm(false)}
      />

      <button className="back-link" onClick={() => navigate(`${base}/departments/${department.id}`)}>
        <LuArrowLeft size={15} /> Back to {department.name}
      </button>

      <div className="dept-detail-header" style={{ borderColor: department.bg }}>
        <div className="dept-detail-icon" style={{ background: department.bg, color: department.color }}>
          {department.code}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>Section {section.label} · Batch {section.batch}</h1>
          <p className="page-subtitle" style={{ marginBottom: '0.6rem' }}>
            <Link to={`${base}/departments/${department.id}`} className="course-detail-dept-link">
              {department.name} ({department.code})
            </Link>
          </p>
          <div className="dept-detail-meta">
            <span><LuUser size={13} /> {students.length} students enrolled</span>
            <span><LuUserCheck size={13} /> {courseLinks.filter(l => l.teacher).length} of {courseLinks.length} courses have a teacher</span>
          </div>
        </div>
        {isAdmin && (
          <button
            className="btn-danger btn-with-icon"
            style={{ alignSelf: 'flex-start', flexShrink: 0 }}
            onClick={() => setDeleteSectionConfirm(true)}
          >
            <LuTrash2 size={14} /> Delete Section
          </button>
        )}
      </div>

      <h3 className="semester-heading" style={{ marginBottom: '0.9rem' }}>Courses &amp; Assigned Teachers</h3>

      <div className="sections-grid" style={{ marginBottom: '1.5rem' }}>
        {courseLinks.length === 0 ? (
          <div className="table-empty"><p>No courses offered to this section yet. Use the Offer Courses page to add some.</p></div>
        ) : courseLinks.map(link => (
          <div key={link.id} className="section-detail-card">
            <div className="section-detail-header">
              <span className="section-detail-badge">{link.course.code}</span>
              {isAdmin && (
                <button
                  className="btn-outline btn-with-icon section-assign-btn"
                  onClick={() => setAssignCourseLink({ courseId: link.courseId, courseName: link.course.name })}
                >
                  <LuUserCheck size={14} /> {link.teacher ? 'Reassign' : 'Assign'}
                </button>
              )}
            </div>
            <p className="course-name" style={{ marginBottom: '0.5rem' }}>{link.course.name}</p>
            {link.teacher ? (
              <div className="section-teacher-info">
                <p className="section-teacher-name">{link.teacher.name}</p>
                <p className="section-teacher-detail"><LuPhone size={12} /> {link.teacher.phone}</p>
                <p className="section-teacher-detail"><LuMail size={12} /> {link.teacher.email}</p>
              </div>
            ) : (
              <p className="section-empty">No teacher assigned yet.</p>
            )}
          </div>
        ))}
      </div>

      <h3 className="semester-heading" style={{ marginBottom: '0.9rem' }}>Enrolled Students</h3>

      <div className="dept-list">
        {students.length === 0 ? (
          <div className="table-empty"><p>No students enrolled in this section yet.</p></div>
        ) : students.map(s => (
          <div key={s.id} className="teacher-row">
            <div className="dept-row-icon" style={{ background: '#dcfce7', color: '#166534' }}>
              <LuUser size={20} />
            </div>
            <div className="dept-row-body">
              <h3 className="dept-row-name">{s.name}</h3>
              <div className="dept-row-meta" style={{ marginTop: '0.2rem' }}>
                <span><LuHash size={13} /> {s.rollNo}</span>
                <span><LuPhone size={13} /> {s.phone}</span>
                <span><LuMail size={13} /> {s.email}</span>
              </div>
            </div>
            {isAdmin && (
              <div className="course-actions">
                <button className="btn-del" onClick={() => handleRemoveStudent(s.id)} title="Remove from section">
                  <LuTrash2 size={13} /> <span>Remove</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
