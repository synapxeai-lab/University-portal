import { useCallback, useEffect, useState } from 'react';
import { LuWallet, LuBanknote, LuCircleCheck, LuClock } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import Toast from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { ordinal } from '../../utils/ordinal.js';

const SEMESTER_LABELS = { SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
const SEMESTER_RANK = { SPRING: 0, SUMMER: 1, FALL: 2 };

const STATUS_META = {
  UNPAID:           { label: 'Unpaid',            color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  PENDING_APPROVAL: { label: 'Awaiting Approval',  color: '#a16207', bg: '#fefce8', border: '#fde68a' },
  PAID:             { label: 'Paid',               color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
};

const formatPKR = (n) => `Rs. ${n.toLocaleString('en-PK')}`;

const semesterHeading = (c) => {
  const calendar = `${SEMESTER_LABELS[c.registration.semester]} ${c.registration.year}`;
  return c.semester >= 1 && c.semester <= 8 ? `${ordinal(c.semester)} Semester — ${calendar}` : calendar;
};

export default function StudentFeeChallanPage() {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const fetchChallans = useCallback(async () => {
    try {
      const res = await api.get('/challans/me');
      setChallans(res.challans);
    } catch (err) {
      setError(err.message || 'Failed to load fee challans.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchChallans(); }, [fetchChallans]);

  const handlePay = async (challan) => {
    setPayingId(challan.id);
    try {
      const res = await api.post(`/challans/${challan.id}/pay`);
      setChallans(prev => prev.map(c => c.id === challan.id ? { ...res.challan, semester: c.semester } : c));
      showToast(res.message);
    } catch (err) {
      showToast(err.message || 'Failed to submit payment.', 'error');
    } finally { setPayingId(null); }
  };

  // Most recent semester first, same ordering convention as My Courses / My Attendance.
  const sorted = [...challans].sort((a, b) =>
    b.registration.year - a.registration.year || SEMESTER_RANK[b.registration.semester] - SEMESTER_RANK[a.registration.semester]
  );

  return (
    <DashboardLayout pageTitle="Fee Challan">
      <Toast msg={toast.msg} type={toast.type} onClose={hideToast} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Fee Challan</h1>
          <p className="page-subtitle">
            Generated automatically from your registered credit hours (Rs. 9,000 per credit hour), separated by semester.
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="table-empty"><p>Loading fee challans…</p></div>
      ) : error ? null : sorted.length === 0 ? (
        <div className="table-empty">
          <LuWallet size={32} color="#cbd5e1" />
          <p>No fee challan yet. One is generated automatically once you register for courses.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {sorted.map((c, idx) => {
            const sm = STATUS_META[c.status] || STATUS_META.UNPAID;
            return (
              <div key={c.id}>
                {idx > 0 && <hr className="sidebar-divider" style={{ margin: '0 0 1.75rem' }} />}
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.75rem' }}>
                  {semesterHeading(c)}
                </h3>
                <div className="sections-grid">
                  <div className="section-detail-card">
                    <div className="section-detail-header">
                      <span className="status-pill" style={{ color: sm.color, background: sm.bg, borderColor: sm.border }}>
                        {c.status === 'PAID' && <LuCircleCheck size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />}
                        {c.status === 'PENDING_APPROVAL' && <LuClock size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />}
                        {sm.label}
                      </span>
                    </div>

                    <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#164E63', margin: '0.5rem 0 0.1rem' }}>
                      {formatPKR(c.amount)}
                    </p>

                    <p className="section-empty" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <LuBanknote size={13} /> Pay to account: <strong>{c.accountNumber}</strong>
                    </p>

                    {c.status === 'UNPAID' && (
                      <button
                        className="btn-primary btn-with-icon"
                        style={{ marginTop: '0.75rem', padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
                        disabled={payingId === c.id}
                        onClick={() => handlePay(c)}
                      >
                        {payingId === c.id ? 'Submitting…' : 'Pay Fee'}
                      </button>
                    )}
                    {c.status === 'PENDING_APPROVAL' && (
                      <p className="field-hint" style={{ marginTop: '0.75rem' }}>
                        Payment submitted. Waiting for admin approval.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
