import { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export default function Modal({ open, title, children, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,24,39,0.28)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 40
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(560px, 92vw)',
          borderRadius: 6,
          background: '#fff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          padding: 16
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <strong>{title}</strong>
          <button onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
