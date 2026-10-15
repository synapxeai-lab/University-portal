import { createPortal } from 'react-dom';
import { LuX, LuPencil } from 'react-icons/lu';

// Read-only popup listing a record's full information in labelled groups.
//   sections: [{ heading, fields: [[label, value], ...] }]
// A field whose value is a React node (e.g. a badge or list) renders as-is.
export default function DetailsModal({ title, subtitle, badge, sections, onEdit, onClose }) {
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            {(subtitle || badge) && (
              <div className="details-subtitle">
                {badge}
                {subtitle && <span>{subtitle}</span>}
              </div>
            )}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close"><LuX size={15} /></button>
        </div>

        <div className="details-body">
          {sections.map(s => (
            <section key={s.heading} className="details-section">
              <h3 className="details-heading">{s.heading}</h3>
              <dl className="details-grid">
                {s.fields.map(([label, value]) => (
                  <div key={label} className={`details-field${s.fields.length === 1 ? ' details-field-wide' : ''}`}>
                    <dt>{label}</dt>
                    <dd>{value === null || value === undefined || value === '' ? '—' : value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose}>Close</button>
          {onEdit && (
            <button type="button" className="btn-primary btn-with-icon" onClick={onEdit}>
              <LuPencil size={14} /> Edit
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
