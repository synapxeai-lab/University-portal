import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  LuLayers, LuUsers, LuChevronRight, LuLoaderCircle, LuSearch, LuX,
  LuList, LuCircleCheck, LuClock, LuWallet,
} from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import Toast from '../../components/Toast.jsx';
import FilterPills from '../../components/FilterPills.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { api } from '../../services/api.js';
import { SEMESTER_RANK, STATUS_META, formatPKR, calendarLabel } from '../../utils/challans.js';
import { ordinal } from '../../utils/ordinal.js';

const VIEWS = [
  { key: 'all',         label: 'All Challans',    icon: LuList },
  { key: 'departments', label: 'Department Wise', icon: LuLayers },
];

export default function FeeChallansPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'departments' ? 'departments' : 'all';

  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [deptError, setDeptError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDeptLoading(true);
      try {
        const data = await api.get('/departments');
        if (!cancelled) setDepartments(data.departments);
      } catch (err) {
        if (!cancelled) setDeptError(err.message || 'Failed to load departments.');
      } finally {
        if (!cancelled) setDeptLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setView = (key) => setSearchParams(key === 'all' ? {} : { view: key }, { replace: true });

  return (
    <DashboardLayout pageTitle="Fee Challans">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fee Challans</h1>
          <p className="page-subtitle">
            {view === 'all'
              ? 'Every fee challan across all departments. Filter, search, and approve pending payments.'
              : 'Pick a department, then a section, to review and approve student fee payments.'}
          </p>
        </div>
      </div>

      <div className="view-tabs" role="tablist" aria-label="Fee challan view">
        {VIEWS.map(v => (
          <button
            key={v.key}
            role="tab"
            aria-selected={view === v.key}
            className={`view-tab${view === v.key ? ' active' : ''}`}
            onClick={() => setView(v.key)}
          >
            <v.icon size={15} /> {v.label}
          </button>
        ))}
      </div>

      {view === 'all'
        ? <AllChallans departments={departments} />
        : <DepartmentList departments={departments} loading={deptLoading} error={deptError} onOpen={id => navigate(`/admin/fee-challans/${id}`)} />}
    </DashboardLayout>
  );
}

function DepartmentList({ departments, loading, error, onOpen }) {
  if (error) return <div className="alert alert-error">{error}</div>;
  if (loading) {
    return (
      <div className="table-empty">
        <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
        <p>Loading departments…</p>
      </div>
    );
  }
  return (
    <div className="dept-list">
      {departments.map(d => (
        <button key={d.id} className="dept-row" onClick={() => onOpen(d.id)}>
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
            <span><LuUsers size={13} /> {d.studentsCount} students</span>
          </div>
          <LuChevronRight size={18} className="dept-row-chevron" />
        </button>
      ))}
    </div>
  );
}

function AllChallans({ departments }) {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const hideToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get('/challans');
        if (!cancelled) setChallans(data.challans);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load fee challans.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return challans
      .filter(c => !status || c.status === status)
      .filter(c => !departmentId || String(c.student.departmentId) === departmentId)
      .filter(c => !q
        || c.student.name.toLowerCase().includes(q)
        || c.student.rollNo.toLowerCase().includes(q)
        || c.accountNumber.toLowerCase().includes(q))
      .sort((a, b) =>
        // Payments waiting on the admin first, then newest semester first
        (b.status === 'PENDING_APPROVAL') - (a.status === 'PENDING_APPROVAL')
        || b.registration.year - a.registration.year
        || SEMESTER_RANK[b.registration.semester] - SEMESTER_RANK[a.registration.semester]
        || a.student.name.localeCompare(b.student.name));
  }, [challans, search, status, departmentId]);

  const counts = useMemo(() => {
    const out = { UNPAID: 0, PENDING_APPROVAL: 0, PAID: 0 };
    challans.forEach(c => { if (out[c.status] !== undefined) out[c.status] += 1; });
    return out;
  }, [challans]);

  const handleApprove = async () => {
    const challan = confirmTarget;
    setConfirmTarget(null);
    setApprovingId(challan.id);
    try {
      const res = await api.put(`/challans/${challan.id}/approve`);
      setChallans(prev => prev.map(c => c.id === challan.id ? { ...c, status: res.challan.status } : c));
      setToast({ msg: res.message, type: 'success' });
    } catch (err) {
      setToast({ msg: err.message || 'Failed to approve challan.', type: 'error' });
    } finally { setApprovingId(null); }
  };

  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <>
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

      <div className="filters-bar">
        <div className="search-wrap">
          <span className="search-icon"><LuSearch size={15} /></span>
          <input
            className="search-input"
            type="text"
            placeholder="Search by student name, roll no, or account…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear"><LuX size={14} /></button>
          )}
        </div>
      </div>

      <div className="filter-pills-row">
        <FilterPills
          label="Department"
          value={departmentId}
          onChange={setDepartmentId}
          options={[{ value: '', label: 'All' }, ...departments.map(d => ({ value: String(d.id), label: d.name }))]}
        />
        <FilterPills
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All', count: challans.length },
            ...Object.entries(STATUS_META).map(([key, m]) => ({ value: key, label: m.label, count: counts[key] })),
          ]}
        />
      </div>

      <div className="table-card">
        {loading ? (
          <div className="table-empty">
            <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
            <p>Loading fee challans…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <LuWallet size={26} color="#cbd5e1" />
            <p>{challans.length === 0 ? 'No fee challans have been generated yet.' : 'No fee challans match your filters.'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Amount</th>
                  <th>Account</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const sm = STATUS_META[c.status] || STATUS_META.UNPAID;
                  return (
                    <tr key={c.id}>
                      <td className="td-idx">{i + 1}</td>
                      <td>
                        <div className="td-name">{c.student.name}</div>
                        <div className="td-date">{c.student.rollNo} · Batch {c.student.batch} — {c.student.section}</div>
                      </td>
                      <td>{c.student.department?.code || '—'}</td>
                      <td>
                        <div>{c.semester >= 1 && c.semester <= 8 ? `${ordinal(c.semester)} Semester` : '—'}</div>
                        <div className="td-date">{calendarLabel(c)}</div>
                      </td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatPKR(c.amount)}</td>
                      <td className="td-date">{c.accountNumber}</td>
                      <td>
                        <span className="status-pill" style={{ color: sm.color, background: sm.bg, borderColor: sm.border }}>
                          {c.status === 'PAID' && <LuCircleCheck size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />}
                          {c.status === 'PENDING_APPROVAL' && <LuClock size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />}
                          {sm.label}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          {c.status === 'PENDING_APPROVAL' ? (
                            <button
                              className="btn-edit"
                              disabled={approvingId === c.id}
                              onClick={() => setConfirmTarget(c)}
                            >
                              {approvingId === c.id ? 'Approving…' : 'Approve'}
                            </button>
                          ) : <span className="td-date">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
