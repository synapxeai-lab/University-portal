import { percentStyle, fmtMark } from '../utils/marks.js';

const MUTED = { color: '#64748B', background: '#f1f5f9', borderColor: '#E2E8F0' };

// Percentage pill plus letter grade for one student's course summary.
// Shows "No marks" until at least one assessment is graded.
export default function MarksResult({ summary }) {
  if (!summary || summary.percentage === null) {
    return <span className="status-pill" style={MUTED}>No marks</span>;
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
      <span className="status-pill" style={percentStyle(summary.percentage)} title={summary.adjusted ? 'Adjusted by admin' : undefined}>
        {fmtMark(summary.percentage)}%{summary.adjusted ? ' · Adjusted' : ''}
      </span>
      <span style={{ fontWeight: 700, minWidth: '1.6rem' }}>{summary.grade}</span>
    </span>
  );
}
