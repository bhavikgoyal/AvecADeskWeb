import { useState } from 'react';

export default function AddListComposer({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const listName = name.trim();
    if (!listName || saving) return;
    setSaving(true);
    try {
      await onAdd(listName);
      setName('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add list"
        style={{
          minWidth: 44,
          width: 44,
          height: 44,
          flex: '0 0 44px',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          background: '#fff',
          color: '#111827',
          fontSize: 28,
          lineHeight: 1,
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        +
      </button>
    );
  }

  return (
    <div
      style={{
        minWidth: 260,
        width: 260,
        flex: '0 0 260px',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 12,
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
      }}
    >
      <input
        autoFocus
        type="text"
        placeholder="Enter list name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '2px solid #2563eb',
          borderRadius: 8,
          fontSize: 14,
          outline: 'none',
          boxSizing: 'border-box',
          marginBottom: 10,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !name.trim()}
          style={{
            padding: '8px 14px',
            border: 'none',
            borderRadius: 8,
            background: '#2563eb',
            color: '#fff',
            fontWeight: 600,
            cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          Add list
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setName('');
          }}
          aria-label="Close"
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: 22,
            lineHeight: 1,
            cursor: 'pointer',
            color: '#111827',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
