import { useCallback, useEffect, useState } from 'react';
import { LuSend } from 'react-icons/lu';
import AdminCoursePicker from '../../components/AdminCoursePicker.jsx';
import GenerateGradesModal from '../../components/GenerateGradesModal.jsx';
import GradeReleases from '../../components/GradeReleases.jsx';
import Toast from '../../components/Toast.jsx';
import { api } from '../../services/api.js';

export default function AdminGradesPage() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [releases, setReleases] = useState(null);
  const [releasesError, setReleasesError] = useState('');
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const loadReleases = useCallback(() => (
    api.get('/marks/grades/releases')
      .then(res => { setReleases(res.releases); setReleasesError(''); })
      .catch(err => setReleasesError(err.message || 'Failed to load generated grades.'))
  ), []);

  useEffect(() => { loadReleases(); }, [loadReleases]);

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    loadReleases();
  };

  return (
    <>
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      <AdminCoursePicker
        pageTitle="Grades"
        subtitle="Pick a course to see every student's percentage and grade, and change a grade if needed."
        basePath="/admin/grades"
        actions={(
          <button className="btn-primary btn-with-icon" onClick={() => setShowGenerate(true)} style={{ flexShrink: 0 }}>
            <LuSend size={15} /> Generate Grades
          </button>
        )}
      >
        <GradeReleases releases={releases} error={releasesError} onChanged={notify} />
        <h3 className="semester-heading">Courses</h3>
      </AdminCoursePicker>
      {showGenerate && (
        <GenerateGradesModal
          onGenerated={res => notify(res.message)}
          onClose={() => setShowGenerate(false)}
        />
      )}
    </>
  );
}
