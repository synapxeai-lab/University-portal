import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuLoaderCircle, LuPlus, LuTrash2, LuUsers, LuX, LuClipboardList } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Toast from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { MARK_TYPE_LABELS, MARK_TYPE_ITEM, MARK_TYPE_ORDER, fmtMark } from '../../utils/marks.js';

function AddCategoryModal({ available, onSubmit, onClose }) {
  const [type, setType] = useState(available[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(type);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create section.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Section</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Type <span style={{ color: '#b91c1c' }}>*</span></label>
            <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
              {available.map(t => <option key={t} value={t}>{MARK_TYPE_LABELS[t]}</option>)}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function TeacherMarksSectionPage() {
  const { courseId, sectionId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const base = `/teacher/marks/courses/${courseId}/sections/${sectionId}`;

  const load = useCallback(() => (
    api.get(`/teachers/me/courses/${courseId}/sections/${sectionId}/marks`)
      .then(res => { setData(res); setError(''); })
      .catch(err => setError(err.message || 'Failed to load section.'))
  ), [courseId, sectionId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (type) => {
    const res = await api.post(`/teachers/me/courses/${courseId}/sections/${sectionId}/marks/categories`, { type });
    setToast({ msg: res.message || 'Section created.', type: 'success' });
    await load();
  };

  const handleDelete = async () => {
    const category = toDelete;
    setToDelete(null);
    try {
      const res = await api.delete(`/teachers/me/marks/categories/${category.id}`);
      setToast({ msg: res.message || 'Section deleted.', type: 'success' });
      await load();
    } catch (err) {
      setToast({ msg: err.message || 'Failed to delete section.', type: 'error' });
    }
  };

  const backLink = (
    <button className="back-link" onClick={() => navigate(`/teacher/marks/courses/${courseId}`)}>
      <LuArrowLeft size={15} /> Back to {data?.course?.name || 'Course'}
    </button>
  );

  if (!data && !error) {
    return (
      <DashboardLayout pageTitle="Marks">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading section…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout pageTitle="Marks">
        {backLink}
        <div className="alert alert-error">{error}</div>
      </DashboardLayout>
    );
  }

  const { course, section, studentCount, categories } = data;
  const available = MARK_TYPE_ORDER.filter(t => !categories.some(c => c.type === t));

  return (
    <DashboardLayout pageTitle={`Marks — Section ${section.label}`}>
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      {backLink}

      <div className="page-header">
        <div>
          <h1 className="page-title">Section {section.label} · Batch {section.batch}</h1>
          <p className="page-subtitle">
            {course.code} — {course.name} · <LuUsers size={13} style={{ verticalAlign: '-2px' }} /> {studentCount} student{studentCount === 1 ? '' : 's'}
          </p>
        </div>
        {available.length > 0 && (
          <button className="btn-primary btn-with-icon" onClick={() => setShowAdd(true)} style={{ flexShrink: 0 }}>
            <LuPlus size={16} /> Add Section
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {categories.length === 0 ? (
        <div className="table-empty">
          <LuClipboardList size={32} color="#cbd5e1" />
          <p>No marks sections yet. Use <strong>Add Section</strong> to create Quizzes, Assignments, Mid Term, Projects or Final Term.</p>
        </div>
      ) : (
        <div className="sections-grid">
          {categories.map(c => (
            <div
              key={c.id}
              className="section-detail-card section-detail-card-link"
              onClick={() => navigate(`${base}/categories/${c.id}`)}
            >
              <div className="section-detail-header">
                <span className="section-detail-badge">{MARK_TYPE_LABELS[c.type]}</span>
                <button
                  className="btn-icon-danger"
                  title={`Delete ${MARK_TYPE_LABELS[c.type]}`}
                  onClick={e => { e.stopPropagation(); setToDelete(c); }}
                >
                  <LuTrash2 size={13} />
                </button>
              </div>
              <p className="section-empty">
                {c.assessmentCount === 0
                  ? `No ${MARK_TYPE_ITEM[c.type].toLowerCase()} added yet`
                  : `${c.assessmentCount} item${c.assessmentCount === 1 ? '' : 's'} · ${fmtMark(c.totalMarks)} marks total`}
              </p>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddCategoryModal available={available} onSubmit={handleCreate} onClose={() => setShowAdd(false)} />}

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete ${toDelete ? MARK_TYPE_LABELS[toDelete.type] : ''}?`}
        message="This permanently deletes everything in this section, including all marks given to students."
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </DashboardLayout>
  );
}
