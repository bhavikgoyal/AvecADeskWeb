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

export default function CardItem({ card, index, onDelete, onCardClick }) {
  const tags = [card.priorityName, card.statusName].filter(Boolean);

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
            ...provided.draggableProps.style,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, paddingRight: 8 }}>{card.cardTitle}</p>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(card.cardID); }}
              aria-label="Delete card"
              style={{ border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 14 }}
            >
              ×
            </button>
          </div>

          {tags.length > 0 && (
            <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {tags.map((tag) => {
                const style = tagStyle(tag);
                return (
                  <span key={tag} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: style.bg, color: style.color }}>
                    {tag}
                  </span>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6b7280', fontSize: 12 }}>
            <span>{card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ''}</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Checklist badge */}
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

              {/* Avatar */}
              <div
                style={{ width: 22, height: 22, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#374151' }}
                title={card.assignedUserName || 'Unassigned'}
              >
                {card.assignedUserName ? card.assignedUserName.slice(0, 2).toUpperCase() : '?'}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
