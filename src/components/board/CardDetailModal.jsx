import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getChecklists,
  createChecklist,
  createChecklistItem,
  toggleChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  updateChecklistItemName,
} from '../../api/checklistApi';
import { updateCard } from '../../api/cardApi';

export default function CardDetailModal({ card, onClose, onUpdated }) {
  const [checklists, setChecklists] = useState([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItems, setNewItems] = useState({});

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(card.cardTitle || '');
  const [openMenuItemId, setOpenMenuItemId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const menuRef = useRef(null);

  const loadChecklists = useCallback(async () => {
    try {
      const data = await getChecklists(card.cardID);
      setChecklists(data || []);
    } catch (err) {
      console.error('Failed to load checklists', err);
    }
  }, [card.cardID]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      const data = await getChecklists(card.cardID);
      if (isMounted) {
        setChecklists(data || []);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [card.cardID]);


  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuItemId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    await createChecklist({ cardID: card.cardID, checklistTitle: newChecklistTitle.trim() });
    setNewChecklistTitle('');
    loadChecklists();
  };

  const handleAddItem = async (checklistId) => {
    const text = newItems[checklistId];
    if (!text?.trim()) return;
    await createChecklistItem({ checklistID: checklistId, itemName: text.trim() });
    setNewItems((prev) => ({ ...prev, [checklistId]: '' }));
    loadChecklists();
  };

  const handleToggleItem = async (itemId, isCompleted) => {
    await toggleChecklistItem(itemId, !isCompleted);
    loadChecklists();
  };


  const handleDeleteChecklist = async (checklistId, checklistTitle, itemCount) => {
    const confirmed = window.confirm(
      `Delete "${checklistTitle}" checklist and all ${itemCount} task(s) inside it? This cannot be undone.`
    );
    if (!confirmed) return;
    await deleteChecklist(checklistId);
    loadChecklists();
  };


  const handleRemoveItem = async (itemId) => {
    setOpenMenuItemId(null);
    await deleteChecklistItem(itemId);
    loadChecklists();
  };


  const handleStartEdit = (item) => {
    setOpenMenuItemId(null);
    setEditingItemId(item.checklistItemID);
    setEditingText(item.itemName);
  };

  const handleSaveEdit = async (itemId) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      setEditingItemId(null);
      return;
    }
    await updateChecklistItemName(itemId, trimmed);
    setEditingItemId(null);
    loadChecklists();
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingText('');
  };

  const handleClose = () => {
    onUpdated?.();
    onClose();
  };

  const handleSaveTitle = async () => {
    const trimmed = titleText.trim();
    if (!trimmed || trimmed === card.cardTitle) {
      setIsEditingTitle(false);
      setTitleText(card.cardTitle || '');
      return;
    }
    await updateCard({
      cardID: card.cardID,
      cardTitle: trimmed,
      cardStatusID: card.cardStatusID,
    });
    setIsEditingTitle(false);
    onUpdated?.();
  };

  const handleCancelTitle = () => {
    setTitleText(card.cardTitle || '');
    setIsEditingTitle(false);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, padding: 24, width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0, gap: 12 }}>
          {isEditingTitle ? (
            <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                autoFocus
                type="text"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') handleCancelTitle();
                }}
                style={{ flex: 1, fontSize: 18, fontWeight: 600, padding: '4px 8px', border: '1px solid #2563eb', borderRadius: 6 }}
              />
              <button
                onClick={handleSaveTitle}
                style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                Save
              </button>
              <button
                onClick={handleCancelTitle}
                style={{ padding: '4px 10px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <h2
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit"
              style={{ margin: 0, fontSize: 18, cursor: 'pointer', flex: 1 }}
            >
              {card.cardTitle}
            </h2>
          )}
          <button onClick={handleClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>×</button>
        </div>

        {/* Card Info */}
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, display: 'flex', gap: 16, flexShrink: 0 }}>
          {card.dueDate && <span>📅 {new Date(card.dueDate).toISOString().slice(0, 10)}</span>}
          {card.assignedUserName && <span>👤 {card.assignedUserName}</span>}
          {card.priorityName && <span>🔴 {card.priorityName}</span>}
        </div>

        <hr style={{ marginBottom: 20, flexShrink: 0 }} />
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          <h4 style={{ margin: '0 0 12px' }}>✅ Checklists</h4>

          {checklists.map((cl) => {
            const completed = cl.items.filter((i) => i.isCompleted).length;
            const total = cl.items.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div key={cl.checklistID} style={{ marginBottom: 20, background: '#f9fafb', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: 14 }}>{cl.checklistTitle}</strong>
                  {/* Top-level Delete - (all tasks) delete*/}
                  <button
                    onClick={() => handleDeleteChecklist(cl.checklistID, cl.checklistTitle, total)}
                    style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
                  >
                    Delete
                  </button>
                </div>

                {/* Progress bar */}
                {total > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{percent}% ({completed}/{total})</div>
                    <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${percent}%`, background: '#22c55e', height: 6, borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}

                <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
                  {cl.items.map((item) => {
                    const isEditing = editingItemId === item.checklistItemID;
                    const isMenuOpen = openMenuItemId === item.checklistItemID;

                    return (
                      <div
                        key={item.checklistItemID}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '4px 0',
                          position: 'relative',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={() => handleToggleItem(item.checklistItemID, item.isCompleted)}
                        />

                        {isEditing ? (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <input
                              autoFocus
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.checklistItemID);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              style={{
                                width: '100%',
                                fontSize: 13,
                                padding: '6px 8px',
                                border: '1px solid #2563eb',
                                borderRadius: 6,
                                boxSizing: 'border-box',
                              }}
                            />
                            {/* Clean text-based Save/Cancel buttons */}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => handleSaveEdit(item.checklistItemID)}
                                style={{
                                  padding: '4px 12px',
                                  background: '#2563eb',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                style={{
                                  padding: '4px 12px',
                                  background: '#fff',
                                  color: '#374151',
                                  border: '1px solid #d1d5db',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span
                            onClick={() => handleStartEdit(item)}
                            title="Click to edit"
                            style={{
                              flex: 1,
                              fontSize: 13,
                              cursor: 'pointer',
                              textDecoration: item.isCompleted ? 'line-through' : 'none',
                              color: item.isCompleted ? '#9ca3af' : '#111827',
                            }}
                          >
                            {item.itemName}
                          </span>
                        )}
                        {!isEditing && (
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setOpenMenuItemId(isMenuOpen ? null : item.checklistItemID)}
                            aria-label="Item options"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#6b7280',
                              cursor: 'pointer',
                              fontSize: 16,
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            ⋮
                          </button>

                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                background: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: 6,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                zIndex: 10,
                                minWidth: 130,
                              }}
                            >
                              <button
                                onClick={() => handleRemoveItem(item.checklistItemID)}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '8px 12px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#ef4444',
                                  fontSize: 13,
                                  cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                Remove Task
                              </button>
                            </div>
                          )}
                        </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Item */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="Add item..."
                    value={newItems[cl.checklistID] || ''}
                    onChange={(e) => setNewItems((prev) => ({ ...prev, [cl.checklistID]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem(cl.checklistID)}
                    style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                  />
                  <button
                    onClick={() => handleAddItem(cl.checklistID)}
                    style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
                  >
                    Add
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Checklist */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              type="text"
              placeholder="New checklist title..."
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
              style={{ flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
            />
            <button
              onClick={handleAddChecklist}
              style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
            >
              + Checklist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
