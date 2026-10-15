import { useCallback, useEffect, useState } from 'react';
import { LuSend } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import GenerateGradesModal from '../../components/GenerateGradesModal.jsx';
import GradeReleases from '../../components/GradeReleases.jsx';
import { TeacherCourseList } from '../../components/TeacherCoursePicker.jsx';
import Toast from '../../components/Toast.jsx';
import { api } from '../../services/api.js';

const API_BASE = '/teachers/me';

// Same as the admin Grades page, limited to the sections this teacher teaches.
export default function TeacherGradesPage() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [releases, setReleases] = useState(null);
  const [releasesError, setReleasesError] = useState('');
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const loadReleases = useCallback(() => (
    api.get(`${API_BASE}/grades/releases`)
      .then(res => { setReleases(res.releases); setReleasesError(''); })
      .catch(err => setReleasesError(err.message || 'Failed to load generated grades.'))
  ), []);

  useEffect(() => { loadReleases(); }, [loadReleases]);

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    loadReleases();
  };

  return (
    <DashboardLayout pageTitle="Grades">
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Grades</h1>
          <p className="page-subtitle">Generate grades for your courses, then pick a course to see each student's percentage and grade.</p>
        </div>
        <button className="btn-primary btn-with-icon" onClick={() => setShowGenerate(true)} style={{ flexShrink: 0 }}>
          <LuSend size={15} /> Generate Grades
        </button>
      </div>

      <GradeReleases apiBase={API_BASE} releases={releases} error={releasesError} onChanged={notify} />

      <h3 className="semester-heading">My Courses</h3>
      <TeacherCourseList basePath="/teacher/grades" />

      {showGenerate && (
        <GenerateGradesModal
          apiBase={API_BASE}
          coursesUrl={`${API_BASE}/courses`}
          allLabel="All my courses"
          onGenerated={res => notify(res.message)}
          onClose={() => setShowGenerate(false)}
        />
      )}
    </DashboardLayout>
  );
}
