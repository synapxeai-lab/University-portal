import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuShield, LuActivity, LuFileText, LuEye, LuEyeOff, LuTriangleAlert } from 'react-icons/lu';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_HOME = { ADMIN: '/admin/dashboard', TEACHER: '/teacher/home', STUDENT: '/student/home' };

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form,     setForm]     = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await api.post('/auth/login', form);
      login(data.user, data.token);
      navigate(ROLE_HOME[data.user.role.name] || '/');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      {/* ── Left branding panel ────────────────────────────── */}
      <div className="auth-panel-left">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
            <UniLogo size={44} />
            <span style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.02em' }}>UniAttend</span>
          </div>

          <h2 style={{ color: '#fff', fontSize: '1.9rem', fontWeight: 800, lineHeight: 1.25, marginBottom: '0.85rem' }}>
            Smart Attendance<br />for Modern Universities
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
            A unified platform for administrators, teachers, and students to manage and track attendance efficiently.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: LuShield,   title: 'Role-Based Access',  desc: 'Admin, Teacher & Student portals' },
              { icon: LuActivity, title: 'Real-Time Tracking', desc: 'Live attendance monitoring' },
              { icon: LuFileText, title: 'Detailed Reports',   desc: 'Export and analyse attendance data' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                  <f.icon size={18} />
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.1rem' }}>{f.title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────── */}
      <div className="auth-panel-right">
        <div className="auth-card fade-in">
          {/* Mobile logo */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <UniLogo size={36} />
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#164E63', letterSpacing: '0.02em' }}>UniAttend</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748B' }}>University Attendance Management System</p>
          </div>

          <div className="auth-form-box">
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.25rem' }}>
              Sign in to your account
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '1.5rem' }}>
              Welcome back! Please enter your credentials.
            </p>

            {error && (
              <div className="alert alert-error">
                <LuTriangleAlert size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  className="form-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@university.edu"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="form-input-wrap">
                  <input
                    className="form-input"
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" className="form-input-action" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                    {showPass ? <LuEyeOff size={17} /> : <LuEye size={17} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            <p style={{ marginTop: '1.4rem', textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>
              Access is granted by your administrator.
            </p>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.72rem', color: '#94a3b8' }}>
            © {new Date().getFullYear()} UniAttend · University Attendance System
          </p>
        </div>
      </div>
    </div>
  );
}

function UniLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
      <rect width="40" height="40" rx="9" fill="#f28500" />
      <path d="M20 9L8 16v2l12 8 12-8v-2L20 9z" fill="white" />
      <path d="M8 22v5l12 8 12-8v-5L20 27 8 22z" fill="white" fillOpacity=".55" />
    </svg>
  );
}
