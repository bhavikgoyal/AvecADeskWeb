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
import { getLabelsByCard, createLabel, deleteLabel } from '../../api/labelApi';

const LABEL_COLORS = [
  '#4bce97', '#f5cd47', '#fea362', '#f87168', '#9f8fef',
  '#579dff', '#60c6d2', '#94c748', '#e774bb', '#8590a2',
];

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const REMINDER_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'At time of due date', value: '0' },
  { label: '5 minutes before', value: '5' },
  { label: '10 minutes before', value: '10' },
  { label: '15 minutes before', value: '15' },
  { label: '1 hour before', value: '60' },
  { label: '2 hours before', value: '120' },
  { label: '1 day before', value: '1440' },
  { label: '2 days before', value: '2880' },
];

const RECURRING_OPTIONS = ['Never', 'Daily', 'Weekly', 'Monthly', 'Yearly'];

// Naya card ka dueDate string ("2026-07-16") ya ISO datetime ho sakta hai - dono ko "YYYY-MM-DD" me normalize karta hai
function normalizeDueDateValue(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60000);
  return localDate.toISOString().slice(0, 10);
}

// dueDate se sirf time (HH:mm) nikalta hai, default "09:00"
function normalizeDueTimeValue(value) {
  if (!value) return '09:00';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '09:00';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Ek month ka poora 6x7 calendar grid banata hai (prev/next month ke overflow days ke saath)
function getMonthGrid(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, currentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, date: new Date(year, month, d) });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    cells.push({ day: next.getDate(), currentMonth: false, date: next });
  }
  return cells;
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

  // Labels
  const [labels, setLabels] = useState([]);
  const [showLabelPopover, setShowLabelPopover] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);

  // Description
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState(card.description || '');

  // Due date + time + calendar
  const [showDueDateEditor, setShowDueDateEditor] = useState(false);
  const [dueDateText, setDueDateText] = useState(normalizeDueDateValue(card.dueDate));
  const [dueTimeText, setDueTimeText] = useState(normalizeDueTimeValue(card.dueDate));
  const [calendarViewDate, setCalendarViewDate] = useState(() => {
    const initial = normalizeDueDateValue(card.dueDate);
    return initial ? new Date(`${initial}T00:00:00`) : new Date();
  });

  // Start date
  const [includeStartDate, setIncludeStartDate] = useState(false);
  const [startDateText, setStartDateText] = useState('');

  // Recurring + Reminder
  const [recurringRule, setRecurringRule] = useState('Never');
  const [reminderOffset, setReminderOffset] = useState(''); // '' = None, else minutes as string

  const menuRef = useRef(null);
  const memberDropdownRef = useRef(null);
  const labelPopoverRef = useRef(null);

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

  const loadLabels = useCallback(async () => {
    try {
      const labelData = await getLabelsByCard(card.cardID);
      setLabels(labelData || []);
    } catch (err) {
      console.error('Failed to load labels', err);
      setLabels([]);
    }
  }, [card.cardID]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [checklistData, memberData, userData, labelData] = await Promise.all([
          getChecklists(card.cardID),
          getCardMembers(card.cardID),
          getUsers(),
          getLabelsByCard(card.cardID),
        ]);
        if (isMounted) {
          setChecklists(checklistData || []);
          setMembers(memberData || []);
          setUsers(userData || []);
          setLabels(labelData || []);
        }
      } catch (err) {
        console.error('Failed to load card detail data', err);
        if (isMounted) {
          setChecklists([]);
          setMembers([]);
          setUsers([]);
          setLabels([]);
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

  // Bahar click karne par 3-dot menu, member dropdown, aur label popover band ho jaayein
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuItemId(null);
      }
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(e.target)) {
        setShowMemberDropdown(false);
      }
      if (labelPopoverRef.current && !labelPopoverRef.current.contains(e.target)) {
        setShowLabelPopover(false);
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

  const handleCreateLabel = async () => {
    const trimmedLabelName = newLabelName.trim();
    if (!trimmedLabelName) return;
    if (!card?.cardID) {
      window.alert('Card is missing. Please reopen the card and try again.');
      return;
    }

    try {
      await createLabel({
        cardID: card.cardID,
        labelName: trimmedLabelName,
        color: newLabelColor,
      });
      setNewLabelName('');
      setNewLabelColor(LABEL_COLORS[0]);
      setShowLabelPopover(false);
      loadLabels();
    } catch (err) {
      console.error('Failed to create label', err);
      window.alert(err?.message || 'Unable to create label. Please try again.');
    }
  };

  const handleDeleteLabel = async (labelId) => {
    try {
      await deleteLabel(labelId);
      loadLabels();
    } catch (err) {
      console.error('Failed to delete label', err);
    }
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

  // "YYYY-MM-DD" + "HH:mm" ko ISO datetime string me convert karta hai (API ke liye)
  const formatDueDateForApi = (dateText, timeText) => {
    if (!dateText) return null;
    const [year, month, day] = dateText.split('-').map(Number);
    const [hours, minutes] = (timeText || '09:00').split(':').map(Number);
    if (!year || !month || !day) return null;
    return new Date(Date.UTC(year, month - 1, day, hours, minutes)).toISOString();
  };

  // Card change hone par saara due-date/start-date/recurring/reminder state reset karo
  useEffect(() => {
    const normalized = normalizeDueDateValue(card.dueDate);
    setDueDateText(normalized);
    setDueTimeText(normalizeDueTimeValue(card.dueDate));
    setCalendarViewDate(normalized ? new Date(`${normalized}T00:00:00`) : new Date());

    const normalizedStart = normalizeDueDateValue(card.startDate);
    setStartDateText(normalizedStart);
    setIncludeStartDate(!!normalizedStart);

    setRecurringRule(card.recurringRule || 'Never');
    setReminderOffset(
      card.reminderOffsetMinutes != null ? String(card.reminderOffsetMinutes) : ''
    );

    setShowDueDateEditor(false);
  }, [card.cardID, card.dueDate, card.startDate, card.recurringRule, card.reminderOffsetMinutes]);

  // Shared payload builder - koi bhi partial save baaki fields ko null nahi karega
  const buildUpdatePayload = (overrides = {}) => ({
    cardID: card.cardID,
    cardTitle: titleText || card.cardTitle,
    description: descriptionText,
    color: card.color,
    dueDate: formatDueDateForApi(dueDateText, dueTimeText),
    startDate: includeStartDate ? formatDueDateForApi(startDateText, '00:00') : null,
    recurringRule: recurringRule === 'Never' ? null : recurringRule,
    reminderOffsetMinutes: reminderOffset === '' ? null : Number(reminderOffset),
    assignedUserID: card.assignedUserID ?? card.assignedUserId ?? null,
    cardStatusID: card.cardStatusID,
    cpID: card.cpID ?? null,
    ...overrides,
  });

  const handleSaveTitle = async () => {
    const trimmed = titleText.trim();
    if (!trimmed || trimmed === card.cardTitle) {
      setIsEditingTitle(false);
      setTitleText(card.cardTitle || '');
      return;
    }
    await updateCard(buildUpdatePayload({ cardTitle: trimmed }));
    setTitleText(trimmed);
    setIsEditingTitle(false);
    onUpdated?.();
  };

  const handleCancelTitle = () => {
    setTitleText(card.cardTitle || '');
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    await updateCard(buildUpdatePayload({ description: descriptionText.trim() || null }));
    setIsEditingDescription(false);
    onUpdated?.();
  };

  const handleCancelDescription = () => {
    setDescriptionText(card.description || '');
    setIsEditingDescription(false);
  };

  const handleSaveDueDate = async () => {
    await updateCard(buildUpdatePayload());
    setShowDueDateEditor(false);
    onUpdated?.();
  };

  const handleClearDueDate = async () => {
    setDueDateText('');
    await updateCard(buildUpdatePayload({ dueDate: null }));
    setShowDueDateEditor(false);
    onUpdated?.();
  };

  const handleCancelDueDate = () => {
    const normalized = normalizeDueDateValue(card.dueDate);
    setDueDateText(normalized);
    setDueTimeText(normalizeDueTimeValue(card.dueDate));
    setCalendarViewDate(normalized ? new Date(`${normalized}T00:00:00`) : new Date());

    const normalizedStart = normalizeDueDateValue(card.startDate);
    setStartDateText(normalizedStart);
    setIncludeStartDate(!!normalizedStart);
    setRecurringRule(card.recurringRule || 'Never');
    setReminderOffset(card.reminderOffsetMinutes != null ? String(card.reminderOffsetMinutes) : '');

    setShowDueDateEditor(false);
  };

  const getDueDateMeta = () => {
    if (!dueDateText) return null;
    const date = new Date(`${dueDateText}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = date < today;
    return {
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isOverdue,
    };
  };

  const dueDateMeta = getDueDateMeta();

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
              <button onClick={handleSaveTitle} style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Save</button>
              <button onClick={handleCancelTitle} style={{ padding: '4px 10px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
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

        {card.priorityName && (
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, display: 'flex', gap: 16, flexShrink: 0 }}>
            <span>🔴 {card.priorityName}</span>
          </div>
        )}

        {/* MEMBERS */}
        <div style={{ marginBottom: 16, flexShrink: 0 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Members
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
                  onMouseEnter={(e) => { if (!m.isFallbackAssignedUser) e.currentTarget.style.opacity = '0.7'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  {initials}
                </div>
              );
            })}

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
                    .map((u) => (
                      <button
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

        {/* LABELS + DUE DATE - side by side, Trello jaisa */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexShrink: 0, flexWrap: 'wrap' }}>

          {/* LABELS */}
          <div style={{ flex: '1 1 200px', minWidth: 200 }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Labels
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {labels.map((l) => (
                <div
                  key={l.labelID ?? l.labelId}
                  title="Click to remove"
                  onClick={() => handleDeleteLabel(l.labelID ?? l.labelId)}
                  style={{
                    padding: '4px 12px', borderRadius: 4, background: l.color || '#94c748',
                    color: '#1f2937', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {l.labelName}
                </div>
              ))}

              <div style={{ position: 'relative' }} ref={labelPopoverRef}>
                <button
                  onClick={() => setShowLabelPopover((v) => !v)}
                  title="Add label"
                  style={{
                    width: 28, height: 28, borderRadius: 6, background: '#e5e7eb', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, cursor: 'pointer', color: '#374151',
                  }}
                >
                  +
                </button>

                {showLabelPopover && (
                  <div style={{
                    position: 'absolute', left: 0, top: '110%', background: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 20, minWidth: 220, padding: 12,
                  }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#374151' }}>Create label</p>
                    <div style={{ height: 32, borderRadius: 4, background: newLabelColor, marginBottom: 10 }} />
                    <input
                      type="text"
                      placeholder="Label name"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }}
                    />
                    <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6b7280' }}>Select a color</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
                      {LABEL_COLORS.map((c) => (
                        <div
                          key={c}
                          onClick={() => setNewLabelColor(c)}
                          style={{
                            height: 24, borderRadius: 4, background: c, cursor: 'pointer',
                            border: newLabelColor === c ? '2px solid #111827' : '2px solid transparent',
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleCreateLabel}
                      disabled={!newLabelName.trim()}
                      style={{
                        width: '100%', padding: '6px 0', background: '#2563eb', color: '#fff', border: 'none',
                        borderRadius: 6, fontSize: 13, fontWeight: 500,
                        cursor: newLabelName.trim() ? 'pointer' : 'not-allowed',
                        opacity: newLabelName.trim() ? 1 : 0.6,
                      }}
                    >
                      Create
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DUE DATE */}
          <div style={{ flex: '1 1 200px', minWidth: 200, position: 'relative' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Due Date
            </p>

            {dueDateText ? (
              <button
                onClick={() => setShowDueDateEditor((v) => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  border: '1px solid #d1d5db', background: '#f3f4f6',
                  borderRadius: 6, padding: '6px 10px', fontSize: 13, cursor: 'pointer', fontWeight: 500, color: '#1f2937',
                }}
              >
                <span>📅</span>
                <span>{dueDateMeta?.label || dueDateText}</span>
                {dueDateMeta?.isOverdue && (
                  <span style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                    Overdue
                  </span>
                )}
                <span style={{ fontSize: 10, color: '#6b7280' }}>▼</span>
              </button>
            ) : (
              <button
                onClick={() => setShowDueDateEditor(true)}
                style={{
                  background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6,
                  color: '#374151', fontSize: 13, cursor: 'pointer', padding: '6px 10px',
                }}
              >
                + Add due date
              </button>
            )}

            {/* Calendar popover - Trello "Dates" jaisa */}
            {showDueDateEditor && (
              <div style={{
                position: 'absolute', left: 0, top: 'calc(100% + 8px)', width: 280,
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                boxShadow: '0 10px 24px rgba(0,0,0,0.15)', padding: 16, zIndex: 30,
                maxHeight: '70vh', overflowY: 'auto',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <strong style={{ fontSize: 14 }}>Dates</strong>
                  <button
                    onClick={() => setShowDueDateEditor(false)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#6b7280' }}
                  >
                    ×
                  </button>
                </div>

                {/* Month navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <button
                    onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: '#374151', padding: 4 }}
                  >
                    ‹
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {MONTH_NAMES[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
                  </span>
                  <button
                    onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: '#374151', padding: 4 }}
                  >
                    ›
                  </button>
                </div>

                {/* Weekday headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
                  {WEEKDAY_LABELS.map((w) => (
                    <div key={w} style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', fontWeight: 600, padding: '2px 0' }}>
                      {w}
                    </div>
                  ))}
                </div>

                {/* Day grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 12 }}>
                  {getMonthGrid(calendarViewDate).map((cell, i) => {
                    const key = toDateKey(cell.date);
                    const isSelected = dueDateText === key;
                    const isToday = key === toDateKey(new Date());
                    return (
                      <button
                        key={i}
                        onClick={() => setDueDateText(key)}
                        style={{
                          aspectRatio: '1', border: 'none', borderRadius: 6,
                          background: isSelected ? '#2563eb' : 'transparent',
                          color: isSelected ? '#fff' : cell.currentMonth ? '#111827' : '#d1d5db',
                          fontWeight: isToday && !isSelected ? 700 : 400,
                          fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>

                {/* Start date */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeStartDate}
                      onChange={(e) => {
                        setIncludeStartDate(e.target.checked);
                        if (e.target.checked && !startDateText) setStartDateText(dueDateText || toDateKey(new Date()));
                      }}
                    />
                    Start date
                  </label>
                  {includeStartDate && (
                    <input
                      type="date"
                      value={startDateText}
                      onChange={(e) => setStartDateText(e.target.value)}
                      style={{ width: '100%', marginTop: 6, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  )}
                </div>

                {/* Due date text field + time */}
                <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Due date</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    type="date"
                    value={dueDateText}
                    onChange={(e) => {
                      setDueDateText(e.target.value);
                      if (e.target.value) setCalendarViewDate(new Date(`${e.target.value}T00:00:00`));
                    }}
                    style={{ flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                  />
                  <input
                    type="time"
                    value={dueTimeText}
                    onChange={(e) => setDueTimeText(e.target.value || '09:00')}
                    style={{ width: 100, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                {/* Recurring */}
                <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Recurring</p>
                <select
                  value={recurringRule}
                  onChange={(e) => setRecurringRule(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', background: '#fff' }}
                >
                  {RECURRING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                {/* Reminder */}
                <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Set due date reminder</p>
                <select
                  value={reminderOffset}
                  onChange={(e) => setReminderOffset(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 8, boxSizing: 'border-box', background: '#fff' }}
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: '#9ca3af' }}>
                  Reminders will be sent to all members and watchers of this card.
                </p>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSaveDueDate} style={{ flex: 1, padding: '7px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Save</button>
                  <button onClick={handleCancelDueDate} style={{ padding: '7px 10px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                </div>
                {card.dueDate && (
                  <button onClick={handleClearDueDate} style={{ width: '100%', marginTop: 8, padding: '7px 10px', background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    Remove due date
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <hr style={{ marginBottom: 20, flexShrink: 0 }} />

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>

          {/* DESCRIPTION */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 8px' }}>📝 Description</h4>
            {isEditingDescription ? (
              <div>
                <textarea
                  autoFocus
                  value={descriptionText}
                  onChange={(e) => setDescriptionText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') handleCancelDescription(); }}
                  rows={4}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #2563eb', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={handleSaveDescription} style={{ padding: '5px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Save</button>
                  <button onClick={handleCancelDescription} style={{ padding: '5px 14px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDescription(true)}
                title="Click to edit"
                style={{
                  padding: '8px 10px', background: '#f9fafb', borderRadius: 6, fontSize: 13,
                  cursor: 'pointer', minHeight: 20, color: descriptionText ? '#111827' : '#9ca3af',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {descriptionText || 'Add a more detailed description...'}
              </div>
            )}
          </div>

          <h4 style={{ margin: '0 0 12px' }}>✅ Checklists</h4>

          {checklists.map((cl) => {
            const completed = cl.items.filter((i) => i.isCompleted).length;
            const total = cl.items.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div key={cl.checklistID} style={{ marginBottom: 20, background: '#f9fafb', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: 14 }}>{cl.checklistTitle}</strong>
                  <button
                    onClick={() => handleDeleteChecklist(cl.checklistID, cl.checklistTitle, total)}
                    style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
                  >
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

                <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
                  {cl.items.map((item) => {
                    const isEditing = editingItemId === item.checklistItemID;
                    const isMenuOpen = openMenuItemId === item.checklistItemID;

                    return (
                      <div key={item.checklistItemID} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', position: 'relative' }}>
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
                              style={{ width: '100%', fontSize: 13, padding: '6px 8px', border: '1px solid #2563eb', borderRadius: 6, boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => handleSaveEdit(item.checklistItemID)} style={{ padding: '4px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Save</button>
                              <button onClick={handleCancelEdit} style={{ padding: '4px 12px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <span
                            onClick={() => handleStartEdit(item)}
                            title="Click to edit"
                            style={{
                              flex: 1, fontSize: 13, cursor: 'pointer',
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
                              style={{ border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: 16, padding: '2px 6px', borderRadius: 4 }}
                            >
                              ⋮
                            </button>

                            {isMenuOpen && (
                              <div ref={menuRef} style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 130 }}>
                                <button
                                  onClick={() => handleRemoveItem(item.checklistItemID)}
                                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}
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
