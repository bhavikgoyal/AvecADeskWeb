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
import { getCardLabels, createLabel, deleteLabel } from '../../api/labelApi';
import { useAuth } from '../../hooks/useAuth';

const COMMENTS_MARKER = '\n<!--AVEC_COMMENTS\n';
const COMMENTS_MARKER_END = '\n-->\n';

function parseDescriptionStorage(value) {
  if (!value) return { body: '', comments: [] };
  const idx = value.indexOf(COMMENTS_MARKER);
  if (idx === -1) return { body: value, comments: [] };
  const body = value.slice(0, idx).replace(/\s+$/, '');
  const endIdx = value.indexOf(COMMENTS_MARKER_END, idx);
  if (endIdx === -1) return { body: value, comments: [] };
  try {
    const comments = JSON.parse(value.slice(idx + COMMENTS_MARKER.length, endIdx));
    return { body, comments: Array.isArray(comments) ? comments : [] };
  } catch {
    return { body: value, comments: [] };
  }
}

function serializeDescriptionStorage(body, comments) {
  const cleanBody = (body || '').trim();
  if (!comments.length) return cleanBody || null;
  return `${cleanBody}${COMMENTS_MARKER}${JSON.stringify(comments)}${COMMENTS_MARKER_END}`;
}

function getCommentAuthor(user) {
  if (user?.firstName) return `${user.firstName} ${user.lastName || ''}`.trim();
  return user?.userName || user?.email || 'User';
}

const PRESET_LABELS = [
  { labelName: 'Green', color: '#61bd4f' },
  { labelName: 'Yellow', color: '#f2d600' },
  { labelName: 'Orange', color: '#ff9f1a' },
  { labelName: 'Red', color: '#eb5a46' },
  { labelName: 'Purple', color: '#c377e0' },
  { labelName: 'Blue', color: '#0079bf' },
];

const SELECTABLE_COLORS = [
  '#baf0b4', '#9fdd8f', '#7bc86c', '#6bc86c', '#4bce97', '#61c892',
  '#f5ea92', '#f2d600', '#ffcb00', '#fad29b', '#ffab4a', '#ff9f1a',
  '#ffafad', '#ff8787', '#eb5a46', '#cf513d', '#e774bb', '#c377e0',
  '#89609e', '#0079bf', '#00c2e0', '#29cce5', '#51e898', '#344563',
  '#4c5d73', '#6b778c', '#838c91', '#b3bac5', '#d3d5d8', '#091e42',
];

function normalizeLabel(raw) {
  const id = raw.labelID ?? raw.LabelID ?? raw.labelId;
  return {
    labelID: id != null ? Number(id) : null,
    cardID: raw.cardID ?? raw.CardID,
    labelName: raw.labelName ?? raw.LabelName ?? raw.name ?? 'Label',
    color: raw.color ?? raw.Color ?? null,
  };
}

function isPresetOnCard(preset, cardLabel) {
  return isSameLabel(preset, cardLabel);
}

function isSameLabel(a, b) {
  const aName = (a.labelName || '').toLowerCase();
  const bName = (b.labelName || '').toLowerCase();
  const aColor = (a.color || '').toLowerCase();
  const bColor = (b.color || '').toLowerCase();
  return aName === bName && aColor === bColor;
}

const TIME_OPTIONS = [
  '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM',
  '3:00 AM', '3:30 AM', '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM',
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
];

function parseTimeLabel(label) {
  const match = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hours: 9, minutes: 30 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

function formatTimeLabel(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDueDateDisplay(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${formatTimeLabel(date)}`;
}

function getDueStatus(value) {
  if (!value) return null;
  const due = new Date(value);
  const now = new Date();
  if (due < now) return { label: 'Overdue', bg: '#fee2e2', color: '#991b1b' };
  const diff = due.getTime() - now.getTime();
  if (diff <= 24 * 60 * 60 * 1000) return { label: 'Due soon', bg: '#fef3c7', color: '#92400e' };
  return null;
}

function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildDueDateIso(dateStr, timeLabel) {
  if (!dateStr) return null;
  const { hours, minutes } = parseTimeLabel(timeLabel);
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, hours, minutes, 0, 0);
  return date.toISOString();
}

function formatCommentTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} hours ago`;
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function CardDetailModal({ card, onClose, onUpdated }) {
  const { user } = useAuth();
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

  const [showLabelPopup, setShowLabelPopup] = useState(false);
  const [labelPopupView, setLabelPopupView] = useState('list');
  const [labelSearch, setLabelSearch] = useState('');
  const [cardLabels, setCardLabels] = useState([]);
  const [labelActionKey, setLabelActionKey] = useState(null);
  const [newLabelTitle, setNewLabelTitle] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(SELECTABLE_COLORS[2]);
  const [customColorHex, setCustomColorHex] = useState('#61bd4f');
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [dueDateEnabled, setDueDateEnabled] = useState(!!card.dueDate);
  const [dueDateInput, setDueDateInput] = useState(toDateInputValue(card.dueDate));
  const [dueTimeInput, setDueTimeInput] = useState(
    card.dueDate ? formatTimeLabel(new Date(card.dueDate)) : '9:30 AM'
  );
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const base = card.dueDate ? new Date(card.dueDate) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState(card.description || '');

  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');

  const menuRefs = useRef({});
  const dropdownRefs = useRef({});
  const labelPopupRef = useRef(null);
  const datePopupRef = useRef(null);

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

  useEffect(() => {
    const { body, comments: storedComments } = parseDescriptionStorage(card.description);
    setDueDateEnabled(!!card.dueDate);
    setDueDateInput(toDateInputValue(card.dueDate));
    setDueTimeInput(card.dueDate ? formatTimeLabel(new Date(card.dueDate)) : '9:30 AM');
    setDescriptionText(body);
    setComments(storedComments);
    setTitleText(card.cardTitle || '');
    const base = card.dueDate ? new Date(card.dueDate) : new Date();
    setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [card.cardID, card.color, card.dueDate, card.description, card.cardTitle]);

  useEffect(() => {
    loadCardLabels();
  }, [card.cardID]);

  const loadCardLabels = async () => {
    try {
      const data = await getCardLabels(card.cardID);
      setCardLabels((data || []).map(normalizeLabel));
    } catch (err) {
      console.error('Failed to load labels', err);
      setCardLabels([]);
    }
  };

  const loadChecklists = async () => {
    try {
      const data = await getChecklists(card.cardID);
      setChecklists(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const buildCardUpdatePayload = (extra = {}) => ({
    cardID: card.cardID,
    cardTitle: card.cardTitle,
    cardStatusID: card.cardStatusID,
    assignedUserID: card.assignedUserID,
    description: card.description || null,
    color: card.color || null,
    dueDate: card.dueDate || null,
    ...extra,
  });

  const handleUpdateCardFields = async (fields) => {
    try {
      await updateCard(buildCardUpdatePayload(fields));
      onUpdated?.();
    } catch (err) {
      console.error('Failed to update card', err);
    }
  };

  const openLabelPopup = () => {
    setShowLabelPopup(true);
    setLabelPopupView('list');
    setLabelSearch('');
    loadCardLabels();
  };

  const closeLabelPopup = () => {
    setShowLabelPopup(false);
    setLabelPopupView('list');
    setLabelSearch('');
    setNewLabelTitle('');
    setNewLabelColor(SELECTABLE_COLORS[2]);
    setShowCustomColorPicker(false);
  };

  const openCreateLabelView = () => {
    setLabelPopupView('create');
    setNewLabelTitle('');
    setNewLabelColor(SELECTABLE_COLORS[2]);
    setCustomColorHex(SELECTABLE_COLORS[2]);
    setShowCustomColorPicker(false);
  };

  const getLabelItemKey = (label) => (
    label.labelID != null ? `label-${label.labelID}` : `preset-${label.labelName}-${label.color || 'none'}`
  );

  const handleToggleLabel = async (item) => {
    const itemKey = getLabelItemKey(item);
    if (labelActionKey) return;

    setLabelActionKey(itemKey);
    try {
      if (item.isApplied) {
        const labelId = item.labelID
          ?? cardLabels.find((label) => isSameLabel(label, item))?.labelID;
        if (!labelId) {
          await loadCardLabels();
          return;
        }
        // Optimistic UI: uncheck immediately
        setCardLabels((prev) => prev.filter((label) => label.labelID !== labelId));
        await deleteLabel(labelId);
      } else {
        // Optimistic UI: show as applied while API runs
        setCardLabels((prev) => [
          ...prev,
          {
            labelID: null,
            cardID: card.cardID,
            labelName: item.labelName,
            color: item.color ?? null,
          },
        ]);
        await createLabel({
          cardID: card.cardID,
          labelName: item.labelName,
          color: item.color ?? null,
        });
      }
      await loadCardLabels();
      onUpdated?.();
    } catch (err) {
      console.error('Failed to update label', err);
      await loadCardLabels();
    } finally {
      setLabelActionKey(null);
    }
  };

  const handleRemoveNewLabelColor = () => {
    setNewLabelColor(null);
    setShowCustomColorPicker(false);
  };

  const handleCreateLabel = async () => {
    const title = newLabelTitle.trim() || 'Label';
    try {
      await createLabel({
        cardID: card.cardID,
        labelName: title,
        color: newLabelColor,
      });
      await loadCardLabels();
      onUpdated?.();
      setLabelPopupView('list');
      setNewLabelTitle('');
      setNewLabelColor(SELECTABLE_COLORS[2]);
      setShowCustomColorPicker(false);
    } catch (err) {
      console.error('Failed to create label', err);
    }
  };

  const labelListItems = [
    ...cardLabels.map((label) => ({ ...label, isApplied: true, isPreset: false })),
    ...PRESET_LABELS
      .filter((preset) => !cardLabels.some((label) => isPresetOnCard(preset, label)))
      .map((preset) => ({ ...preset, labelID: null, isApplied: false, isPreset: true })),
  ];

  const filteredLabelListItems = labelListItems.filter((label) =>
    label.labelName.toLowerCase().includes(labelSearch.toLowerCase())
  );

  const appliedLabels = cardLabels;

  const handleSaveDueDate = async () => {
    if (!dueDateEnabled) {
      await handleUpdateCardFields({ dueDate: null });
      setShowDatePopup(false);
      return;
    }
    if (!dueDateInput) return;
    const iso = buildDueDateIso(dueDateInput, dueTimeInput);
    await handleUpdateCardFields({ dueDate: iso });
    setShowDatePopup(false);
  };

  const handleRemoveDueDate = async () => {
    setDueDateEnabled(false);
    setDueDateInput('');
    await handleUpdateCardFields({ dueDate: null });
    setShowDatePopup(false);
  };

  const handleSaveDescription = async () => {
    const trimmed = descriptionText.trim();
    const serialized = serializeDescriptionStorage(trimmed, comments);
    await handleUpdateCardFields({ description: serialized });
    setIsEditingDescription(false);
  };

  const handleCancelDescription = () => {
    const { body } = parseDescriptionStorage(card.description);
    setDescriptionText(body);
    setIsEditingDescription(false);
  };

  const handleAddComment = async () => {
    const trimmed = newCommentText.trim();
    if (!trimmed) return;

    const newComment = {
      commentID: `c-${Date.now()}`,
      commentText: trimmed,
      createdByName: getCommentAuthor(user),
      createdDate: new Date().toISOString(),
    };
    const nextComments = [newComment, ...comments];
    const serialized = serializeDescriptionStorage(descriptionText, nextComments);

    await handleUpdateCardFields({ description: serialized });
    setComments(nextComments);
    setNewCommentText('');
  };

  const selectCalendarDay = (day) => {
    const y = calendarMonth.getFullYear();
    const m = String(calendarMonth.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    setDueDateInput(`${y}-${m}-${d}`);
    setDueDateEnabled(true);
  };

  const calendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = firstDay - 1; i >= 0; i -= 1) {
      cells.push({ day: daysInPrevMonth - i, current: false });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push({ day: d, current: true });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: cells.length, current: false });
    }
    return cells;
  };

  const dueStatus = getDueStatus(card.dueDate);

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
      if (showLabelPopup && labelPopupRef.current && !labelPopupRef.current.contains(e.target)) {
        closeLabelPopup();
      }
      if (showDatePopup && datePopupRef.current && !datePopupRef.current.contains(e.target)) {
        setShowDatePopup(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuItemId, userDropdownOpen, showLabelPopup, showDatePopup]);

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
          width: 'min(960px, 96vw)',
          height: '82vh',
          maxHeight: '760px',
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

        {/* Card meta + Labels + Due date */}
        <div style={{ marginBottom: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {card.assignedUserName && <span>👤 {card.assignedUserName}</span>}
            {card.priorityName && <span>🔴 {card.priorityName}</span>}
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Labels */}
            <div style={{ position: 'relative' }} ref={labelPopupRef}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Labels</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {appliedLabels.map((label) => (
                  <button
                    key={label.labelID}
                    type="button"
                    onClick={openLabelPopup}
                    style={{
                      minWidth: 56, height: 32, borderRadius: 4, border: label.color ? 'none' : '1px solid #d1d5db',
                      background: label.color || '#f3f4f6', cursor: 'pointer',
                      color: label.color ? '#fff' : '#374151', fontSize: 12, fontWeight: 600,
                      padding: '0 10px',
                    }}
                    title={label.labelName}
                  >
                    {label.labelName}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={openLabelPopup}
                  style={{
                    width: 32, height: 32, borderRadius: 4, border: '1px solid #d1d5db',
                    background: '#fff', cursor: 'pointer', fontSize: 18, color: '#6b7280',
                    lineHeight: 1,
                  }}
                >
                  +
                </button>
              </div>

              {showLabelPopup && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 300,
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                  boxShadow: '0 10px 25px rgba(0,0,0,.15)', zIndex: 10000, padding: 12,
                }}>
                  {labelPopupView === 'list' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ width: 24 }} />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Labels</span>
                        <button type="button" onClick={closeLabelPopup} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>×</button>
                      </div>

                      <input
                        type="text"
                        placeholder="Search labels..."
                        value={labelSearch}
                        onChange={(e) => setLabelSearch(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 10px', border: '2px solid #2563eb',
                          borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box',
                        }}
                      />

                      <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Labels</div>
                      <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
                        {filteredLabelListItems.map((label) => {
                          const itemKey = getLabelItemKey(label);
                          const isBusy = labelActionKey === itemKey;
                          const rowDisabled = !!labelActionKey;
                          return (
                          <div
                            key={itemKey}
                            role="button"
                            tabIndex={0}
                            onClick={() => !rowDisabled && handleToggleLabel(label)}
                            onKeyDown={(e) => {
                              if (rowDisabled) return;
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleToggleLabel(label);
                              }
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                              cursor: rowDisabled ? 'wait' : 'pointer',
                              opacity: isBusy ? 0.7 : 1,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!label.isApplied}
                              readOnly
                              tabIndex={-1}
                              style={{ width: 16, height: 16, flexShrink: 0, pointerEvents: 'none' }}
                            />
                            <div
                              style={{
                                flex: 1, height: 32, borderRadius: 4,
                                border: label.color ? 'none' : '1px solid #d1d5db',
                                background: label.color || '#f3f4f6',
                                color: label.color ? '#fff' : '#374151',
                                fontWeight: 600, fontSize: 13, textAlign: 'left',
                                paddingLeft: 10, display: 'flex', alignItems: 'center',
                              }}
                            >
                              {label.labelName}
                            </div>
                          </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={openCreateLabelView}
                        style={{
                          width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                          borderRadius: 6, background: '#f9fafb', cursor: 'pointer',
                          fontSize: 13, fontWeight: 500, color: '#374151',
                        }}
                      >
                        Create a new label
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <button
                          type="button"
                          onClick={() => setLabelPopupView('list')}
                          style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#6b7280', width: 24 }}
                        >
                          ←
                        </button>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Create label</span>
                        <button type="button" onClick={closeLabelPopup} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>×</button>
                      </div>

                      <div style={{
                        height: 40, borderRadius: 6, marginBottom: 12,
                        background: newLabelColor || '#f3f4f6',
                        border: newLabelColor ? 'none' : '1px solid #d1d5db',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: newLabelColor ? '#fff' : '#374151', fontWeight: 600, fontSize: 13,
                      }}>
                        {newLabelTitle.trim() || 'Label preview'}
                      </div>

                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Title</label>
                      <input
                        type="text"
                        value={newLabelTitle}
                        onChange={(e) => setNewLabelTitle(e.target.value)}
                        placeholder="Label name"
                        style={{
                          width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
                          borderRadius: 6, fontSize: 13, marginBottom: 14, boxSizing: 'border-box',
                        }}
                      />

                      <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Select a color</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 10 }}>
                        {SELECTABLE_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              setNewLabelColor(color);
                              setShowCustomColorPicker(false);
                            }}
                            style={{
                              width: '100%', aspectRatio: '1.6', borderRadius: 4, border: 'none',
                              background: color, cursor: 'pointer', position: 'relative',
                            }}
                            title={color}
                          >
                            {newLabelColor === color && (
                              <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>✓</span>
                            )}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShowCustomColorPicker((v) => !v)}
                          style={{
                            width: '100%', aspectRatio: '1.6', borderRadius: 4,
                            border: '1px dashed #9ca3af', background: '#fff', cursor: 'pointer',
                            fontSize: 18, color: '#6b7280',
                          }}
                          title="Custom color"
                        >
                          +
                        </button>
                      </div>

                      {showCustomColorPicker && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <input
                            type="color"
                            value={customColorHex}
                            onChange={(e) => {
                              setCustomColorHex(e.target.value);
                              setNewLabelColor(e.target.value);
                            }}
                            style={{ width: 40, height: 32, border: 'none', padding: 0, cursor: 'pointer' }}
                          />
                          <input
                            type="text"
                            value={customColorHex}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCustomColorHex(value);
                              if (/^#[0-9A-Fa-f]{6}$/.test(value)) setNewLabelColor(value);
                            }}
                            placeholder="#61bd4f"
                            style={{
                              flex: 1, padding: '6px 8px', border: '1px solid #d1d5db',
                              borderRadius: 6, fontSize: 13,
                            }}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleRemoveNewLabelColor}
                        style={{
                          width: '100%', padding: '8px 10px', marginBottom: 12,
                          border: '1px solid #d1d5db', borderRadius: 6, background: '#fff',
                          cursor: 'pointer', fontSize: 13, color: '#374151',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        <span>✕</span> Remove color
                      </button>

                      <button
                        type="button"
                        onClick={handleCreateLabel}
                        style={{
                          padding: '8px 16px', background: '#2563eb', color: '#fff',
                          border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        }}
                      >
                        Create
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Due date */}
            <div style={{ position: 'relative' }} ref={datePopupRef}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Due date</div>
              <button
                type="button"
                onClick={() => setShowDatePopup((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                  border: '1px solid #d1d5db', borderRadius: 6, background: '#f9fafb',
                  cursor: 'pointer', fontSize: 13, color: '#111827',
                }}
              >
                <span>{card.dueDate ? formatDueDateDisplay(card.dueDate) : 'Add due date'}</span>
                {dueStatus && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                    background: dueStatus.bg, color: dueStatus.color,
                  }}>
                    {dueStatus.label}
                  </span>
                )}
                <span style={{ color: '#9ca3af', fontSize: 10 }}>▾</span>
              </button>

              {showDatePopup && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 300,
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                  boxShadow: '0 10px 25px rgba(0,0,0,.15)', zIndex: 10000, padding: 14,
                }}>
                  <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Dates</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>‹</button>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>›</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 12, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <div key={d}>{d}</div>)}
                    {calendarDays().map((cell, idx) => {
                      const y = calendarMonth.getFullYear();
                      const m = calendarMonth.getMonth();
                      const cellDate = cell.current
                        ? `${y}-${String(m + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
                        : null;
                      const isSelected = cellDate && cellDate === dueDateInput;
                      return (
                        <button
                          key={`${idx}-${cell.day}`}
                          type="button"
                          disabled={!cell.current}
                          onClick={() => cell.current && selectCalendarDay(cell.day)}
                          style={{
                            border: 'none', borderRadius: 4, height: 28, cursor: cell.current ? 'pointer' : 'default',
                            background: isSelected ? '#dbeafe' : 'transparent',
                            color: cell.current ? '#111827' : '#d1d5db', fontSize: 12,
                          }}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8 }}>
                    <input type="checkbox" checked={dueDateEnabled} onChange={(e) => setDueDateEnabled(e.target.checked)} />
                    Due date
                  </label>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input
                      type="date"
                      value={dueDateInput}
                      disabled={!dueDateEnabled}
                      onChange={(e) => setDueDateInput(e.target.value)}
                      style={{ flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                    />
                    <select
                      value={dueTimeInput}
                      disabled={!dueDateEnabled}
                      onChange={(e) => setDueTimeInput(e.target.value)}
                      style={{ flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
                    >
                      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={handleSaveDueDate} style={{ flex: 1, padding: '8px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Save</button>
                    <button type="button" onClick={handleRemoveDueDate} style={{ padding: '8px 10px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Remove</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <hr style={{ marginBottom: 16, flexShrink: 0 }} />

        {/* Two-column body */}
        <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
          <div
            className="custom-modal-scrollbar"
            style={{ overflowY: 'scroll', WebkitOverflowScrolling: 'touch', flex: 1, paddingRight: 8, minWidth: 0 }}
          >
            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 15 }}>Description</h4>
                {!isEditingDescription && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDescription(true)}
                    style={{ padding: '4px 10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditingDescription ? (
                <div>
                  <textarea
                    value={descriptionText}
                    onChange={(e) => setDescriptionText(e.target.value)}
                    rows={4}
                    placeholder="Add a more detailed description..."
                    style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="button" onClick={handleSaveDescription} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Save</button>
                    <button type="button" onClick={handleCancelDescription} style={{ padding: '6px 12px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDescription(true)}
                  style={{
                    minHeight: 48, padding: 10, borderRadius: 8, background: '#f9fafb',
                    fontSize: 13, color: descriptionText ? '#111827' : '#9ca3af', cursor: 'text',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {descriptionText || 'Add a more detailed description...'}
                </div>
              )}
            </div>

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

          {/* Comments and activity */}
          <div
            className="custom-modal-scrollbar"
            style={{
              width: 300, flexShrink: 0, borderLeft: '1px solid #e5e7eb',
              paddingLeft: 16, display: 'flex', flexDirection: 'column',
              overflowY: 'auto', minHeight: 0,
            }}
          >
            <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>Comments and activity</h4>
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              style={{
                width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 8,
                fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8,
              }}
            />
            {newCommentText.trim() && (
              <button
                type="button"
                onClick={handleAddComment}
                style={{
                  alignSelf: 'flex-start', padding: '6px 12px', marginBottom: 16,
                  background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6,
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                Save
              </button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {comments.length === 0 && (
                <div style={{ fontSize: 13, color: '#9ca3af' }}>No comments yet.</div>
              )}
              {comments.map((comment) => {
                const author = comment.createdByName || comment.userName || 'User';
                const text = comment.commentText || comment.text || '';
                const time = comment.createdDate || comment.createdAt;
                const initials = author.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={comment.commentID || comment.id || `${author}-${time}`} style={{ display: 'flex', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: '#2563eb', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 600, flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.5 }}>
                        <strong>{author}</strong> {text}
                      </div>
                      {time && (
                        <div style={{ fontSize: 12, color: '#2563eb', marginTop: 4 }}>
                          {formatCommentTime(time)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
