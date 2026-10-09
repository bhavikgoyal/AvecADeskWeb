import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  getChecklists,
  createChecklist,
  createChecklistItem,
  toggleChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  updateChecklistItemName,
} from "../../api/checklistApi";
import {
  updateCard,
  getUsers,
  getBoards,
  getCardMembers,
  addCardMember,
  removeCardMember,
  moveCardToList,
} from "../../api/cardApi";
import {
  getBoardLabelsForCard,
  createBoardLabel,
  updateBoardLabel,
  deleteBoardLabel,
  setCardBoardLabel,
} from "../../api/labelApi";
import {
  saveCardCover,
  removeCardCover,
  uploadCardCoverImage,
} from "../../api/cardCoverApi";
import { logCardActivity } from "../../api/cardCommentApi";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import WebAssetOutlinedIcon from "@mui/icons-material/WebAssetOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import SubjectIcon from "@mui/icons-material/Subject";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CardCoverPopover from "./CardCoverPopover";
import LabelsPopover, { LabelChip } from "./LabelsPopover";
import CardCommentsPanel from "./CardCommentsPanel";
import MoveCardPopover from "./MoveCardPopover";
import { AttachPopover, CardAttachmentsSection } from "./CardAttachments";
import { useCardAttachments } from "./useCardAttachments";
import { useTrelloCardSync, useTrelloRefresh } from "./useTrelloRefresh";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubble";
import HistoryIcon from "@mui/icons-material/History";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import * as cardApiAll from "../../api/cardApi";
import { getMembers } from "../../api/membersApi";
import {
  BORDER,
  BRAND,
  MUTED_TEXT,
  NEUTRAL_BG,
  SUBTLE_TEXT,
  TEXT,
  actionButtonStyle,
  dangerButtonStyle,
  greyButtonStyle,
  inputStyle,
  popoverSectionTitle,
  primaryButtonStyle,
} from "./cardModalStyles";
import {
  Avatar,
  CardPopover,
  LinkifiedText,
  PopoverHeader,
} from "./cardModalUi";
import {
  getCoverBackground,
  getCoverHex,
  hasCover,
  resolveCoverImageUrl,
  useColorblindMode,
} from "../../utils/cardCover";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const REMINDER_OPTIONS = [
  { label: "None", value: "" },
  { label: "At time of due date", value: "0" },
  { label: "5 minutes before", value: "5" },
  { label: "10 minutes before", value: "10" },
  { label: "15 minutes before", value: "15" },
  { label: "1 hour before", value: "60" },
  { label: "2 hours before", value: "120" },
  { label: "1 day before", value: "1440" },
  { label: "2 days before", value: "2880" },
];

const RECURRING_OPTIONS = ["Never", "Daily", "Weekly", "Monthly", "Yearly"];

const metaHeadingStyle = {
  margin: "0 0 6px",
  fontSize: 12,
  fontWeight: 600,
  color: SUBTLE_TEXT,
};

const squareAddButtonStyle = {
  width: 32,
  height: 32,
  border: "none",
  borderRadius: 4,
  background: NEUTRAL_BG,
  color: SUBTLE_TEXT,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};

const selectStyle = {
  ...inputStyle,
  appearance: "auto",
  cursor: "pointer",
};

const detailBoxStyle = {
  background: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: 20,
  minWidth: 0,
};

const detailHeadingStyle = {
  margin: "0 0 10px",
  fontSize: 16,
  fontWeight: 600,
  color: TEXT,
};

const DESCRIPTION_BOX_HEIGHT = 112;

const quickActionButtonStyle = {
  height: 64,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  background: "#fff",
  color: TEXT,
  fontSize: 13,
  fontWeight: 500,
  fontFamily: "inherit",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
};

function formatInfoDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

const TABS = [
  {
    key: "details",
    label: "Details",
    icon: <SubjectIcon sx={{ fontSize: 18 }} />,
  },
  {
    key: "commentsActivity",
    label: "Comments & Activity",
    icon: <ChatBubbleOutlineIcon sx={{ fontSize: 18 }} />,
  },
  {
    key: "attachments",
    label: "Attachments",
    icon: <AttachFileIcon sx={{ fontSize: 18 }} />,
  },
  {
    key: "checklist",
    label: "Checklist",
    icon: <CheckBoxOutlinedIcon sx={{ fontSize: 18 }} />,
  },
];


function getLoggedInUserName() {
  try {
    for (const key of ["user", "currentUser", "userInfo", "authUser"]) {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) continue;
      const u = JSON.parse(raw);
      const full = `${u?.firstName || ""} ${u?.lastName || ""}`.trim();
      const name = full || u?.userName || u?.name || u?.fullName;
      if (name) return name;
    }
  } catch (err) {
    // ignore
  }
  return "";
}

function normalizeDueDateValue(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60000);
  return localDate.toISOString().slice(0, 10);
}


function normalizeDueTimeValue(value) {
  if (!value) return "09:00";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "09:00";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getMonthGrid(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({
      day: daysInPrevMonth - i,
      currentMonth: false,
      date: new Date(year, month - 1, daysInPrevMonth - i),
    });
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
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function memberDisplayName(member) {
  const full = `${member?.firstName || ""} ${member?.lastName || ""}`.trim();
  return full || member?.userName || "Unknown user";
}

function SectionHeader({ icon, title, action }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 32,
        marginBottom: 8,
      }}
    >
      <span
        style={{
          width: 20,
          display: "flex",
          justifyContent: "center",
          color: SUBTLE_TEXT,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <h3
        style={{
          margin: 0,
          flex: 1,
          minWidth: 0,
          fontSize: 16,
          fontWeight: 600,
          color: TEXT,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </h3>
      {action}
    </div>
  );
}

function ChecklistCheckbox({ checked, onChange }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      style={{
        width: 16,
        height: 16,
        marginTop: 2,
        padding: 0,
        borderRadius: 3,
        border: checked ? "none" : "2px solid #8590A2",
        background: checked ? BRAND : "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      {checked && <CheckIcon sx={{ fontSize: 13, color: "#fff" }} />}
    </button>
  );
}

export default function CardDetailModal({
  card,
  listName,
  boardId,
  onClose,
  onUpdated,
}) {
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const [colorblind] = useColorblindMode();

  const [activeTab, setActiveTab] = useState("details");
  const currentUserName = getLoggedInUserName() || "Unknown user";

  const [popover, setPopover] = useState({
    type: null,
    anchorEl: null,
    anchorPosition: null,
    data: null,
  });
  const openPopover =
    (type, data = null) =>
    (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const dialog = event.currentTarget.closest('[role="dialog"]');
      const dialogRect = dialog?.getBoundingClientRect();

      let left = rect.left;
      let top = rect.bottom;

      // Keep popups inside the card modal.
      if (
        (type === "move" ||
          type === "checklist" ||
          type === "dates" ||
          type === "cover" ||
          type === "attach") &&
        dialogRect
      ) {
        const popupWidth = type === "attach" ? 304 : 290;
        const popupRightGap = 16;

        left = Math.min(
          rect.left,
          dialogRect.right - popupWidth - popupRightGap,
        );

        left = Math.max(left, dialogRect.left + popupRightGap);

        top = Math.max(top, dialogRect.top + popupRightGap);
      }

      setPopover({
        type,
        anchorEl: event.currentTarget,
        anchorPosition: { top, left },
        data,
      });
    };
  const closePopover = () =>
    setPopover({
      type: null,
      anchorEl: null,
      anchorPosition: null,
      data: null,
    });

  const [checklists, setChecklists] = useState([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState("Checklist");
  const [newItems, setNewItems] = useState({});
  const [addingItemFor, setAddingItemFor] = useState(null);
  const [hideCheckedFor, setHideCheckedFor] = useState({});
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [showChecklistSection, setShowChecklistSection] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [boards, setBoards] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(card.cardTitle || "");
  const titleCancelledRef = useRef(false);
  const [now, setNow] = useState(() => Date.now());

  const [boardLabels, setBoardLabels] = useState([]);
  const [labelsLoading, setLabelsLoading] = useState(true);
  const [labelSaving, setLabelSaving] = useState(false);

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState(
    card.description || "",
  );

  const [dueDateText, setDueDateText] = useState(
    normalizeDueDateValue(card.dueDate),
  );
  const [dueTimeText, setDueTimeText] = useState(
    normalizeDueTimeValue(card.dueDate),
  );
  const [calendarViewDate, setCalendarViewDate] = useState(() => {
    const initial = normalizeDueDateValue(card.dueDate);
    return initial ? new Date(`${initial}T00:00:00`) : new Date();
  });
  const [includeStartDate, setIncludeStartDate] = useState(false);
  const [startDateText, setStartDateText] = useState("");
  const [recurringRule, setRecurringRule] = useState("Never");
  const [reminderOffset, setReminderOffset] = useState("");

  const [cover, setCover] = useState(card.cover || null);
  const [coverSource, setCoverSource] = useState(card.cover);
  const [coverSaving, setCoverSaving] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const {
    attachments,
    uploading: attachmentsUploading,
    uploadFiles: uploadAttachmentFiles,
    addLink: addAttachmentLink,
    updateAttachment,
    removeAttachment,
  } = useCardAttachments(card.cardID);

  const normalizeUserId = (value) => {
    if (value == null || value === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  };

  const [activityVersion, setActivityVersion] = useState(0);


  const logActivity = (
    activityType,
    { description = null, oldValue = null, newValue = null } = {},
  ) =>
    logCardActivity({
      cardID: card.cardID,
      activityType,
      description,
      oldValue,
      newValue,
    })
      .then(() => setActivityVersion((v) => v + 1))
      .catch((err) => console.error("Failed to log card activity", err));


  const loadChecklists = useCallback(async () => {
    try {
      const checklistData = await getChecklists(card.cardID);
      setChecklists(checklistData || []);
    } catch (err) {
      console.error("Failed to load checklists", err);
      setChecklists([]);
    }
  }, [card.cardID]);


  const refreshChecklistsAndLabels = useCallback(async () => {
    try {
      const [checklistData, labelData] = await Promise.all([
        getChecklists(card.cardID),
        getBoardLabelsForCard(card.cardID),
      ]);
      if (Array.isArray(checklistData)) setChecklists(checklistData);
      if (Array.isArray(labelData)) setBoardLabels(labelData);
    } catch (err) {
      console.error("Failed to refresh checklists and labels", err);
    }
  }, [card.cardID]);

  useTrelloCardSync(card.cardID);
  useTrelloRefresh(refreshChecklistsAndLabels);

  const loadMembers = useCallback(async () => {
    try {
      const memberData = await getCardMembers(card.cardID);
      setMembers(memberData || []);
    } catch (err) {
      console.error("Failed to load card members", err);
      setMembers([]);
    }
  }, [card.cardID]);

  const loadBoardLabels = useCallback(async () => {
    try {
      const data = await getBoardLabelsForCard(card.cardID);
      setBoardLabels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load labels", err);
    } finally {
      setLabelsLoading(false);
    }
  }, [card.cardID]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const [
        checklistData,
        memberData,
        userData,
        labelData,
        boardData,
        allMembersData,
      ] = await Promise.allSettled([
        getChecklists(card.cardID),
        getCardMembers(card.cardID),
        getUsers(),
        getBoardLabelsForCard(card.cardID),
        getBoards(),
        getMembers(),
      ]);
      if (!isMounted) return;
      const valueOf = (result) =>
        result.status === "fulfilled" && Array.isArray(result.value)
          ? result.value
          : [];
      [checklistData, memberData, userData, labelData]
        .filter((r) => r.status === "rejected")
        .forEach((r) =>
          console.error("Failed to load card detail data", r.reason),
        );
      setChecklists(valueOf(checklistData));
      setMembers(valueOf(memberData));
      setUsers(valueOf(userData));
      setBoardLabels(valueOf(labelData));
      setBoards(valueOf(boardData));
      setAllMembers(valueOf(allMembersData));
      setLabelsLoading(false);
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [card.cardID]);

  /* ------------------------------- members ------------------------------- */

  const assignedUserId = normalizeUserId(
    card.assignedUserID ?? card.assignedUserId,
  );
  const assignedUserFromList = users.find(
    (user) => normalizeUserId(user.userId ?? user.userID) === assignedUserId,
  );
  const hasAssignedUserInMembers = members.some(
    (member) =>
      normalizeUserId(member.userID ?? member.userId) === assignedUserId,
  );
  const visibleMembers =
    assignedUserId && assignedUserFromList && !hasAssignedUserInMembers
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
    visibleMembers
      .map((member) => normalizeUserId(member.userID ?? member.userId))
      .filter((id) => id != null),
  );

  const findPersonName = (userId) => {
    const id = normalizeUserId(userId);
    const person = [...visibleMembers, ...users].find(
      (p) => normalizeUserId(p.userID ?? p.userId) === id,
    );
    return person ? memberDisplayName(person) : null;
  };

  const handleAddMember = async (userId) => {
    try {
      await addCardMember(card.cardID, userId);
      logActivity("cardMemberAdded", {
        description: findPersonName(userId),
        newValue: String(userId),
      });
      await loadMembers();
      onUpdated?.();
    } catch (err) {
      window.alert(err?.message || "Unable to add member.");
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await removeCardMember(card.cardID, userId);
      logActivity("cardMemberRemoved", {
        description: findPersonName(userId),
        oldValue: String(userId),
      });
      await loadMembers();
      onUpdated?.();
    } catch (err) {
      window.alert(err?.message || "Unable to remove member.");
    }
  };

  /* -------------------------------- labels ------------------------------- */

  const assignedLabels = boardLabels.filter((l) => l.isAssigned);

  const runLabelAction = async (action, errorMessage) => {
    setLabelSaving(true);
    try {
      await action();
      onUpdated?.();
      return true;
    } catch (err) {
      console.error(errorMessage, err);
      window.alert(err?.message || errorMessage);
      return false;
    } finally {
      setLabelSaving(false);
    }
  };

  const handleToggleLabel = (label, isAssigned) =>
    runLabelAction(async () => {
      setBoardLabels((prev) =>
        prev.map((l) =>
          l.boardLabelID === label.boardLabelID ? { ...l, isAssigned } : l,
        ),
      );
      try {
        const saved = await setCardBoardLabel({
          cardID: card.cardID,
          boardLabelID: label.boardLabelID,
          isAssigned,
        });
        if (saved) {
          setBoardLabels((prev) =>
            prev.map((l) =>
              l.boardLabelID === saved.boardLabelID ? saved : l,
            ),
          );
        }
      } catch (err) {
        await loadBoardLabels();
        throw err;
      }
    }, "Unable to update label.");

  const handleCreateLabel = ({ labelName, color }) =>
    runLabelAction(async () => {
      const created = await createBoardLabel({
        cardID: card.cardID,
        labelName,
        color,
      });
      if (created) setBoardLabels((prev) => [...prev, created]);
    }, "Unable to create label.");

  const handleUpdateLabel = (boardLabelId, values) =>
    runLabelAction(async () => {
      const updated = await updateBoardLabel(boardLabelId, values);
      if (updated) {
        setBoardLabels((prev) =>
          prev.map((l) =>
            l.boardLabelID === boardLabelId
              ? { ...l, labelName: updated.labelName, color: updated.color }
              : l,
          ),
        );
      }
    }, "Unable to update label.");

  const handleDeleteLabel = (boardLabelId) =>
    runLabelAction(async () => {
      await deleteBoardLabel(boardLabelId);
      setBoardLabels((prev) =>
        prev.filter((l) => l.boardLabelID !== boardLabelId),
      );
    }, "Unable to delete label.");

  /* ------------------------------ checklists ----------------------------- */

  const handleAddChecklist = async () => {
    const title = newChecklistTitle.trim();
    if (!title) return;
    try {
      await createChecklist({ cardID: card.cardID, checklistTitle: title });
      logActivity("cardChecklistAdded", { description: title });
      setNewChecklistTitle("Checklist");
      closePopover();
      setShowChecklistSection(true);
      await loadChecklists();
      onUpdated?.();
    } catch (err) {
      window.alert(err?.message || "Unable to add checklist.");
    }
  };

  const handleAddItem = async (checklistId) => {
    const text = newItems[checklistId];
    if (!text?.trim()) return;
    const checklistAssignedUserId =
      assignedUserId ??
      normalizeUserId(visibleMembers[0]?.userID ?? visibleMembers[0]?.userId);
    if (!checklistAssignedUserId) {
      window.alert("Assign a user to this card before adding checklist items.");
      return;
    }
    try {
      await createChecklistItem({
        checklistID: checklistId,
        itemName: text.trim(),
        assignedUserID: checklistAssignedUserId,
      });
      setNewItems((prev) => ({ ...prev, [checklistId]: "" }));
      await loadChecklists();
      onUpdated?.();
    } catch (err) {
      window.alert(err?.message || "Unable to add item.");
    }
  };

  const handleToggleItem = async (itemId, isCompleted) => {
    const itemName = checklists
      .flatMap((cl) => cl.items || [])
      .find((i) => i.checklistItemID === itemId)?.itemName;
    setChecklists((prev) =>
      prev.map((cl) => ({
        ...cl,
        items: cl.items.map((i) =>
          i.checklistItemID === itemId
            ? { ...i, isCompleted: !isCompleted }
            : i,
        ),
      })),
    );
    try {
      await toggleChecklistItem(itemId, !isCompleted);
      logActivity("updateCheckItemStateOnCard", {
        description: itemName || "an item",
        oldValue: isCompleted ? "complete" : "incomplete",
        newValue: isCompleted ? "incomplete" : "complete",
      });
      onUpdated?.();
    } catch (err) {
      window.alert(err?.message || "Unable to update item.");
    }
    loadChecklists();
  };

  const handleDeleteChecklist = async (checklistId) => {
    const checklistTitle = checklists.find(
      (cl) => cl.checklistID === checklistId,
    )?.checklistTitle;
    try {
      await deleteChecklist(checklistId);
      logActivity("cardChecklistRemoved", {
        description: checklistTitle || "a checklist",
      });
      const remainingChecklists = (await getChecklists(card.cardID)) || [];
      setChecklists(remainingChecklists);
      if (remainingChecklists.length === 0) setShowChecklistSection(false);
      closePopover();
      onUpdated?.();
    } catch (err) {
      window.alert(err?.message || "Unable to delete checklist.");
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await deleteChecklistItem(itemId);
      await loadChecklists();
      onUpdated?.();
    } catch (err) {
      window.alert(err?.message || "Unable to delete item.");
    }
  };

  const handleStartEdit = (item) => {
    setEditingItemId(item.checklistItemID);
    setEditingText(item.itemName);
  };

  const handleSaveEdit = async (itemId) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      setEditingItemId(null);
      return;
    }
    try {
      await updateChecklistItemName(itemId, trimmed);
      setEditingItemId(null);
      loadChecklists();
    } catch (err) {
      window.alert(err?.message || "Unable to update item.");
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingText("");
  };

  /* ------------------------- card fields (update) ------------------------ */

  const handleClose = () => {
    onUpdated?.();
    onClose();
  };


  const formatDueDateForApi = (dateText, timeText) => {
    if (!dateText) return null;
    const [year, month, day] = dateText.split("-").map(Number);
    const [hours, minutes] = (timeText || "09:00").split(":").map(Number);
    if (!year || !month || !day) return null;
    return new Date(
      Date.UTC(year, month - 1, day, hours, minutes),
    ).toISOString();
  };

  const resetDateState = () => {
    const normalized = normalizeDueDateValue(card.dueDate);
    setDueDateText(normalized);
    setDueTimeText(normalizeDueTimeValue(card.dueDate));
    setCalendarViewDate(
      normalized ? new Date(`${normalized}T00:00:00`) : new Date(),
    );
    const normalizedStart = normalizeDueDateValue(card.startDate);
    setStartDateText(normalizedStart);
    setIncludeStartDate(!!normalizedStart);
    setRecurringRule(card.recurringRule || "Never");
    setReminderOffset(
      card.reminderOffsetMinutes != null
        ? String(card.reminderOffsetMinutes)
        : "",
    );
  };


  const dateSourceKey = `${card.cardID}|${card.dueDate}|${card.startDate}|${card.recurringRule}|${card.reminderOffsetMinutes}`;
  const [dateSource, setDateSource] = useState(null);
  if (dateSource !== dateSourceKey) {
    setDateSource(dateSourceKey);
    resetDateState();
  }

  if (card.cover !== coverSource) {
    setCoverSource(card.cover);
    setCover(card.cover || null);
  }


  const buildUpdatePayload = (overrides = {}) => ({
    cardID: card.cardID,
    cardTitle: titleText || card.cardTitle,
    description: descriptionText,
    color: card.color,
    dueDate: formatDueDateForApi(dueDateText, dueTimeText),
    startDate: includeStartDate
      ? formatDueDateForApi(startDateText, "00:00")
      : null,
    recurringRule: recurringRule === "Never" ? null : recurringRule,
    reminderOffsetMinutes:
      reminderOffset === "" ? null : Number(reminderOffset),
    assignedUserID: card.assignedUserID ?? card.assignedUserId ?? null,
    cardStatusID: card.cardStatusID,
    cpID: card.cpID ?? null,
    ...overrides,
  });

  const handleSaveTitle = async () => {
    const trimmed = titleText.trim();
    if (!trimmed || trimmed === card.cardTitle) {
      setIsEditingTitle(false);
      setTitleText(card.cardTitle || "");
      return;
    }
    try {
      await updateCard(buildUpdatePayload({ cardTitle: trimmed }));
      logActivity("cardRenamed", {
        oldValue: card.cardTitle || "",
        newValue: trimmed,
      });
      setTitleText(trimmed);
      setIsEditingTitle(false);
      onUpdated?.();
    } catch (err) {
      window.alert(err?.message || "Unable to save title.");
    }
  };

  const handleCancelTitle = () => {
    setTitleText(card.cardTitle || "");
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    try {
      await updateCard(
        buildUpdatePayload({ description: descriptionText.trim() || null }),
      );
      setIsEditingDescription(false);
      onUpdated?.();
    } catch (err) {
      window.alert(err?.message || "Unable to save description.");
    }
  };

  const handleCancelDescription = () => {
    setDescriptionText(card.description || "");
    setIsEditingDescription(false);
  };

  const handleSaveDueDate = async () => {
    const previousKey = card.dueDate
      ? `${normalizeDueDateValue(card.dueDate)}T${normalizeDueTimeValue(card.dueDate)}`
      : "";
    const nextKey = dueDateText
      ? `${dueDateText}T${dueTimeText || "09:00"}`
      : "";
    try {
      await updateCard(buildUpdatePayload());

      if (nextKey && nextKey !== previousKey) {
        logActivity("cardDueDateChanged", {
          oldValue: previousKey ? `${previousKey}:00` : null,
          newValue: `${nextKey}:00`,
        });
      }
      closePopover();
      onUpdated?.();
    } catch (err) {
      window.alert(err?.message || "Unable to save dates.");
    }
  };

  const handleMoveCard = async (listId, position, targetListName) => {
    try {
      await moveCardToList({ cardID: card.cardID, listID: listId, position });
      if (String(listId) !== String(card.listID)) {
        logActivity("cardMoved", {
          oldValue: listName || null,
          newValue: targetListName || null,
        });
      }
      closePopover();
      onUpdated?.();
      return true;
    } catch (err) {
      window.alert(err?.message || "Unable to move card.");
      return false;
    }
  };

  const handleClearDueDate = async () => {
    try {
      setDueDateText("");
      await updateCard(buildUpdatePayload({ dueDate: null }));
      logActivity("cardDueDateRemoved");
      closePopover();
      onUpdated?.();
    } catch (err) {
      window.alert(err?.message || "Unable to remove due date.");
    }
  };

  const handleCancelDueDate = () => {
    resetDateState();
    closePopover();
  };

  const handleDeleteCard = async () => {
    if (typeof cardApiAll.deleteCard !== "function") {
      window.alert("cardApi.js ma deleteCard function nathi.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this card?")) return;
    try {
      await cardApiAll.deleteCard(card.cardID);
      onUpdated?.();
      onClose();
    } catch (err) {
      window.alert(err?.message || "Unable to delete card.");
    }
  };

  /* -------------------------------- cover -------------------------------- */

  const runCoverAction = async (action) => {
    setCoverSaving(true);
    try {
      await action();
      onUpdated?.();
    } catch (err) {
      console.error("Failed to update cover", err);
      window.alert(err?.message || "Unable to update cover. Please try again.");
    } finally {
      setCoverSaving(false);
    }
  };

  const handleSaveCover = (nextCover) =>
    runCoverAction(async () => {
      const previous = cover;
      setCover({ ...(cover || {}), ...nextCover, hexCode: null });
      try {
        const saved = await saveCardCover({
          cardID: card.cardID,
          ...nextCover,
        });
        setCover(saved || null);
      } catch (err) {
        setCover(previous);
        throw err;
      }
    });

  const handleRemoveCover = () =>
    runCoverAction(async () => {
      await removeCardCover(card.cardID);
      setCover(null);
    });

  const handleUploadCover = (file) => {
    if (!file?.type?.startsWith("image/")) {
      window.alert("Please select an image file (JPG, PNG, GIF or WEBP).");
      return;
    }
    return runCoverAction(async () => {

      const saved = await uploadCardCoverImage(card.cardID, file, "normal");
      setCover(saved || null);
    });
  };

  const handleModalDragOver = (e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes("Files")) return;
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleModalDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDraggingFile(false);
  };

  const handleModalDrop = (e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes("Files")) return;
    e.preventDefault();
    setIsDraggingFile(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) handleUploadAttachments(files);
  };

  /* ----------------------------- attachments ----------------------------- */

  const handleUploadAttachments = async (files) => {
    const uploaded = await uploadAttachmentFiles(files);
    if (uploaded.length === 0) return;
    uploaded.forEach((a) =>
      logActivity("cardAttachmentAdded", {
        description: a.displayName || a.fileName,
        newValue: a.fileUrl,
      }),
    );
    const firstImage = !hasCover(cover) && uploaded.find((a) => a.isImage);
    if (firstImage) {
      await handleSaveCover({
        color: null,
        imageUrl: firstImage.fileUrl,
        size: "normal",
        brightness: "dark",
      });
    } else {
      onUpdated?.();
    }
  };

  const handleAddAttachmentLink = async (url, displayName) => {
    const ok = await addAttachmentLink(url, displayName);
    if (ok) {
      logActivity("cardAttachmentAdded", {
        description: displayName?.trim() || url,
        newValue: url,
      });
      onUpdated?.();
    }
    return ok;
  };

  const handleDeleteAttachment = async (attachment) => {
    const ok = await removeAttachment(attachment.attachmentID);
    if (ok) {
      logActivity("cardAttachmentDeleted", {
        description: attachment.displayName || attachment.fileName,
        oldValue: attachment.fileUrl,
      });
      if (cover?.imageUrl && cover.imageUrl === attachment.fileUrl)
        setCover(null);
      onUpdated?.();
    }
    return ok;
  };

  const handleMakeAttachmentCover = (attachment) =>
    handleSaveCover({
      color: null,
      imageUrl: attachment.fileUrl,
      size: "normal",
      brightness: "dark",
    });

  /* ------------------------------ keyboard ------------------------------- */

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape" || popover.type) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      onUpdated?.();
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [popover.type, onClose, onUpdated]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  /* ------------------------------- derived ------------------------------- */

  const totalItems = checklists.reduce(
    (sum, cl) => sum + (cl.items?.length || 0),
    0,
  );
  const completedItems = checklists.reduce(
    (sum, cl) => sum + (cl.items?.filter((i) => i.isCompleted).length || 0),
    0,
  );

  const dueMeta = (() => {
    if (!dueDateText) return null;
    const due = new Date(`${dueDateText}T${dueTimeText || "09:00"}`);
    if (Number.isNaN(due.getTime())) return null;
    const label = `${due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: due.getFullYear() !== new Date(now).getFullYear() ? "numeric" : undefined })}, ${due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    if (totalItems > 0 && completedItems === totalItems) {
      return { label, badge: "Complete", bg: "#BAF3DB", color: "#216E4E" };
    }
    const diff = due.getTime() - now;
    if (diff < 0)
      return { label, badge: "Overdue", bg: "#FFD5D2", color: "#AE2E24" };
    if (diff < 24 * 60 * 60 * 1000)
      return { label, badge: "Due soon", bg: "#F8E6A0", color: "#7F5F01" };
    return { label, badge: null };
  })();

  const showChecklistUI = showChecklistSection || checklists.length > 0;

  const coverActive = hasCover(cover);
  const coverImageUrl = resolveCoverImageUrl(cover?.imageUrl);
  const coverBandBackground = coverImageUrl
    ? `center / contain no-repeat url("${coverImageUrl}"), #DCDFE4`
    : coverActive
      ? getCoverBackground(cover.color, getCoverHex(cover), colorblind)
      : "#fff";
  const headerIconButtonStyle = {
    width: 32,
    height: 32,
    border: "none",
    borderRadius: 4,
    background: coverActive ? "rgba(255,255,255,0.75)" : "transparent",
    color: SUBTLE_TEXT,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };

  const memberTerm = memberSearch.trim().toLowerCase();
  const matchesMemberSearch = (person) =>
    !memberTerm ||
    memberDisplayName(person).toLowerCase().includes(memberTerm) ||
    (person.userName || "").toLowerCase().includes(memberTerm);
  const availableUsers = users.filter(
    (u) =>
      !visibleMemberIds.has(normalizeUserId(u.userId ?? u.userID)) &&
      matchesMemberSearch(u),
  );

  /* -------------------------------- render ------------------------------- */


  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(9,30,66,0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: isNarrow ? "16px 8px" : "48px 16px",
        boxSizing: "border-box",
        overflowY: "auto",
        zIndex: 1250,
      }}
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titleText || card.cardTitle}
        onClick={(e) => e.stopPropagation()}
        onDragOver={handleModalDragOver}
        onDragLeave={handleModalDragLeave}
        onDrop={handleModalDrop}
        style={{
          width: "min(1080px, 100%)",
          height: "auto",
          maxHeight: isNarrow ? "none" : "calc(100vh - 96px)",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(9,30,66,0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: TEXT,
          outline: isDraggingFile ? `2px dashed ${BRAND}` : "none",
          outlineOffset: -6,
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Close button (top-right corner) */}
          <button
            type="button"
            aria-label="Close"
            title="Close"
            onClick={handleClose}
            style={{
              ...headerIconButtonStyle,
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 2,
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>

          {/* Top-left: List (Move card) button */}
          <button
            type="button"
            title="Move card"
            onClick={openPopover("move")}
            style={{
              position: "absolute",
              top: 16,
              left: isNarrow ? 16 : 24,
              zIndex: 2,
              maxWidth: isNarrow ? 140 : 200,
              height: 32,
              padding: "0 8px 0 12px",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              background: coverActive ? "rgba(255,255,255,0.85)" : NEUTRAL_BG,
              color: TEXT,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {listName || "Move card"}
            </span>
            <KeyboardArrowDownIcon sx={{ fontSize: 18, flexShrink: 0 }} />
          </button>

          <button
            type="button"
            title="Cover"
            aria-label="Cover"
            onClick={openPopover("cover")}
            style={{
              ...headerIconButtonStyle,
              position: "absolute",
              top: 16,
              right: 56,
              zIndex: 2,
            }}
          >
            <WebAssetOutlinedIcon sx={{ fontSize: 18 }} />
          </button>


          {coverActive && (
            <div
              style={{
                height: 160,
                background: coverBandBackground,
                flexShrink: 0,
              }}
            />
          )}

          <div
            style={{
              padding: isNarrow
                ? `${coverActive ? 16 : 56}px 16px 14px`
                : `${coverActive ? 16 : 56}px 24px 14px`,
              borderBottom: `1px solid ${BORDER}`,
              background: "#fff",
              flexShrink: 0,
            }}
          >
            {/* Line 2: Card name + List dropdown */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                paddingRight: 44,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: isEditingTitle ? 40 : 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: SUBTLE_TEXT,
                  flexShrink: 0,
                }}
              >
                <RadioButtonUncheckedIcon
                  sx={{ fontSize: 20, display: "block" }}
                />
              </span>

              {isEditingTitle ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <textarea
                    autoFocus
                    rows={2}
                    value={titleText}
                    onChange={(e) => setTitleText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                      if (e.key === "Escape") {
                        titleCancelledRef.current = true;
                        handleCancelTitle();
                      }
                    }}
                    onBlur={() => {
                      if (titleCancelledRef.current) {
                        titleCancelledRef.current = false;
                        return;
                      }
                      handleSaveTitle();
                    }}
                    style={{
                      width: "100%",
                      fontSize: 20,
                      fontWeight: 600,
                      lineHeight: "28px",
                      padding: "4px 8px",
                      border: `2px solid ${BRAND}`,
                      borderRadius: 4,
                      color: TEXT,
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                      resize: "none",
                      outline: "none",
                    }}
                  />
                </div>
              ) : (
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to edit"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    margin: 0,
                    padding: "4px 0",
                    fontSize: 20,
                    fontWeight: 600,
                    lineHeight: "28px",
                    color: TEXT,
                    cursor: "pointer",
                    overflowWrap: "anywhere",
                  }}
                >
                  {titleText || card.cardTitle}
                </h2>
              )}

              {/* Date + logged-in user */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  alignSelf: "center",
                  gap: 8,
                  margin: "0 0 0 32px",
                }}
              >
                <button
                  type="button"
                  onClick={openPopover("dates")}
                  style={{
                    height: 32,
                    padding: "0 10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: "none",
                    borderRadius: 6,
                    background: NEUTRAL_BG,
                    color: TEXT,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <AccessTimeOutlinedIcon sx={{ fontSize: 16, color: BRAND }} />
                  <span>{dueMeta ? dueMeta.label : "Set date"}</span>
                  {dueMeta?.badge && (
                    <span
                      style={{
                        padding: "0 4px",
                        borderRadius: 3,
                        background: dueMeta.bg,
                        color: dueMeta.color,
                        fontSize: 12,
                        fontWeight: 600,
                        lineHeight: "16px",
                      }}
                    >
                      {dueMeta.badge}
                    </span>
                  )}
                </button>

                <span
                  style={{
                    height: 32,
                    padding: "0 10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 6,
                    background: NEUTRAL_BG,
                    color: TEXT,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <PersonOutlineIcon sx={{ fontSize: 16, color: BRAND }} />
                  {currentUserName}
                </span>
              </div>
            </div>
          </div>

            {/* Tabs + content */}
            <div
              style={{
                flex: "1 1 auto",
                minHeight: 0,
                overflowY: isNarrow ? "visible" : "auto",
                background: "#F7F8F9",
                padding: isNarrow ? "12px" : "16px 24px 24px",
              }}
            >
              {/* Tab bar (alag box) */}
              <div
                role="tablist"
                style={{
                  display: "flex",
                  background: "#fff",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "0 8px",
                  overflowX: "auto",
                }}
              >
                {TABS.map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        flex: 1,
                        minWidth: 110,
                        height: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        border: "none",
                        borderBottom: active
                          ? `2px solid ${BRAND}`
                          : "2px solid transparent",
                        background: "transparent",
                        color: active ? BRAND : SUBTLE_TEXT,
                        fontSize: 14,
                        fontWeight: active ? 600 : 500,
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab content box */}
              <div
                style={
                  activeTab === "details"
                    ? { marginTop: 12 }
                    : {
                        marginTop: 12,
                        background: "#fff",
                        border: `1px solid ${BORDER}`,
                        borderRadius: 8,
                        padding: isNarrow ? 16 : 20,
                      }
                }
              >
                {/* ---------------- DETAILS ---------------- */}
                {activeTab === "details" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isNarrow
                        ? "minmax(0, 1fr)"
                        : "minmax(0, 1fr) 300px",
                      gap: 16,
                      alignItems: "start",
                    }}
                  >
                    {/* ---------- LEFT: Labels, Description, Members, Cover ---------- */}
                    <div
                      style={{ ...detailBoxStyle, padding: isNarrow ? 16 : 20 }}
                    >
                      {/* Labels + Members */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "flex-start",
                          gap: 40,
                          marginBottom: 24,
                        }}
                      >
                        {/* Labels */}
                        <div style={{ minWidth: 0 }}>
                          <h3 style={detailHeadingStyle}>Labels</h3>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 4,
                            }}
                          >
                            {assignedLabels.map((l) => (
                              <LabelChip
                                key={l.boardLabelID}
                                label={l}
                                colorblind={colorblind}
                                onClick={openPopover("labels")}
                                style={{ maxWidth: 220 }}
                              />
                            ))}
                            <button
                              type="button"
                              title="Add label"
                              aria-label="Add label"
                              onClick={openPopover("labels")}
                              style={squareAddButtonStyle}
                            >
                              <AddIcon sx={{ fontSize: 18 }} />
                            </button>
                          </div>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <h3 style={detailHeadingStyle}>Members</h3>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 4,
                            }}
                          >
                            {visibleMembers.map((m) => (
                              <Avatar
                                key={`${m.userID ?? m.userId}-${m.isFallbackAssignedUser ? "assigned" : "member"}`}
                                name={memberDisplayName(m)}
                                title={
                                  m.isFallbackAssignedUser
                                    ? `${memberDisplayName(m)} (assigned user)`
                                    : memberDisplayName(m)
                                }
                                onClick={openPopover("member", m)}
                              />
                            ))}
                            <button
                              type="button"
                              title="Add member"
                              aria-label="Add member"
                              onClick={openPopover("members")}
                              style={{
                                ...squareAddButtonStyle,
                                borderRadius: "50%",
                              }}
                            >
                              <AddIcon sx={{ fontSize: 18 }} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          minHeight: 32,
                          marginBottom: 8,
                        }}
                      >
                        <h3 style={{ ...detailHeadingStyle, margin: 0 }}>
                          Description
                        </h3>
                        {!isEditingDescription && (
                          <button
                            type="button"
                            onClick={() => setIsEditingDescription(true)}
                            style={greyButtonStyle}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      <div style={{ marginBottom: 24 }}>
                        {isEditingDescription ? (
                          <div>
                            <textarea
                              autoFocus
                              value={descriptionText}
                              onChange={(e) =>
                                setDescriptionText(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Escape")
                                  handleCancelDescription();
                              }}
                              placeholder="Add a more detailed description..."
                              style={{
                                width: "100%",
                                height: DESCRIPTION_BOX_HEIGHT,
                                padding: "10px 12px",
                                border: `2px solid ${BRAND}`,
                                borderRadius: 6,
                                fontSize: 14,
                                lineHeight: "22px",
                                color: TEXT,
                                boxSizing: "border-box",
                                resize: "none",
                                overflowY: "auto",
                                fontFamily: "inherit",
                                outline: "none",
                              }}
                            />
                            <div
                              style={{ display: "flex", gap: 8, marginTop: 8 }}
                            >
                              <button
                                type="button"
                                onClick={handleSaveDescription}
                                style={primaryButtonStyle}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelDescription}
                                style={{
                                  ...greyButtonStyle,
                                  background: "transparent",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : descriptionText ? (
                          <div
                            onClick={(e) => {
                              if (e.target.tagName !== "A")
                                setIsEditingDescription(true);
                            }}
                            style={{
                              height: DESCRIPTION_BOX_HEIGHT,
                              padding: "8px 12px",
                              border: `1px solid ${BORDER}`,
                              borderRadius: 6,
                              boxSizing: "border-box",
                              overflowY: "auto",
                              fontSize: 14,
                              lineHeight: "22px",
                              color: TEXT,
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                              cursor: "pointer",
                            }}
                          >
                            <LinkifiedText text={descriptionText} />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsEditingDescription(true)}
                            style={{
                              width: "100%",
                              height: DESCRIPTION_BOX_HEIGHT,
                              padding: "10px 12px",
                              border: "none",
                              borderRadius: 6,
                              background: NEUTRAL_BG,
                              color: SUBTLE_TEXT,
                              fontSize: 14,
                              fontFamily: "inherit",
                              textAlign: "left",
                              verticalAlign: "top",
                              display: "flex",
                              alignItems: "flex-start",
                              cursor: "pointer",
                            }}
                          >
                            Add a more detailed description...
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        minWidth: 0,
                      }}
                    >
                      <div style={detailBoxStyle}>
                        <h3 style={detailHeadingStyle}>Quick Actions</h3>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 8,
                          }}
                        >
                          <button
                            type="button"
                            onClick={openPopover("move")}
                            style={quickActionButtonStyle}
                          >
                            <SwapHorizIcon sx={{ fontSize: 20 }} />
                            Move
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteCard}
                            style={{
                              ...quickActionButtonStyle,
                              color: "#C9372C",
                              border: "1px solid #F5C6C2",
                            }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                            Delete
                          </button>
                        </div>
                      </div>

                      <div style={detailBoxStyle}>
                        <h3 style={detailHeadingStyle}>Task Info</h3>
                        {[
                          [
                            "Created",
                            formatInfoDate(
                              card.createdDate ??
                                card.createdAt ??
                                card.createdOn,
                            ),
                          ],
                          [
                            "Updated",
                            formatInfoDate(
                              card.updatedDate ??
                                card.updatedAt ??
                                card.modifiedDate ??
                                card.modifiedOn,
                            ),
                          ],
                          [
                            "Created by",
                            (() => {
                              const currentUsername =
                                localStorage.getItem("userName") ||
                                localStorage.getItem("username") ||
                                sessionStorage.getItem("userName") ||
                                sessionStorage.getItem("username") ||
                                "";

                              const currentUser = allMembers.find(
                                (m) =>
                                  String(
                                    m.UserName ?? m.userName ?? "",
                                  ).toLowerCase() ===
                                  String(currentUsername).toLowerCase(),
                              );

                              return currentUser
                                ? `${currentUser.FirstName ?? currentUser.firstName ?? ""} ${
                                    currentUser.LastName ??
                                    currentUser.lastName ??
                                    ""
                                  }`.trim() ||
                                    currentUser.UserName ||
                                    currentUser.userName
                                : currentUserName;
                            })(),
                          ],
                          [
                            "Board",
                            boards.find(
                              (b) =>
                                normalizeUserId(b.boardID ?? b.boardId) ===
                                normalizeUserId(boardId),
                            )?.boardName ??
                              card.boardName ??
                              "—",
                          ],
                        ].map(([label, value], i, arr) => (
                          <div
                            key={label}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              padding: "10px 0",
                              borderBottom:
                                i < arr.length - 1
                                  ? `1px solid ${BORDER}`
                                  : "none",
                              fontSize: 14,
                            }}
                          >
                            <span style={{ color: SUBTLE_TEXT, flexShrink: 0 }}>
                              {label}
                            </span>
                            <span
                              style={{
                                color: TEXT,
                                textAlign: "right",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {String(value)}
                            </span>
                          </div>
                        ))}

                        <h3 style={{ ...detailHeadingStyle, marginTop: 28 }}>
                          Progress
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              borderRadius: 4,
                              background: NEUTRAL_BG,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0}%`,
                                height: "100%",
                                borderRadius: 4,
                                background:
                                  totalItems > 0 &&
                                  completedItems === totalItems
                                    ? "#1F845A"
                                    : BRAND,
                                transition: "width 0.3s, background 0.3s",
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: TEXT,
                            }}
                          >
                            {totalItems > 0
                              ? Math.round((completedItems / totalItems) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                        <p
                          style={{
                            margin: "6px 0 0",
                            fontSize: 12,
                            color: SUBTLE_TEXT,
                          }}
                        >
                          {completedItems}/{totalItems} completed
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "commentsActivity" && (
                  <CardCommentsPanel
                    cardId={card.cardID}
                    activityVersion={activityVersion}
                  />
                )}

                {/* ---------------- ATTACHMENTS ---------------- */}
                {activeTab === "attachments" &&
                  (attachments.length > 0 ? (
                    <CardAttachmentsSection
                      attachments={attachments}
                      coverImageUrl={cover?.imageUrl || null}
                      onAddClick={openPopover("attach")}
                      onUpdate={updateAttachment}
                      onDelete={handleDeleteAttachment}
                      onMakeCover={handleMakeAttachmentCover}
                      onRemoveCover={handleRemoveCover}
                    />
                  ) : (
                    <div style={{ textAlign: "center", padding: "24px 0" }}>
                      <p
                        style={{
                          margin: "0 0 12px",
                          fontSize: 14,
                          color: SUBTLE_TEXT,
                        }}
                      >
                        No attachments yet.
                      </p>
                      <button
                        type="button"
                        onClick={openPopover("attach")}
                        style={actionButtonStyle}
                      >
                        <AttachFileIcon sx={{ fontSize: 16 }} /> Add attachment
                      </button>
                    </div>
                  ))}

                {/* ---------------- CHECKLIST ---------------- */}
                {activeTab === "checklist" && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginBottom: 16,
                      }}
                    >
                      <button
                        type="button"
                        onClick={openPopover("checklist")}
                        style={actionButtonStyle}
                      >
                        <CheckBoxOutlinedIcon sx={{ fontSize: 16 }} /> Add
                        checklist
                      </button>
                    </div>

                    {checklists.length === 0 && (
                      <p
                        style={{
                          margin: 0,
                          padding: "16px 0",
                          textAlign: "center",
                          fontSize: 14,
                          color: SUBTLE_TEXT,
                        }}
                      >
                        No checklists yet.
                      </p>
                    )}

                    {checklists.map((cl) => {
                      const items = cl.items || [];
                      const completed = items.filter(
                        (i) => i.isCompleted,
                      ).length;
                      const total = items.length;
                      const percent =
                        total > 0 ? Math.round((completed / total) * 100) : 0;
                      const hideChecked = !!hideCheckedFor[cl.checklistID];
                      const shownItems = hideChecked
                        ? items.filter((i) => !i.isCompleted)
                        : items;

                      return (
                        <section
                          key={cl.checklistID}
                          style={{ marginBottom: 28 }}
                        >
                          <SectionHeader
                            icon={
                              <CheckBoxOutlinedIcon sx={{ fontSize: 20 }} />
                            }
                            title={cl.checklistTitle}
                            action={
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  flexShrink: 0,
                                }}
                              >
                                {completed > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setHideCheckedFor((prev) => ({
                                        ...prev,
                                        [cl.checklistID]: !prev[cl.checklistID],
                                      }))
                                    }
                                    style={greyButtonStyle}
                                  >
                                    {hideChecked
                                      ? `Show checked items (${completed})`
                                      : "Hide checked items"}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={openPopover("deleteChecklist", cl)}
                                  style={greyButtonStyle}
                                >
                                  Delete
                                </button>
                              </div>
                            }
                          />

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              marginBottom: 8,
                            }}
                          >
                            <span
                              style={{
                                width: 20,
                                fontSize: 11,
                                color: SUBTLE_TEXT,
                                textAlign: "center",
                                flexShrink: 0,
                              }}
                            >
                              {percent}%
                            </span>
                            <div
                              style={{
                                flex: 1,
                                height: 8,
                                borderRadius: 4,
                                background: NEUTRAL_BG,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${percent}%`,
                                  height: "100%",
                                  borderRadius: 4,
                                  background:
                                    percent === 100 ? "#1F845A" : BRAND,
                                  transition: "width 0.3s, background 0.3s",
                                }}
                              />
                            </div>
                          </div>

                          {hideChecked &&
                            shownItems.length === 0 &&
                            total > 0 && (
                              <p
                                style={{
                                  margin: "4px 0 8px 32px",
                                  fontSize: 14,
                                  color: SUBTLE_TEXT,
                                }}
                              >
                                Everything in this checklist is complete!
                              </p>
                            )}

                          <div>
                            {shownItems.map((item) => {
                              const isEditing =
                                editingItemId === item.checklistItemID;
                              const isHovered =
                                hoveredItemId === item.checklistItemID;
                              return (
                                <div
                                  key={item.checklistItemID}
                                  onMouseEnter={() =>
                                    setHoveredItemId(item.checklistItemID)
                                  }
                                  onMouseLeave={() => setHoveredItemId(null)}
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 12,
                                    padding: "6px 4px",
                                    margin: "0 -4px",
                                    borderRadius: 4,
                                    background:
                                      isHovered && !isEditing
                                        ? NEUTRAL_BG
                                        : "transparent",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 20,
                                      display: "flex",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <ChecklistCheckbox
                                      checked={!!item.isCompleted}
                                      onChange={() =>
                                        handleToggleItem(
                                          item.checklistItemID,
                                          item.isCompleted,
                                        )
                                      }
                                    />
                                  </span>

                                  {isEditing ? (
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <textarea
                                        autoFocus
                                        rows={2}
                                        value={editingText}
                                        onChange={(e) =>
                                          setEditingText(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleSaveEdit(
                                              item.checklistItemID,
                                            );
                                          }
                                          if (e.key === "Escape")
                                            handleCancelEdit();
                                        }}
                                        style={{
                                          width: "100%",
                                          padding: "6px 8px",
                                          border: `2px solid ${BRAND}`,
                                          borderRadius: 4,
                                          fontSize: 14,
                                          color: TEXT,
                                          fontFamily: "inherit",
                                          boxSizing: "border-box",
                                          resize: "none",
                                          outline: "none",
                                        }}
                                      />
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: 8,
                                          marginTop: 6,
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSaveEdit(item.checklistItemID)
                                          }
                                          style={primaryButtonStyle}
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleCancelEdit}
                                          style={{
                                            ...greyButtonStyle,
                                            background: "transparent",
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <span
                                        onClick={() => handleStartEdit(item)}
                                        title="Click to edit"
                                        style={{
                                          flex: 1,
                                          minWidth: 0,
                                          fontSize: 14,
                                          lineHeight: "20px",
                                          cursor: "pointer",
                                          overflowWrap: "anywhere",
                                          textDecoration: item.isCompleted
                                            ? "line-through"
                                            : "none",
                                          color: item.isCompleted
                                            ? MUTED_TEXT
                                            : TEXT,
                                        }}
                                      >
                                        {item.itemName}
                                      </span>
                                      <button
                                        type="button"
                                        title="Delete item"
                                        aria-label="Delete item"
                                        onClick={() =>
                                          handleRemoveItem(item.checklistItemID)
                                        }
                                        style={{
                                          width: 24,
                                          height: 24,
                                          border: "none",
                                          borderRadius: 4,
                                          background: "transparent",
                                          color: SUBTLE_TEXT,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          cursor: "pointer",
                                          padding: 0,
                                          flexShrink: 0,
                                          visibility: isHovered
                                            ? "visible"
                                            : "hidden",
                                        }}
                                      >
                                        <DeleteOutlineIcon
                                          sx={{ fontSize: 18 }}
                                        />
                                      </button>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div style={{ paddingLeft: 32, marginTop: 8 }}>
                            {addingItemFor === cl.checklistID ? (
                              <div>
                                <textarea
                                  autoFocus
                                  rows={2}
                                  placeholder="Add an item"
                                  value={newItems[cl.checklistID] || ""}
                                  onChange={(e) =>
                                    setNewItems((prev) => ({
                                      ...prev,
                                      [cl.checklistID]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddItem(cl.checklistID);
                                    }
                                    if (e.key === "Escape")
                                      setAddingItemFor(null);
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "8px 10px",
                                    border: `2px solid ${BRAND}`,
                                    borderRadius: 4,
                                    fontSize: 14,
                                    color: TEXT,
                                    fontFamily: "inherit",
                                    boxSizing: "border-box",
                                    resize: "none",
                                    outline: "none",
                                  }}
                                />
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    marginTop: 6,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAddItem(cl.checklistID)
                                    }
                                    style={primaryButtonStyle}
                                  >
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAddingItemFor(null)}
                                    style={{
                                      ...greyButtonStyle,
                                      background: "transparent",
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAddingItemFor(cl.checklistID)}
                                style={greyButtonStyle}
                              >
                                Add an item
                              </button>
                            )}
                          </div>
                        </section>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

          {/* ------------------------------ Popovers ------------------------------ */}
          <div onClick={(e) => e.stopPropagation()}>
            <CardPopover
              open={popover.type === "labels"}
              anchorEl={popover.anchorEl}
              anchorPosition={popover.anchorPosition}
              onClose={closePopover}
            >
              <LabelsPopover
                labels={boardLabels}
                loading={labelsLoading}
                saving={labelSaving}
                onToggle={handleToggleLabel}
                onCreate={handleCreateLabel}
                onUpdate={handleUpdateLabel}
                onDelete={handleDeleteLabel}
                onClose={closePopover}
              />
            </CardPopover>

            <CardPopover
              open={popover.type === "attach"}
              anchorEl={popover.anchorEl}
              anchorPosition={popover.anchorPosition}
              onClose={closePopover}
            >
              <AttachPopover
                uploading={attachmentsUploading}
                onUploadFiles={handleUploadAttachments}
                onAddLink={handleAddAttachmentLink}
                onClose={closePopover}
              />
            </CardPopover>

            <CardPopover
              open={popover.type === "move"}
              anchorEl={popover.anchorEl}
              anchorPosition={popover.anchorPosition}
              onClose={closePopover}
            >
              <MoveCardPopover
                cardId={card.cardID}
                currentBoardId={card.boardID ?? boardId}
                currentListId={card.listID}
                onMove={handleMoveCard}
                onClose={closePopover}
              />
            </CardPopover>

            <CardPopover
              open={popover.type === "cover"}
              anchorEl={popover.anchorEl}
              anchorPosition={popover.anchorPosition}
              onClose={closePopover}
            >
              <CardCoverPopover
                cover={cover}
                saving={coverSaving}
                onSave={handleSaveCover}
                onRemove={handleRemoveCover}
                onUpload={handleUploadCover}
                onClose={closePopover}
                style={{
                  position: "static",
                  width: "100%",
                  padding: 0,
                  boxShadow: "none",
                  maxHeight: "none",
                  overflow: "visible",
                }}
              />
            </CardPopover>

            <CardPopover
              open={popover.type === "checklist"}
              anchorEl={popover.anchorEl}
              anchorPosition={popover.anchorPosition}
              onClose={closePopover}
            >
              <PopoverHeader title="Add checklist" onClose={closePopover} />
              <p style={{ ...popoverSectionTitle, marginTop: 4 }}>Title</p>
              <input
                autoFocus
                value={newChecklistTitle}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddChecklist()}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={handleAddChecklist}
                disabled={!newChecklistTitle.trim()}
                style={{
                  ...primaryButtonStyle,
                  marginTop: 12,
                  opacity: newChecklistTitle.trim() ? 1 : 0.5,
                  cursor: newChecklistTitle.trim() ? "pointer" : "not-allowed",
                }}
              >
                Add
              </button>
            </CardPopover>

            <CardPopover
              open={popover.type === "deleteChecklist"}
              anchorEl={popover.anchorEl}
              anchorPosition={popover.anchorPosition}
              onClose={closePopover}
            >
              <PopoverHeader
                title={`Delete ${popover.data?.checklistTitle || "checklist"}?`}
                onClose={closePopover}
              />
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 14,
                  lineHeight: "20px",
                  color: TEXT,
                }}
              >
                Deleting a checklist is permanent and there is no way to get it
                back.
              </p>
              <button
                type="button"
                onClick={() => handleDeleteChecklist(popover.data?.checklistID)}
                style={{ ...dangerButtonStyle, width: "100%" }}
              >
                Delete checklist
              </button>
            </CardPopover>

            <CardPopover
              open={popover.type === "members"}
              anchorEl={popover.anchorEl}
              anchorPosition={popover.anchorPosition}
              onClose={() => {
                setMemberSearch("");
                closePopover();
              }}
            >
              <PopoverHeader
                title="Members"
                onClose={() => {
                  setMemberSearch("");
                  closePopover();
                }}
              />
              <input
                autoFocus
                placeholder="Search members"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                style={inputStyle}
              />
              {visibleMembers.filter(matchesMemberSearch).length > 0 && (
                <>
                  <p style={popoverSectionTitle}>Card members</p>
                  {visibleMembers.filter(matchesMemberSearch).map((m) => (
                    <div
                      key={`cm-${m.userID ?? m.userId}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "4px",
                        borderRadius: 4,
                      }}
                    >
                      <Avatar name={memberDisplayName(m)} size={28} />
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {memberDisplayName(m)}
                      </span>
                      {m.isFallbackAssignedUser ? (
                        <span style={{ fontSize: 12, color: SUBTLE_TEXT }}>
                          Assigned
                        </span>
                      ) : (
                        <button
                          type="button"
                          title="Remove from card"
                          aria-label={`Remove ${memberDisplayName(m)}`}
                          onClick={() =>
                            handleRemoveMember(m.userID ?? m.userId)
                          }
                          style={{
                            width: 28,
                            height: 28,
                            border: "none",
                            borderRadius: 4,
                            background: "transparent",
                            color: SUBTLE_TEXT,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0,
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
              <p style={popoverSectionTitle}>Users</p>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {availableUsers.length === 0 ? (
                  <p
                    style={{ margin: "4px", fontSize: 13, color: SUBTLE_TEXT }}
                  >
                    {memberTerm
                      ? "No users found."
                      : "All users already added."}
                  </p>
                ) : (
                  availableUsers.map((u) => (
                    <button
                      key={`u-${u.userId ?? u.userID}`}
                      type="button"
                      onClick={() => handleAddMember(u.userId ?? u.userID)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: 4,
                        border: "none",
                        borderRadius: 4,
                        background: "transparent",
                        color: TEXT,
                        fontSize: 14,
                        fontFamily: "inherit",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = NEUTRAL_BG)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Avatar name={memberDisplayName(u)} size={28} />
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {memberDisplayName(u)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </CardPopover>

            <CardPopover
              open={popover.type === "member"}
              anchorEl={popover.anchorEl}
              anchorPosition={popover.anchorPosition}
              onClose={closePopover}
              width={280}
            >
              {popover.data && (
                <>
                  <PopoverHeader title="" onClose={closePopover} />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Avatar name={memberDisplayName(popover.data)} size={48} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{ fontSize: 16, fontWeight: 600, color: TEXT }}
                      >
                        {memberDisplayName(popover.data)}
                      </div>
                      {popover.data.userName && (
                        <div style={{ fontSize: 13, color: SUBTLE_TEXT }}>
                          @{popover.data.userName}
                        </div>
                      )}
                    </div>
                  </div>
                  {popover.data.isFallbackAssignedUser ? (
                    <p style={{ margin: 0, fontSize: 13, color: SUBTLE_TEXT }}>
                      This user is assigned to the card.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await handleRemoveMember(
                          popover.data.userID ?? popover.data.userId,
                        );
                        closePopover();
                      }}
                      style={{ ...greyButtonStyle, width: "100%" }}
                    >
                      Remove from card
                    </button>
                  )}
                </>
              )}
            </CardPopover>

            <CardPopover
              open={popover.type === "dates"}
              anchorEl={popover.anchorEl}
              anchorPosition={popover.anchorPosition}
              onClose={handleCancelDueDate}
            >
              <PopoverHeader title="Dates" onClose={handleCancelDueDate} />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() =>
                    setCalendarViewDate(
                      new Date(
                        calendarViewDate.getFullYear(),
                        calendarViewDate.getMonth() - 1,
                        1,
                      ),
                    )
                  }
                  style={{ ...squareAddButtonStyle, background: "transparent" }}
                >
                  <ChevronLeftIcon sx={{ fontSize: 20 }} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {MONTH_NAMES[calendarViewDate.getMonth()]}{" "}
                  {calendarViewDate.getFullYear()}
                </span>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() =>
                    setCalendarViewDate(
                      new Date(
                        calendarViewDate.getFullYear(),
                        calendarViewDate.getMonth() + 1,
                        1,
                      ),
                    )
                  }
                  style={{ ...squareAddButtonStyle, background: "transparent" }}
                >
                  <ChevronRightIcon sx={{ fontSize: 20 }} />
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  marginBottom: 4,
                }}
              >
                {WEEKDAY_LABELS.map((w) => (
                  <div
                    key={w}
                    style={{
                      textAlign: "center",
                      fontSize: 11,
                      color: SUBTLE_TEXT,
                      fontWeight: 600,
                      padding: "2px 0",
                    }}
                  >
                    {w}
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 2,
                  marginBottom: 12,
                }}
              >
                {getMonthGrid(calendarViewDate).map((cell, i) => {
                  const key = toDateKey(cell.date);
                  const isSelected = dueDateText === key;
                  const isToday = key === toDateKey(new Date());
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDueDateText(key)}
                      style={{
                        height: 32,
                        border: "none",
                        borderRadius: 4,
                        background: isSelected ? BRAND : "transparent",
                        color: isSelected
                          ? "#fff"
                          : cell.currentMonth
                            ? TEXT
                            : "#A5ADBA",
                        fontWeight: isToday || isSelected ? 700 : 400,
                        boxShadow:
                          isToday && !isSelected
                            ? `inset 0 -2px 0 ${BRAND}`
                            : "none",
                        fontSize: 13,
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              <p style={popoverSectionTitle}>Start date</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={includeStartDate}
                  onChange={(e) => {
                    setIncludeStartDate(e.target.checked);
                    if (e.target.checked && !startDateText)
                      setStartDateText(dueDateText || toDateKey(new Date()));
                  }}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <input
                  type="date"
                  disabled={!includeStartDate}
                  value={startDateText}
                  onChange={(e) => setStartDateText(e.target.value)}
                  style={{
                    ...inputStyle,
                    flex: 1,
                    opacity: includeStartDate ? 1 : 0.5,
                  }}
                />
              </div>

              <p style={popoverSectionTitle}>Due date</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="date"
                  value={dueDateText}
                  onChange={(e) => {
                    setDueDateText(e.target.value);
                    if (e.target.value)
                      setCalendarViewDate(
                        new Date(`${e.target.value}T00:00:00`),
                      );
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  type="time"
                  value={dueTimeText}
                  onChange={(e) => setDueTimeText(e.target.value || "09:00")}
                  style={{
                    ...inputStyle,
                    width: 140,
                    minWidth: 125,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <p style={popoverSectionTitle}>Recurring</p>
              <select
                value={recurringRule}
                onChange={(e) => setRecurringRule(e.target.value)}
                style={selectStyle}
              >
                {RECURRING_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              <p style={popoverSectionTitle}>Set due date reminder</p>
              <select
                value={reminderOffset}
                onChange={(e) => setReminderOffset(e.target.value)}
                style={selectStyle}
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p
                style={{
                  margin: "6px 0 12px",
                  fontSize: 12,
                  color: SUBTLE_TEXT,
                }}
              >
                Reminders will be sent to all members and watchers of this card.
              </p>

              <button
                type="button"
                onClick={handleSaveDueDate}
                disabled={!dueDateText}
                style={{
                  ...primaryButtonStyle,
                  width: "100%",
                  opacity: dueDateText ? 1 : 0.5,
                  cursor: dueDateText ? "pointer" : "not-allowed",
                }}
              >
                Save
              </button>
              {card.dueDate && (
                <button
                  type="button"
                  onClick={handleClearDueDate}
                  style={{ ...greyButtonStyle, width: "100%", marginTop: 8 }}
                >
                  Remove
                </button>
              )}
            </CardPopover>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
