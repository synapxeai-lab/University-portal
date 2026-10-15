import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuUsers, LuLoaderCircle } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { api } from '../../services/api.js';

export default function FeeChallansDepartmentPage() {
  const { departmentId } = useParams();
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get(`/departments/${departmentId}`);
        if (!cancelled) setDepartment(data.department);
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Failed to load department.'); setDepartment(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [departmentId]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Fee Challans">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading department…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !department) {
    return (
      <DashboardLayout pageTitle="Fee Challans">
        <button className="back-link" onClick={() => navigate('/admin/fee-challans')}>
          <LuArrowLeft size={15} /> Back to Fee Challans
        </button>
        <div className="alert alert-error">{error || 'Department not found.'}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={department.name}>
      <button className="back-link" onClick={() => navigate('/admin/fee-challans')}>
        <LuArrowLeft size={15} /> Back to Fee Challans
      </button>

      <div className="dept-detail-header" style={{ borderColor: department.bg }}>
        <div className="dept-detail-icon" style={{ background: department.bg, color: department.color }}>
          {department.code}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>{department.name}</h1>
          <p className="page-subtitle" style={{ marginBottom: '0.6rem' }}>Pick a section to review its students' fee challans.</p>
          <div className="dept-detail-meta">
            <span><LuUsers size={13} /> {department.studentsCount} students</span>
          </div>
        </div>
      </div>

      <h3 className="semester-heading" style={{ marginBottom: '0.9rem' }}>Sections</h3>

      {(department.sections || []).length === 0 ? (
        <div className="table-empty">
          <p>No sections yet in this department.</p>
        </div>
      ) : (
        <div className="sections-grid">
          {department.sections.map(section => (
            <div
              key={section.id}
              className="section-detail-card section-detail-card-link"
              onClick={() => navigate(`/admin/fee-challans/${departmentId}/sections/${section.id}`)}
            >
              <div className="section-detail-header">
                <span className="section-detail-badge">Section {section.label} · Batch {section.batch}</span>
              </div>
              <p className="section-empty">{section._count?.students ?? 0} students enrolled</p>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
