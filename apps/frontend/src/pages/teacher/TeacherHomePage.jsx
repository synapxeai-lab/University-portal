import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { api } from '../../services/api.js';
import {
  LuBookOpen, LuUsers, LuLayers, LuMail, LuPhone, LuMapPin,
  LuGraduationCap, LuLoaderCircle, LuIdCard,
} from 'react-icons/lu';
import { ordinal } from '../../utils/ordinal.js';

function ProfileField({ label, value, icon: Icon }) {
  return (
    <div>
      <p className="profile-field-label">{label}</p>
      <p className="profile-field-value">{Icon && <Icon size={13} color="#94a3b8" />} {value}</p>
    </div>
  );
}

export default function TeacherHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/teachers/me'),
      api.get('/teachers/me/courses'),
    ]).then(([p, c]) => {
      if (cancelled) return;
      setProfile(p.teacher);
      setCourses(c.courses);
    }).catch(err => { if (!cancelled) setError(err.message || 'Failed to load your information.'); });
    return () => { cancelled = true; };
  }, []);

  const totalCourses  = courses?.length ?? 0;
  const totalSections = courses?.reduce((sum, c) => sum + c.sectionCount, 0) ?? 0;
  const totalStudents = courses?.reduce((sum, c) => sum + c.studentCount, 0) ?? 0;

  const STATS = [
    { label: 'Courses Teaching', value: totalCourses,  icon: LuBookOpen, color: '#0F766E', bg: '#F0FDFA', border: '#0F766E', path: '/teacher/courses' },
    { label: 'Sections',         value: totalSections, icon: LuLayers,   color: '#166534', bg: '#dcfce7', border: '#166534' },
    { label: 'Students Taught',  value: totalStudents, icon: LuUsers,    color: '#92400e', bg: '#fef3c7', border: '#92400e' },
  ];

  return (
    <DashboardLayout pageTitle="Home">
      <div className="welcome-banner">
        <div>
          <h1 className="welcome-title">Welcome back, {user?.name}</h1>
          <p className="welcome-sub">Here's an overview of your teaching portal.</p>
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
              <p className="stat-value">{courses ? s.value : '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="info-card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="info-card-title"><LuGraduationCap size={16} /> My Profile</h3>
        {!profile ? (
          <div style={{ padding: '1.5rem 0', textAlign: 'center' }}><LuLoaderCircle size={22} className="spin" color="#94a3b8" /></div>
        ) : (
          <div className="profile-field-grid">
            <ProfileField label="Full Name" value={profile.name} />
            <ProfileField label="Email" value={profile.email} icon={LuMail} />
            <ProfileField label="Phone" value={profile.phone} icon={LuPhone} />
            <ProfileField label="Department" value={profile.department.name} />
            <ProfileField label="Qualification" value={profile.qualification} />
            <ProfileField label="CNIC" value={profile.cnic} icon={LuIdCard} />
            <ProfileField label="Address" value={profile.address} icon={LuMapPin} />
          </div>
        )}
      </div>

      <div className="info-card">
        <h3 className="info-card-title"><LuBookOpen size={16} /> Courses You Teach</h3>
        {!courses ? (
          <div style={{ padding: '1.5rem 0', textAlign: 'center' }}><LuLoaderCircle size={22} className="spin" color="#94a3b8" /></div>
        ) : courses.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0' }}>
            You haven't been assigned to teach any courses yet.
          </p>
        ) : (
          <div className="course-list">
            {courses.map(c => (
              <div key={c.id} className="course-row">
                <button className="course-row-main" onClick={() => navigate(`/teacher/courses/${c.id}`)}>
                  <div className="course-code-badge" style={{ color: c.department.color, background: c.department.bg }}>
                    {c.code}
                  </div>
                  <div className="course-info">
                    <p className="course-name">{c.name}</p>
                    <div className="course-row-meta">
                      <span className="dept-badge-pill" style={{ color: c.department.color, background: c.department.bg }}>
                        {c.department.name}
                      </span>
                      <span className="course-row-semester">{ordinal(c.semester)} Semester</span>
                    </div>
                  </div>
                  <div className="course-credits">
                    <LuLayers size={13} /> {c.sectionCount} section{c.sectionCount === 1 ? '' : 's'}
                  </div>
                  <div className="course-credits">
                    <LuUsers size={13} /> {c.studentCount} student{c.studentCount === 1 ? '' : 's'}
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
