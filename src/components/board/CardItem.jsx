import { Draggable } from '@hello-pangea/dnd';

function tagStyle(tag) {
  const map = {
    High: { bg: '#fee2e2', color: '#991b1b' },
    Medium: { bg: '#fef3c7', color: '#92400e' },
    Low: { bg: '#dcfce7', color: '#166534' },
    Extraction: { bg: '#dbeafe', color: '#1e40af' },
    Unassigned: { bg: '#d1fae5', color: '#065f46' },
  };
  return map[tag] || { bg: '#e5e7eb', color: '#374151' };
}

function isOverdue(dueDate, checklistCompleted, checklistTotal) {
  if (!dueDate) return false;
  if (checklistTotal > 0 && checklistCompleted === checklistTotal) return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function CardItem({ card, index, theme, onDelete, onCardClick }) {
  const labels = card.labels || [];
  const overdue = isOverdue(card.dueDate, card.checklistCompleted, card.checklistTotal);
  const priorityTag = card.priorityName ? tagStyle(card.priorityName) : null;

  return (
    <Draggable draggableId={String(card.cardID)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onCardClick(card)}
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 10,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: snapshot.isDragging ? '0 4px 10px rgba(0,0,0,0.12)' : 'none',
            boxSizing: 'border-box',
            maxWidth: '100%',
            overflowWrap: 'break-word',
            ...provided.draggableProps.style,
          }}
        >
          {labels.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
              {labels.map((l) => (
                <span
                  key={l.labelID ?? l.labelId}
                  title={l.labelName}
                  style={{
                    height: 8,
                    minWidth: 32,
                    borderRadius: 4,
                    background: l.color || '#94c748',
                  }}
                />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p
              style={{
                margin: '0 0 8px',
                fontWeight: 600,
                paddingRight: 8,
                flex: 1,
                minWidth: 0,
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              {card.cardTitle}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(card.cardID); }}
              aria-label="Delete card"
              style={{ border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
            >
              ×
            </button>
          </div>

          {/* CHANGED: status badge ab column ka theme color use karta hai, priority alag rangeen tag */}
          {(card.statusName || card.priorityName) && (
            <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap', minWidth: 0 }}>
              {card.statusName && theme && (
  <span
    style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 6,
      background: theme.bg,
      color: '#000',
      maxWidth: '100%',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
      whiteSpace: 'normal',
    }}
  >
    {card.statusName}
  </span>
)}

{card.priorityName && priorityTag && (
  <span
    style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 6,
      background: priorityTag.bg,
      color: '#000',
      maxWidth: '100%',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
      whiteSpace: 'normal',
    }}
  >
    {card.priorityName}
  </span>
)}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6b7280', fontSize: 12, gap: 6 }}>
            {card.dueDate ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: overdue ? '2px 7px' : '0',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: overdue ? 600 : 400,
                  background: overdue ? '#fee2e2' : 'transparent',
                  color: overdue ? '#b91c1c' : '#6b7280',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                📅 {new Date(card.dueDate).toISOString().slice(0, 10)}
              </span>
            ) : <span />}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {card.checklistTotal > 0 && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 7px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  background: card.checklistCompleted === card.checklistTotal ? '#166534' : '#e5e7eb',
                  color: card.checklistCompleted === card.checklistTotal ? '#fff' : '#374151',
                }}>
                  ✓ {card.checklistCompleted}/{card.checklistTotal}
                </span>
              )}

             <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#f3f4f6',
                  color: '#000',
                  border: '1px solid #d1d5db',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
  title={card.assignedUserName || 'Unassigned'}
>
  {card.assignedUserName
    ? card.assignedUserName.slice(0, 2).toUpperCase()
    : '?'}
</div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}