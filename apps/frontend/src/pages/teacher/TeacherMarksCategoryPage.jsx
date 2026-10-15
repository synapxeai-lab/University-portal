import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuLoaderCircle, LuPlus, LuTrash2, LuChevronRight, LuClipboardList } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import TotalMarksModal from '../../components/TotalMarksModal.jsx';
import Toast from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { MARK_TYPE_LABELS, MARK_TYPE_ITEM, fmtMark } from '../../utils/marks.js';

export default function TeacherMarksCategoryPage() {
  const { courseId, sectionId, categoryId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const sectionPath = `/teacher/marks/courses/${courseId}/sections/${sectionId}`;

  const load = useCallback(() => (
    api.get(`/teachers/me/marks/categories/${categoryId}`)
      .then(res => { setData(res); setError(''); })
      .catch(err => setError(err.message || 'Failed to load.'))
  ), [categoryId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (totalMarks) => {
    const res = await api.post(`/teachers/me/marks/categories/${categoryId}/assessments`, { totalMarks });
    setToast({ msg: res.message || 'Created.', type: 'success' });
    await load();
  };

  const handleDelete = async () => {
    const assessment = toDelete;
    setToDelete(null);
    try {
      const res = await api.delete(`/teachers/me/marks/assessments/${assessment.id}`);
      setToast({ msg: res.message || 'Deleted.', type: 'success' });
      await load();
    } catch (err) {
      setToast({ msg: err.message || 'Failed to delete.', type: 'error' });
    }
  };

  const backLink = (
    <button className="back-link" onClick={() => navigate(sectionPath)}>
      <LuArrowLeft size={15} /> Back to Section {data?.section?.label || ''}
    </button>
  );

  if (!data && !error) {
    return (
      <DashboardLayout pageTitle="Marks">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading…</p>
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

  const { course, section, studentCount, category } = data;
  const label = MARK_TYPE_LABELS[category.type];
  const item = MARK_TYPE_ITEM[category.type];
  const canAdd = !category.singleAssessment || category.assessments.length === 0;

  return (
    <DashboardLayout pageTitle={`Marks — ${label}`}>
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      {backLink}

      <div className="page-header">
        <div>
          <h1 className="page-title">{label}</h1>
          <p className="page-subtitle">{course.code} — {course.name} · Section {section.label} · Batch {section.batch}</p>
        </div>
        {canAdd && (
          <button className="btn-primary btn-with-icon" onClick={() => setShowAdd(true)} style={{ flexShrink: 0 }}>
            <LuPlus size={16} /> Add {item}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {category.assessments.length === 0 ? (
        <div className="table-empty">
          <LuClipboardList size={32} color="#cbd5e1" />
          <p>Nothing here yet. Use <strong>Add {item}</strong> and set its total marks.</p>
        </div>
      ) : (
        <div className="course-list">
          {category.assessments.map(a => (
            <div key={a.id} className="course-row">
              <button className="course-row-main" onClick={() => navigate(`${sectionPath}/assessments/${a.id}`)}>
                <div className="course-info">
                  <p className="course-name">{a.title}</p>
                  <div className="course-row-meta">
                    <span className="course-row-semester">Out of {fmtMark(a.totalMarks)}</span>
                  </div>
                </div>
                <span className="status-pill" style={
                  studentCount > 0 && a.gradedCount === studentCount
                    ? { color: '#166534', background: '#dcfce7', borderColor: '#bbf7d0' }
                    : { color: '#64748B', background: '#f1f5f9', borderColor: '#E2E8F0' }
                }>
                  {a.gradedCount} / {studentCount} graded
                </span>
                <LuChevronRight size={16} className="course-card-chevron" />
              </button>
              <div className="course-actions">
                <button className="btn-icon-danger" title={`Delete ${a.title}`} onClick={() => setToDelete(a)}>
                  <LuTrash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <TotalMarksModal
          title={`Add ${item}`}
          submitLabel={`Add ${item}`}
          onSubmit={handleCreate}
          onClose={() => setShowAdd(false)}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete ${toDelete?.title || ''}?`}
        message="This permanently deletes it along with all marks given to students."
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </DashboardLayout>
  );
}
