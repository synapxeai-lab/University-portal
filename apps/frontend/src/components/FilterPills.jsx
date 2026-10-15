// A labelled row of pill buttons for picking one filter value, e.g.
//   STATUS:  (All) (Paid) (Unpaid)
// options: [{ value, label, count? }] — `value` is compared with ===, so keep
// option values and the state they're compared against the same type.
export default function FilterPills({ label, options, value, onChange }) {
  return (
    <div className="filter-pills" role="group" aria-label={label}>
      {label && <span className="filter-pills-label">{label}:</span>}
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            className={`filter-pill${active ? ' active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(o.value)}
          >
            {o.label}
            {o.count != null && <span className="filter-pill-count">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
