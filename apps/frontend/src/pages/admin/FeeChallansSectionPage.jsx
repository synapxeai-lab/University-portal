import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuUser, LuHash, LuLoaderCircle, LuCircleCheck, LuClock, LuWallet } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import Toast from '../../components/Toast.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { api } from '../../services/api.js';
import { SEMESTER_RANK, STATUS_META, formatPKR, semesterLabel } from '../../utils/challans.js';

export default function FeeChallansSectionPage() {
  const { departmentId, sectionId } = useParams();
  const navigate = useNavigate();

  const [section, setSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const fetchSection = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/challans/sections/${sectionId}`);
      setSection(data.section);
      setStudents(data.students);
    } catch (err) {
      setError(err.message || 'Failed to load section.');
      setSection(null);
    } finally { setLoading(false); }
  }, [sectionId]);

  useEffect(() => { fetchSection(); }, [fetchSection]);

  const handleApprove = async () => {
    const challan = confirmTarget;
    setConfirmTarget(null);
    setApprovingId(challan.id);
    try {
      const res = await api.put(`/challans/${challan.id}/approve`);
      setStudents(prev => prev.map(s => ({
        ...s,
        challans: s.challans.map(c => c.id === challan.id ? { ...res.challan, semester: c.semester } : c),
      })));
      showToast(res.message);
    } catch (err) {
      showToast(err.message || 'Failed to approve challan.', 'error');
    } finally { setApprovingId(null); }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Fee Challans">
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading section…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !section) {
    return (
      <DashboardLayout pageTitle="Fee Challans">
        <button className="back-link" onClick={() => navigate(`/admin/fee-challans/${departmentId}`)}>
          <LuArrowLeft size={15} /> Back to Department
        </button>
        <div className="alert alert-error">{error || 'Section not found.'}</div>
      </DashboardLayout>
    );
  }

  const { department } = section;

  return (
    <DashboardLayout pageTitle={`Section ${section.label}`}>
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />
      <ConfirmDialog
        open={!!confirmTarget}
        title="Approve Payment"
        message={confirmTarget && `Approve the ${formatPKR(confirmTarget.amount)} fee payment from ${confirmTarget.student?.name ?? 'this student'}? This marks the challan as paid and cannot be undone.`}
        confirmLabel="Approve"
        confirmClassName="btn-primary"
        onConfirm={handleApprove}
        onCancel={() => setConfirmTarget(null)}
      />

      <button className="back-link" onClick={() => navigate(`/admin/fee-challans/${departmentId}`)}>
        <LuArrowLeft size={15} /> Back to {department.name}
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Section {section.label} · Batch {section.batch}</h1>
          <p className="page-subtitle">{department.name} ({department.code}) — {students.length} students</p>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="table-empty">
          <p>No students enrolled in this section yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {students.map((s, idx) => (
            <div key={s.id}>
              {idx > 0 && <hr className="sidebar-divider" style={{ margin: '0 0 1.75rem' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div className="dept-row-icon" style={{ background: '#dcfce7', color: '#166534', width: 32, height: 32 }}>
                  <LuUser size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>{s.name}</h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <LuHash size={11} /> {s.rollNo}
                  </p>
                </div>
              </div>

              {s.challans.length === 0 ? (
                <div className="table-empty" style={{ padding: '1rem' }}>
                  <LuWallet size={22} color="#cbd5e1" />
                  <p>No fee challan yet.</p>
                </div>
              ) : (
                <div className="sections-grid">
                  {[...s.challans]
                    .sort((a, b) => b.registration.year - a.registration.year || SEMESTER_RANK[b.registration.semester] - SEMESTER_RANK[a.registration.semester])
                    .map(c => {
                      const sm = STATUS_META[c.status] || STATUS_META.UNPAID;
                      return (
                        <div key={c.id} className="section-detail-card">
                          <div className="section-detail-header">
                            <span className="section-detail-badge">{semesterLabel(c)}</span>
                            <span className="status-pill" style={{ color: sm.color, background: sm.bg, borderColor: sm.border }}>
                              {c.status === 'PAID' && <LuCircleCheck size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />}
                              {c.status === 'PENDING_APPROVAL' && <LuClock size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />}
                              {sm.label}
                            </span>
                          </div>
                          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#164E63', margin: '0.4rem 0 0.1rem' }}>
                            {formatPKR(c.amount)}
                          </p>
                          <p className="section-empty">Account: {c.accountNumber}</p>

                          {c.status === 'PENDING_APPROVAL' && (
                            <button
                              className="btn-primary btn-with-icon"
                              style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                              disabled={approvingId === c.id}
                              onClick={() => setConfirmTarget({ ...c, student: s })}
                            >
                              {approvingId === c.id ? 'Approving…' : 'Approve Payment'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
