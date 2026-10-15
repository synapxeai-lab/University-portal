import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_HOME = {
  ADMIN:   '/admin/dashboard',
  TEACHER: '/teacher/home',
  STUDENT: '/student/home',
};

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', gap: '1rem' }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="9" fill="#f28500" />
          <path d="M20 9L8 16v2l12 8 12-8v-2L20 9z" fill="white" />
          <path d="M8 22v5l12 8 12-8v-5L20 27 8 22z" fill="white" fillOpacity=".55" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTop: '3px solid #164E63', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
          <p style={{ fontSize: '0.83rem', color: '#64748B' }}>Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRole && user.role.name !== allowedRole)
    return <Navigate to={ROLE_HOME[user.role.name] || '/login'} replace />;

  return children;
}
