import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuLayers, LuUsers, LuBookOpen, LuChevronRight, LuLoaderCircle } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { api } from '../services/api.js';
import { ROLE_BASE } from '../utils/roleBase.js';

export default function DepartmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = ROLE_BASE[user?.role?.name] || '/student';

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get('/departments');
        if (!cancelled) setDepartments(data.departments);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load departments.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <DashboardLayout pageTitle="Departments">
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">{departments.length} departments</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading departments…</p>
        </div>
      ) : (
        <div className="dept-list">
          {departments.map(d => (
            <button
              key={d.id}
              className="dept-row"
              onClick={() => navigate(`${base}/departments/${d.id}`)}
            >
              <div className="dept-row-icon" style={{ background: d.bg, color: d.color }}>
                <LuLayers size={20} />
              </div>
              <div className="dept-row-body">
                <div className="dept-row-heading">
                  <h3 className="dept-row-name">{d.name}</h3>
                  <span className="dept-row-code">{d.code}</span>
                </div>
                <p className="dept-row-desc">{d.description}</p>
              </div>
              <div className="dept-row-meta">
                <span><LuBookOpen size={13} /> {d.courses?.length ?? 0} courses</span>
                <span><LuUsers size={13} /> {d.studentsCount} students</span>
              </div>
              <LuChevronRight size={18} className="dept-row-chevron" />
            </button>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
