import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { api } from '../../services/api.js';
import {
  LuBookOpen, LuClock, LuCalendarClock, LuMail, LuPhone, LuMapPin,
  LuUserRound, LuLoaderCircle, LuIdCard, LuUsers,
} from 'react-icons/lu';
import { ordinal } from '../../utils/ordinal.js';

const SEMESTER_LABELS = { SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };

function ProfileField({ label, value, icon: Icon }) {
  return (
    <div>
      <p className="profile-field-label">{label}</p>
      <p className="profile-field-value">{Icon && <Icon size={13} color="#94a3b8" />} {value}</p>
    </div>
  );
}

export default function StudentHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [registrations, setRegistrations] = useState(null);
  const [courseGroups, setCourseGroups] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/students/me'),
      api.get('/students/me/registrations'),
      api.get('/students/me/courses'),
    ]).then(([p, r, c]) => {
      if (cancelled) return;
      setProfile(p.student);
      setRegistrations(r);
      setCourseGroups(c.groups);
    }).catch(err => { if (!cancelled) setError(err.message || 'Failed to load your information.'); });
    return () => { cancelled = true; };
  }, []);

  const totalCourses = courseGroups?.reduce((sum, g) => sum + g.courses.length, 0) ?? 0;
  const latestGroup = courseGroups?.[0] ?? null;

  const STATS = [
    {
      label: 'Current Semester',
      value: registrations?.registrationOpen && !registrations.message && registrations.semester ? ordinal(registrations.semester) : '—',
      icon: LuCalendarClock, color: '#0F766E', bg: '#F0FDFA', border: '#0F766E',
      path: '/student/registration',
    },
    {
      label: 'Credit Hours Used',
      value: registrations?.registrationOpen ? `${registrations.creditsUsed} / ${registrations.creditLimit}` : '—',
      icon: LuClock, color: '#166534', bg: '#dcfce7', border: '#166534',
      path: '/student/registration',
    },
    {
      label: 'Courses Registered',
      value: totalCourses,
      icon: LuBookOpen, color: '#92400e', bg: '#fef3c7', border: '#92400e',
      path: '/student/courses',
    },
  ];

  return (
    <DashboardLayout pageTitle="Home">
      <div className="welcome-banner">
        <div>
          <h1 className="welcome-title">Welcome back, {user?.name}</h1>
          <p className="welcome-sub">Here's an overview of your student portal.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        {STATS.map(s => (
          <div
            key={s.label} className={`stat-card${s.path ? ' clickable' : ''}`}
           
            onClick={s.path ? () => navigate(s.path) : undefined}
          >
            <div className="stat-icon-wrap" style={{ background: s.bg, color: s.color }}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="stat-label">{s.label}</p>
              <p className="stat-value">{registrations && courseGroups ? s.value : '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="info-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="info-card-title"><LuUserRound size={16} /> My Profile</h3>
        {!profile ? (
          <div style={{ padding: '1.5rem 0', textAlign: 'center' }}><LuLoaderCircle size={22} className="spin" color="#94a3b8" /></div>
        ) : (
          <div className="profile-field-grid">
            <ProfileField label="Full Name" value={profile.name} />
            <ProfileField label="Roll No" value={profile.rollNo} icon={LuIdCard} />
            <ProfileField label="Email" value={profile.email} icon={LuMail} />
            <ProfileField label="Phone" value={profile.phone} icon={LuPhone} />
            <ProfileField label="Department" value={profile.department.name} />
            <ProfileField label="Batch" value={profile.batch} />
            <ProfileField label="Section" value={profile.section} icon={LuUsers} />
            <ProfileField label="Address" value={profile.address} icon={LuMapPin} />
            <ProfileField label="Guardian Name" value={profile.guardianName} />
            <ProfileField label="Guardian Contact" value={profile.guardianContact} icon={LuPhone} />
          </div>
        )}
      </div>

      <div className="info-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="info-card-title"><LuCalendarClock size={16} /> Registration Status</h3>
        {!registrations ? (
          <div style={{ padding: '1.5rem 0', textAlign: 'center' }}><LuLoaderCircle size={22} className="spin" color="#94a3b8" /></div>
        ) : registrations.registrationOpen && !registrations.message ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-mid)' }}>
            {SEMESTER_LABELS[registrations.registration.semester]} {registrations.registration.year} registration is open
            {' '}— you're in your <strong>{ordinal(registrations.semester)} semester</strong>.
            {' '}<a href="#" onClick={e => { e.preventDefault(); navigate('/student/registration'); }} style={{ color: 'var(--navy-light)', fontWeight: 600 }}>Go register →</a>
          </p>
        ) : (
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{registrations.message || 'Registration is not currently open.'}</p>
        )}
      </div>

      <div className="info-card">
        <h3 className="info-card-title"><LuBookOpen size={16} /> {latestGroup ? `${SEMESTER_LABELS[latestGroup.semester]} ${latestGroup.year} Courses` : 'My Courses'}</h3>
        {!courseGroups ? (
          <div style={{ padding: '1.5rem 0', textAlign: 'center' }}><LuLoaderCircle size={22} className="spin" color="#94a3b8" /></div>
        ) : !latestGroup ? (
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0' }}>
            You haven't registered for any courses yet.
          </p>
        ) : (
          <div className="course-list">
            {latestGroup.courses.map(c => (
              <div key={c.id} className="course-row">
                <div className="course-row-main">
                  <div className="course-code-badge" style={{ color: c.department.color, background: c.department.bg }}>
                    {c.code}
                  </div>
                  <div className="course-info">
                    <p className="course-name">{c.name}</p>
                    <div className="course-row-meta">
                      <span className="dept-badge-pill" style={{ color: c.department.color, background: c.department.bg }}>
                        {c.department.name}
                      </span>
                      <span className="course-row-semester">Section {c.section.label}</span>
                    </div>
                  </div>
                  <div className="course-credits">
                    <LuClock size={13} /> {c.creditHours} CR
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {courseGroups && totalCourses > 0 && (
          <div style={{ textAlign: 'right', marginTop: '0.85rem' }}>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/student/courses'); }} style={{ fontSize: '0.8rem', color: 'var(--navy-light)', fontWeight: 600 }}>
              View all courses →
            </a>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
