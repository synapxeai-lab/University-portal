import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LuLoaderCircle, LuClipboardList, LuChevronRight } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import FilterPills from '../../components/FilterPills.jsx';
import { api } from '../../services/api.js';
import { semesterLabel, percentStyle, summaryText } from '../../utils/marks.js';

const groupKey = (g) => `${g.semester}-${g.year}`;

export default function StudentMarksPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/students/me/marks')
      .then(res => { if (!cancelled) setGroups(res.groups); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load marks.'); });
    return () => { cancelled = true; };
  }, []);

  // Selected semester lives in the URL so returning from a course page keeps it.
  // Groups come most-recent first, so the first one is the current semester.
  const selected = searchParams.get('semester') || (groups?.[0] && groupKey(groups[0]));
  const current = groups?.find(g => groupKey(g) === selected) || groups?.[0];

  return (
    <DashboardLayout pageTitle="Marks">
      <div className="page-header">
        <div>
          <h1 className="page-title">Marks</h1>
          <p className="page-subtitle">Pick a semester, then a course, to see the marks your teacher has added.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!groups && !error ? (
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading marks…</p>
        </div>
      ) : error ? null : groups.length === 0 ? (
        <div className="table-empty">
          <LuClipboardList size={32} color="#cbd5e1" />
          <p>You aren't registered for any courses yet.</p>
        </div>
      ) : (
        <>
          <FilterPills
            label="Semester"
            value={groupKey(current)}
            onChange={key => setSearchParams({ semester: key }, { replace: true })}
            options={groups.map((g, idx) => ({ value: groupKey(g), label: `${semesterLabel(g)}${idx === 0 ? ' (Current)' : ''}` }))}
          />

          <div className="course-list">
            {current.courses.map(c => (
              <div key={c.enrollmentId} className="course-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <button className="course-row-main" onClick={() => navigate(`/student/marks/${c.enrollmentId}`)}>
                  <div className="course-code-badge" style={{ color: c.department.color, background: c.department.bg }}>
                    {c.code}
                  </div>
                  <div className="course-info">
                    <p className="course-name">{c.name}</p>
                    <div className="course-row-meta">
                      <span className="dept-badge-pill" style={{ color: c.department.color, background: c.department.bg }}>
                        {c.department.name}
                      </span>
                      <span className="course-row-semester">Section {c.section.label} · {c.creditHours} Cr.</span>
                    </div>
                  </div>
                  {summaryText(c.summary) ? (
                    <span className="status-pill" style={percentStyle(c.summary.percentage)}>
                      {summaryText(c.summary)}
                    </span>
                  ) : (
                    <span className="status-pill" style={{ color: '#64748B', background: '#f1f5f9', borderColor: '#E2E8F0' }}>
                      No marks yet
                    </span>
                  )}
                  <LuChevronRight size={16} className="course-card-chevron" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
