import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LuLayoutGrid, LuUsers, LuLayers,
  LuBookOpen, LuClipboardCheck, LuBookMarked, LuClipboardList,
  LuMenu, LuLogOut, LuChevronLeft, LuChevronRight, LuGraduationCap, LuUserRound, LuBookPlus, LuCalendarClock, LuWallet, LuAward, LuPercent, LuScrollText, LuMedal,
} from 'react-icons/lu';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const NAV = {
  ADMIN: [
    { label: 'Dashboard',       icon: LuLayoutGrid,      path: '/admin/dashboard' },
    { label: 'Departments',     icon: LuLayers,          path: '/admin/departments' },
    { label: 'Courses',         icon: LuBookMarked,      path: '/admin/courses' },
    { label: 'Offer Courses',   icon: LuBookPlus,        path: '/admin/offer-courses' },
    { label: 'Registration',    icon: LuCalendarClock,   path: '/admin/registration' },
    { label: 'Teachers',        icon: LuGraduationCap,   path: '/admin/teachers' },
    { label: 'Students',        icon: LuUserRound,       path: '/admin/students' },
    { label: 'Attendance',      icon: LuClipboardCheck,  path: '/admin/attendance' },
    { label: 'Marks',           icon: LuAward,           path: '/admin/marks' },
    { label: 'Grade Criteria',  icon: LuPercent,         path: '/admin/grading' },
    { label: 'Grades',          icon: LuMedal,           path: '/admin/grades' },
    { label: 'Fee Challans',    icon: LuWallet,          path: '/admin/fee-challans' },
    { label: 'User Management', icon: LuUsers,           path: '/admin/users' },
  ],
  TEACHER: [
    { label: 'Home',            icon: LuLayoutGrid,      path: '/teacher/home' },
    { label: 'My Courses',      icon: LuBookOpen,        path: '/teacher/courses' },
    { label: 'My Students',     icon: LuGraduationCap,   path: '/teacher/students' },
    { label: 'Attendance',      icon: LuClipboardCheck,  path: '/teacher/attendance' },
    { label: 'Marks',           icon: LuAward,           path: '/teacher/marks' },
    { label: 'Grading Criteria', icon: LuPercent,        path: '/teacher/grading' },
    { label: 'Grades',          icon: LuMedal,           path: '/teacher/grades' },
  ],
  STUDENT: [
    { label: 'Home',            icon: LuLayoutGrid,      path: '/student/home' },
    { label: 'Registration',   icon: LuCalendarClock,   path: '/student/registration' },
    { label: 'Fee Challan',     icon: LuWallet,          path: '/student/fee-challan' },
    { label: 'My Courses',      icon: LuBookOpen,        path: '/student/courses' },
    { label: 'Attendance',      icon: LuClipboardList,   path: '/student/attendance' },
    { label: 'Marks',           icon: LuAward,           path: '/student/marks' },
    { label: 'Transcript',      icon: LuScrollText,      path: '/student/transcript' },
  ],
};

const ROLE_META = {
  ADMIN:   { label: 'Administrator' },
  TEACHER: { label: 'Teacher' },
  STUDENT: { label: 'Student' },
};

export default function DashboardLayout({ children, pageTitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      try { localStorage.setItem('sidebarCollapsed', prev ? '0' : '1'); } catch { /* ignore */ }
      return !prev;
    });
  };

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const role = user?.role?.name || 'STUDENT';
  const meta = ROLE_META[role] || ROLE_META.STUDENT;
  const nav  = NAV[role]  || NAV.STUDENT;
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>

      {/* ── Mobile overlay ──────────────────────────────── */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="sidebar-logo-mark"><UniLogo /></span>
          <span className="sidebar-brand">UniAttend</span>
          <button
            className="sidebar-collapse-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <LuChevronRight size={18} /> : <LuChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {nav.map(item => {
            const active = pathname === item.path || (!item.soon && pathname.startsWith(item.path + '/'));
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => { if (!item.soon) { navigate(item.path); setSidebarOpen(false); } }}
                className={`sidebar-nav-item${active ? ' active' : ''}${item.soon ? ' disabled' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="sidebar-nav-icon"><Icon size={18} /></span>
                <span className="sidebar-nav-label">{item.label}</span>
                {item.soon && <span className="sidebar-soon-badge">Soon</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main area ───────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <header className="dash-header">
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {/* Hamburger — only visible on mobile via CSS */}
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(p => !p)}
              aria-label="Toggle navigation"
            >
              <LuMenu size={19} />
            </button>

            <h1 className="dash-page-title">{pageTitle || meta.label}</h1>
          </div>

          <div className="dash-header-right">
            <div className="dash-header-user-text">
              <p className="dash-header-name">{user?.name}</p>
              <p className="dash-header-email">{user?.email}</p>
            </div>
            <div className="dash-header-avatar">{initials}</div>
            <span className="dash-header-divider" />
            <button className="dash-header-logout" onClick={handleLogout} title="Sign out">
              <LuLogOut size={18} />
              <span className="dash-header-logout-label">Sign out</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="dash-main">
          <div className="fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

function UniLogo() {
  return (
    <svg width="40" height="40"viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
      <rect width="40" height="40" rx="9" fill="#f28500" />
      <path d="M20 9L8 16v2l12 8 12-8v-2L20 9z" fill="white" />
      <path d="M8 22v5l12 8 12-8v-5L20 27 8 22z" fill="white" fillOpacity=".55" />
    </svg>
  );
}
