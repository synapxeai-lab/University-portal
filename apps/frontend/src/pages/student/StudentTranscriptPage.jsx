import { useEffect, useState } from 'react';
import { LuLoaderCircle, LuScrollText } from 'react-icons/lu';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { api } from '../../services/api.js';
import { semesterLabel } from '../../utils/marks.js';

const PENDING = { color: '#64748B', background: '#f1f5f9', borderColor: '#E2E8F0' };

const fmtGpa = (n) => (n === null ? '—' : n.toFixed(2));

function Pending() {
  return <span className="status-pill" style={PENDING}>Pending</span>;
}

export default function StudentTranscriptPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/students/me/transcript')
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load transcript.'); });
    return () => { cancelled = true; };
  }, []);

  return (
    <DashboardLayout pageTitle="Transcript">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transcript</h1>
          <p className="page-subtitle">Your courses, grades and GPA for every semester.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!data && !error ? (
        <div className="table-empty">
          <LuLoaderCircle size={26} className="spin" color="#94a3b8" />
          <p>Loading transcript…</p>
        </div>
      ) : error ? null : data.semesters.length === 0 ? (
        <div className="table-empty">
          <LuScrollText size={32} color="#cbd5e1" />
          <p>You aren't registered for any courses yet.</p>
        </div>
      ) : (
        <>
          <div className="transcript-summary">
            <div>
              <div className="transcript-summary-name">{data.student.name}</div>
              <div className="td-date">
                {data.student.rollNo} · Batch {data.student.batch}
                {data.student.department && ` · ${data.student.department.name}`}
              </div>
            </div>
            <div className="transcript-stats">
              <div className="transcript-stat">
                <span className="transcript-stat-label">Credit Hours</span>
                <span className="transcript-stat-value">{data.totalCreditHours}</span>
              </div>
              <div className="transcript-stat">
                <span className="transcript-stat-label">CGPA</span>
                <span className="transcript-stat-value">{data.cgpa === null ? <Pending /> : fmtGpa(data.cgpa)}</span>
              </div>
            </div>
          </div>

          {data.semesters.map(s => (
            <section key={`${s.semester}-${s.year}`} className="transcript-semester">
              <h3 className="semester-heading">{semesterLabel(s)}</h3>
              <div className="table-card">
                <div className="table-scroll">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Course Code</th>
                        <th>Course Title</th>
                        <th style={{ textAlign: 'center' }}>Credit Hours</th>
                        <th style={{ textAlign: 'center' }}>Grade</th>
                        <th style={{ textAlign: 'center' }}>Grade Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.courses.map((c, i) => (
                        <tr key={c.enrollmentId}>
                          <td className="td-idx">{i + 1}</td>
                          <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{c.code}</td>
                          <td>{c.name}</td>
                          <td style={{ textAlign: 'center' }}>{c.creditHours}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.grade ?? <Pending />}</td>
                          <td style={{ textAlign: 'center' }}>{c.gradePoints === null ? '—' : fmtGpa(c.gradePoints)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="transcript-total">
                        <td colSpan={3}>Semester Total</td>
                        <td style={{ textAlign: 'center' }}>{s.creditHours}</td>
                        <td style={{ textAlign: 'right' }}>SGPA</td>
                        <td style={{ textAlign: 'center' }}>{s.gpa === null ? <Pending /> : fmtGpa(s.gpa)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </section>
          ))}
        </>
      )}
    </DashboardLayout>
  );
}
