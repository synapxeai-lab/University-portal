import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { api } from '../../services/api.js';
import {
  LuUsers, LuGraduationCap, LuBookOpen, LuLayers, LuBookMarked,
} from 'react-icons/lu';

const STAT_META = [
  { key: 'users',       label: 'Total Users', icon: LuUsers,         color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', path: '/admin/users' },
  { key: 'teachers',    label: 'Teachers',    icon: LuGraduationCap, color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4', path: '/admin/teachers' },
  { key: 'students',    label: 'Students',    icon: LuBookOpen,      color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', path: '/admin/students' },
  { key: 'departments', label: 'Departments', icon: LuLayers,        color: '#92400e', bg: '#fef3c7', border: '#fde68a', path: '/admin/departments' },
  { key: 'courses',     label: 'Courses',     icon: LuBookMarked,    color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', path: '/admin/courses' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard/admin/stats').then(data => setStats(data.stats)).catch(() => {});
  }, []);

  return (
    <DashboardLayout pageTitle="Dashboard">
      {/* Welcome banner */}
      <div className="welcome-banner">
        <div>
          <h1 className="welcome-title">Welcome back, {user?.name}</h1>
          <p className="welcome-sub">
            You have full administrative access. Manage users, departments, and monitor system-wide attendance from here.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {STAT_META.map(s => (
          <div
            key={s.key} className="stat-card clickable"
            onClick={() => navigate(s.path)}
          >
            <div className="stat-icon-wrap" style={{ background: s.bg, color: s.color }}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="stat-label">{s.label}</p>
              <p className="stat-value">{stats ? stats[s.key] : '—'}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
