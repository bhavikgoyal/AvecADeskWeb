import { useState } from 'react';

export default function AddCardModal({ onSubmit, onClose }) {
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit(title.trim());
    setTitle('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 10, padding: 20, width: 360 }}
      >
        <h3 style={{ marginTop: 0 }}>Add a card</h3>
        <input
          autoFocus
          type="text"
          placeholder="Card title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 16 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{ padding: '6px 14px', border: 'none', borderRadius: 6, background: '#2563eb', color: '#fff' }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
