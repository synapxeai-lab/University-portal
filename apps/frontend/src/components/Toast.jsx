import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LuTriangleAlert, LuCircleCheck, LuX } from 'react-icons/lu';

export default function Toast({ msg, type, onClose }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [msg, onClose]);

  if (!msg) return null;
  const isErr = type === 'error';
  return createPortal(
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      background: isErr ? '#fef2f2' : '#f0fdf4',
      border: `1px solid ${isErr ? '#fecaca' : '#bbf7d0'}`,
      color: isErr ? '#b91c1c' : '#166534',
      padding: '0.75rem 1.1rem', borderRadius: 10,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      fontSize: '0.87rem', fontWeight: 600, maxWidth: 340,
      animation: 'fadeIn 0.2s ease',
    }}>
      {isErr ? <LuTriangleAlert size={17} /> : <LuCircleCheck size={17} />}
      <span>{msg}</span>
      <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'inherit' }}><LuX size={15} /></button>
    </div>,
    document.body
  );
}
