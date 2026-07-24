
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

import { updateCard, getUsers, getCardMembers, addCardMember, removeCardMember } from '../../api/cardApi';


export default function CardDetailModal({ card, onClose, onUpdated }) {
  const [checklists, setChecklists] = useState([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItems, setNewItems] = useState({});
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(card.cardTitle || '');
  const [openMenuItemId, setOpenMenuItemId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const menuRef = useRef(null);
  const memberDropdownRef = useRef(null);

  const normalizeUserId = (value) => {
    if (value == null || value === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  };

  const loadChecklists = useCallback(async () => {
    try {
      const checklistData = await getChecklists(card.cardID);
      setChecklists(checklistData || []);
    } catch (err) {
      console.error('Failed to load checklists', err);
      setChecklists([]);
    }
  }, [card.cardID]);

  const loadMembers = useCallback(async () => {
    try {
      const memberData = await getCardMembers(card.cardID);
      setMembers(memberData || []);
    } catch (err) {
      console.error('Failed to load card members', err);
      setMembers([]);
    }
  }, [card.cardID]);


    useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [checklistData, memberData, userData] = await Promise.all([
          getChecklists(card.cardID),
          getCardMembers(card.cardID),
          getUsers(),
        ]);
        if (isMounted) {
          setChecklists(checklistData || []);
          setMembers(memberData || []);
          setUsers(userData || []);
        }
      } catch (err) {
        console.error('Failed to load card detail data', err);
        if (isMounted) {
          setChecklists([]);
          setMembers([]);
          setUsers([]);
        }
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [card.cardID]);

  const assignedUserId = normalizeUserId(card.assignedUserID ?? card.assignedUserId);
  const assignedUserFromList = users.find(
    (user) => normalizeUserId(user.userId ?? user.userID) === assignedUserId
  );
  const hasAssignedUserInMembers = members.some(
    (member) => normalizeUserId(member.userID ?? member.userId) === assignedUserId
  );
  const visibleMembers = assignedUserId && assignedUserFromList && !hasAssignedUserInMembers
    ? [
        {
          ...assignedUserFromList,
          userID: assignedUserFromList.userID ?? assignedUserFromList.userId,
          isFallbackAssignedUser: true,
        },
        ...members,
      ]
    : members;
  const visibleMemberIds = new Set(
    visibleMembers.map((member) => normalizeUserId(member.userID ?? member.userId)).filter((id) => id != null)
  );

  // Bahar click karne par 3-dot menu aur member dropdown band ho jaayein
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuItemId(null);
      }
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(e.target)) {
        setShowMemberDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddMember = async (userId) => {
    await addCardMember(card.cardID, userId);
    loadMembers();
  };

  const handleRemoveMember = async (userId) => {
    await removeCardMember(card.cardID, userId);
    loadMembers();
  };

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    await createChecklist({ cardID: card.cardID, checklistTitle: newChecklistTitle.trim() });
    setNewChecklistTitle('');
    loadChecklists();
  };

  const handleAddItem = async (checklistId) => {
    const text = newItems[checklistId];
    if (!text?.trim()) return;
    const checklistAssignedUserId = assignedUserId ?? normalizeUserId(visibleMembers[0]?.userID ?? visibleMembers[0]?.userId);
    if (!checklistAssignedUserId) {
      window.alert('Assign a user to this card before adding checklist items.');
      return;
    }
    await createChecklistItem({
      checklistID: checklistId,
      itemName: text.trim(),
      assignedUserID: checklistAssignedUserId,
    });
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
    // await updateCard({ cardID: card.cardID, cardTitle: trimmed, cardStatusID: card.cardStatusID });
    await updateCard({
      cardID: card.cardID,
      cardTitle: trimmed,
      cardStatusID: card.cardStatusID,
    });
    setTitleText(trimmed);
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
        {/* Header */}
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
              {titleText || card.cardTitle}
            </h2>
          )}
          <button onClick={handleClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>×</button>
        </div>

        {/* Card Info */}
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, display: 'flex', gap: 16, flexShrink: 0 }}>
          {card.dueDate && <span>📅 {new Date(card.dueDate).toISOString().slice(0, 10)}</span>}
          {card.priorityName && <span>🔴 {card.priorityName}</span>}
        </div>

        {/* MEMBERS section - Trello-style */}
        <div style={{ marginBottom: 16, flexShrink: 0 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Members
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {/* Current members ke avatars */}
            {visibleMembers.map((m) => {
              const initials = `${m.firstName?.[0] || ''}${m.lastName?.[0] || ''}`.toUpperCase() || m.userName?.slice(0, 2).toUpperCase() || '?';
              return (
                <div
                  key={`${m.userID ?? m.userId}-${m.isFallbackAssignedUser ? 'assigned' : 'member'}`}
                  title={m.isFallbackAssignedUser ? `${m.firstName} ${m.lastName} — assigned user` : `${m.firstName} ${m.lastName} — click to remove`}
                  onClick={() => {
                    if (!m.isFallbackAssignedUser) {
                      handleRemoveMember(m.userID ?? m.userId);
                    }
                  }}
style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#4338ca', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, cursor: m.isFallbackAssignedUser ? 'default' : 'pointer',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!m.isFallbackAssignedUser) e.currentTarget.style.opacity = '0.7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {initials}
                </div>
              );
            })}

            {/* + button — user add karne ke liye */}
            <div style={{ position: 'relative' }} ref={memberDropdownRef}>
              <button
                onClick={() => setShowMemberDropdown((v) => !v)}
                title="Add member"
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#e5e7eb', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, cursor: 'pointer', color: '#374151', fontWeight: 400,
                }}
              >
                +
              </button>

              {showMemberDropdown && (
                <div style={{
                  position: 'absolute', left: 0, top: '110%',
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 20, minWidth: 180, maxHeight: 220, overflowY: 'auto',
                }}>
                  <p style={{ margin: '8px 12px 4px', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>
                    Add member
                  </p>
                  {users
                    .filter((u) => !visibleMemberIds.has(normalizeUserId(u.userId ?? u.userID)))
                    .map((u) => ( <button
                        key={u.userId}
                        onClick={() => { handleAddMember(u.userId); setShowMemberDropdown(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '7px 12px',
                          border: 'none', background: 'transparent',
                          fontSize: 13, cursor: 'pointer', textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: '#4338ca', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                        }}>
                          {`${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase()}
 </div>
                        {u.firstName} {u.lastName}
  </button>
                    ))}
                  {users.filter((u) => !visibleMemberIds.has(normalizeUserId(u.userId ?? u.userID))).length === 0 && (
                    <p style={{ margin: '8px 12px', fontSize: 12, color: '#9ca3af' }}>All users already added</p>
                  )}
                </div>
              )}
            </div>
 </div>
        </div>

        <hr style={{ marginBottom: 20, flexShrink: 0 }} />
                {/* Yeh poora block scroll hota hai - title fixed rehta hai, andar checklists scroll hoti hain */}
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
                  {/* Top-level Delete - poori checklist (all tasks) delete karta hai */}
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

                {/* Items - fixed height ke andar apna khud ka scrollbar (jaisa reference screenshot mein tha) */}
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

                        {/* 3-dot menu - edit mode mein hide rehta hai, taaki clutter na ho */}
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
