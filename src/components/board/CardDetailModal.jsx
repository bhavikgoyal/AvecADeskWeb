import { useEffect, useState, useRef } from 'react';
import {
  getChecklists,
  createChecklist,
  createChecklistItem,
  toggleChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  updateChecklistItemName,
} from '../../api/checklistApi';
import { updateCard, getUsers } from '../../api/cardApi';

export default function CardDetailModal({ card, onClose, onUpdated }) {
  const [checklists, setChecklists] = useState([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  const [newItems, setNewItems] = useState({});
  const [newItemUsers, setNewItemUsers] = useState({});
  const [userSearch, setUserSearch] = useState({});
  const [userDropdownOpen, setUserDropdownOpen] = useState({});

  const [users, setUsers] = useState([]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(card.cardTitle || '');
  const [openMenuItemId, setOpenMenuItemId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const menuRefs = useRef({});
  const dropdownRefs = useRef({});

  useEffect(() => {
    const styleId = "forced-modal-scrollbar-styles";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.innerHTML = `
        .custom-modal-scrollbar::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
          display: block !important;
        }
        .custom-modal-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9 !important;
          border-radius: 6px !important;
        }
        .custom-modal-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1 !important;
          border-radius: 6px !important;
          border: 2px solid #f1f5f9 !important;
        }
        .custom-modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8 !important;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await getUsers();
        setUsers(data || []);
      } catch (err) {
        console.error('Failed to load users', err);
      }
    })();
  }, []);

  useEffect(() => {
    const fetchChecklists = async () => {
      try {
        const data = await getChecklists(card.cardID);
        setChecklists(data || []);
      } catch (err) {
        console.error("Failed to load checklists", err);
      }
    };
    fetchChecklists();
  }, [card.cardID]);

  const loadChecklists = async () => {
    try {
      const data = await getChecklists(card.cardID);
      setChecklists(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (openMenuItemId !== null) {
        const ref = menuRefs.current[openMenuItemId];
        if (ref && !ref.contains(e.target)) setOpenMenuItemId(null);
      }
      Object.keys(userDropdownOpen).forEach((key) => {
        if (userDropdownOpen[key]) {
          const ref = dropdownRefs.current[key];
          if (ref && !ref.contains(e.target)) {
            setUserDropdownOpen((prev) => ({ ...prev, [key]: false }));
          }
        }
      });
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuItemId, userDropdownOpen]);

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    await createChecklist({ cardID: card.cardID, checklistTitle: newChecklistTitle.trim() });
    setNewChecklistTitle('');
    loadChecklists();
  };

  const handleAddItem = async (checklistId) => {
    const text = newItems[checklistId];
    if (!text?.trim()) return;

    const assignedUserID = newItemUsers[checklistId] ?? card.assignedUserID ?? 0;

    await createChecklistItem({
      checklistID: checklistId,
      itemName: text.trim(),
      assignedUserID,
    });

    setNewItems((prev) => ({ ...prev, [checklistId]: '' }));
    setNewItemUsers((prev) => ({ ...prev, [checklistId]: assignedUserID }));
    setUserSearch((prev) => ({ ...prev, [`new-${checklistId}`]: '' }));

    await loadChecklists();
    onUpdated?.();
  };

  
  const handleUpdateCardAssignee = async (userId) => {
    try {
      await updateCard({
        cardID: card.cardID,
        cardTitle: card.cardTitle,
        cardStatusID: card.cardStatusID,
        assignedUserID: userId,
      });
      onUpdated?.(); 
    } catch (err) {
      console.error('Failed to update card assignee', err);
    }
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
    if (!trimmed) { setEditingItemId(null); return; }
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
    await updateCard({ cardID: card.cardID, cardTitle: trimmed, cardStatusID: card.cardStatusID });
    setIsEditingTitle(false);
    onUpdated?.();
  };

  const handleCancelTitle = () => {
    setTitleText(card.cardTitle || '');
    setIsEditingTitle(false);
  };

  const UserDropdown = ({ dropdownKey, currentUserId, onSelectUser }) => {
    const isOpen = userDropdownOpen[dropdownKey] || false;
    const search = userSearch[dropdownKey] || '';

    const selectedUser = users.find((u) => u.userId === currentUserId);
    const filtered = users.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div
        ref={(el) => { dropdownRefs.current[dropdownKey] = el; }}
        style={{ position: 'relative', minWidth: 140 }}
      >
        <button
          onClick={() => setUserDropdownOpen((prev) => ({ ...prev, [dropdownKey]: !isOpen }))}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6,
            background: '#fff', fontSize: 12, cursor: 'pointer', justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%', background: '#2563eb',
              color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 600, flexShrink: 0,
            }}>
              {selectedUser ? `${selectedUser.firstName?.[0] || ''}${selectedUser.lastName?.[0] || ''}` : '?'}
            </span>
            <span style={{ color: '#374151', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName?.[0]}.` : 'Assign'}
            </span>
          </span>
          <span style={{ color: '#9ca3af', fontSize: 10 }}>▾</span>
        </button>

        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              width: 260,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              boxShadow: "0 10px 25px rgba(0,0,0,.15)",
              zIndex: 9999,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
              <input
                autoFocus
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) =>
                  setUserSearch((prev) => ({ ...prev, [dropdownKey]: e.target.value }))
                }
                style={{
                  width: "100%", height: 36, padding: "0 12px",
                  border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  No users found
                </div>
              ) : (
                filtered.map((u) => (
                  <div
                    key={u.userId}
                    onClick={() => {
                      onSelectUser(u.userId);
                      setUserDropdownOpen((prev) => ({ ...prev, [dropdownKey]: false }));
                      setUserSearch((prev) => ({ ...prev, [dropdownKey]: "" }));
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = currentUserId === u.userId ? "#eff6ff" : "#fff";
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", cursor: "pointer",
                      background: currentUserId === u.userId ? "#eff6ff" : "#fff",
                    }}
                  >
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: "#2563eb", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 600, flexShrink: 0,
                      }}
                    >
                      {`${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                        {u.firstName} {u.lastName}
                      </div>
                    </div>

                    {currentUserId === u.userId && (
                      <span style={{ color: "#2563eb", fontSize: 18, fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          width: 640,
          height: '75vh',
          maxHeight: '680px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0, gap: 12 }}>
          {isEditingTitle ? (
            <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                autoFocus type="text" value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') handleCancelTitle(); }}
                style={{ flex: 1, fontSize: 18, fontWeight: 600, padding: '4px 8px', border: '1px solid #2563eb', borderRadius: 6 }}
              />
              <button onClick={handleSaveTitle} style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Save</button>
              <button onClick={handleCancelTitle} style={{ padding: '4px 10px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            </div>
          ) : (
            <h2 onClick={() => setIsEditingTitle(true)} title="Click to edit" style={{ margin: 0, fontSize: 18, cursor: 'pointer', flex: 1 }}>
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

        {/* Main Single Scroll Window */}
        <div
          className="custom-modal-scrollbar"
          style={{
            overflowY: 'scroll',
            WebkitOverflowScrolling: 'touch',
            flex: 1,
            paddingRight: 10
          }}
        >
          <h4 style={{ margin: '0 0 12px' }}>✅ Checklists</h4>

          {checklists.map((cl, clIdx) => {
            const completed = cl.items ? cl.items.filter((i) => i.isCompleted).length : 0;
            const total = cl.items ? cl.items.length : 0;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const targetChecklistID = cl.checklistID || `cl-fallback-${clIdx}`;

            return (
              <div key={targetChecklistID} style={{ marginBottom: 20, background: '#f9fafb', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: 14 }}>{cl.checklistTitle}</strong>
                  <button onClick={() => handleDeleteChecklist(targetChecklistID, cl.checklistTitle, total)}
                    style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                    Delete
                  </button>
                </div>

                {total > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{percent}% ({completed}/{total})</div>
                    <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${percent}%`, background: '#22c55e', height: 6, borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {cl.items?.map((item, idx) => {
                    const isEditing = editingItemId === item.checklistItemID;
                    const isMenuOpen = openMenuItemId === item.checklistItemID;
                    const targetItemID = item.checklistItemID || `item-fallback-${idx}`;

                    return (
                      <div key={targetItemID} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', position: 'relative' }}>
                        <input type="checkbox" checked={item.isCompleted} onChange={() => handleToggleItem(targetItemID, item.isCompleted)} />

                        {isEditing ? (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <input autoFocus type="text" value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(targetItemID); if (e.key === 'Escape') handleCancelEdit(); }}
                              style={{ width: '100%', fontSize: 13, padding: '6px 8px', border: '1px solid #2563eb', borderRadius: 6, boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => handleSaveEdit(targetItemID)} style={{ padding: '4px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Save</button>
                              <button onClick={handleCancelEdit} style={{ padding: '4px 12px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span onClick={() => handleStartEdit(item)} title="Click to edit"
                              style={{ flex: 1, fontSize: 13, cursor: 'pointer', textDecoration: item.isCompleted ? 'line-through' : 'none', color: item.isCompleted ? '#9ca3af' : '#111827' }}
                              onMouseEnter={(e) => { if (!item.isCompleted) e.currentTarget.style.textDecoration = 'underline'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = item.isCompleted ? 'line-through' : 'none'; }}
                            >
                              {item.itemName}
                            </span>

                          
                            <UserDropdown
                              dropdownKey={`edit-${targetItemID}`}
                              currentUserId={card.assignedUserID}
                              onSelectUser={handleUpdateCardAssignee}
                            />
                          </>
                        )}

                        {!isEditing && (
                          <div style={{ position: 'relative' }} ref={(el) => { menuRefs.current[targetItemID] = el; }}>
                            <button onClick={() => setOpenMenuItemId(isMenuOpen ? null : targetItemID)}
                              style={{ border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: 16, padding: '2px 6px', borderRadius: 4 }}>⋮</button>
                            {isMenuOpen && (
                              <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 130 }}>
                                <button onClick={() => handleStartEdit(item)}
                                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#374151', fontSize: 13, cursor: 'pointer' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                  Edit Task
                                </button>
                                <button onClick={() => handleRemoveItem(targetItemID)}
                                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
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

                {/* Add Item Block */}
                <div style={{ marginTop: 10, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="Add item..."
                      value={newItems[targetChecklistID] || ''}
                      onChange={(e) => setNewItems((prev) => ({ ...prev, [targetChecklistID]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem(targetChecklistID)}
                      style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                    />
                    <UserDropdown
                      dropdownKey={`new-${targetChecklistID}`}
                      currentUserId={newItemUsers[targetChecklistID] !== undefined
                        ? newItemUsers[targetChecklistID]
                        : card.assignedUserID}
                      onSelectUser={(userId) => setNewItemUsers((prev) => ({ ...prev, [targetChecklistID]: userId }))}
                    />

                    <button onClick={() => handleAddItem(targetChecklistID)}
                      style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Checklist Input */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingBottom: 24 }}>
            <input type="text" placeholder="New checklist title..."
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
              style={{ flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
            />
            <button onClick={handleAddChecklist}
              style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
              + Checklist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
