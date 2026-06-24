import { Droppable } from '@hello-pangea/dnd';
import CardItem from './CardItem';

export default function BoardColumn({
  column,
  onAddCard,
  onDeleteCard,
  onCardClick,
}) {
  return (
    <div
      style={{
        minWidth: 260,
        flex: '0 0 260px',
        background: '#f3f4f6',
        borderRadius: 10,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxHeight: '78vh',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 4px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {column.statusName}
        </span>

        <span
          style={{
            background: '#fff',
            borderRadius: 999,
            fontSize: 12,
            padding: '2px 10px',
            color: '#6b7280',
            border: '1px solid #e5e7eb',
          }}
        >
          {column.count}
        </span>
      </div>

      <Droppable droppableId={String(column.cardStatusID)}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minHeight: 60,
              flex: 1,
              overflowY: 'auto',
              borderRadius: 8,
              padding: '2px 2px 8px 2px',
              background: snapshot.isDraggingOver
                ? '#e5e7eb'
                : 'transparent',
            }}
          >
            {column.cards.map((card, index) => (
              <CardItem
                key={card.cardID}
                card={card}
                index={index}
                onDelete={onDeleteCard}
                onCardClick={onCardClick}
              />
            ))}

            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <button
        onClick={onAddCard}
        style={{
          textAlign: 'left',
          background: 'transparent',
          border: '1px solid transparent',
          borderRadius: 6,
          padding: '6px 8px',
          fontSize: 13,
          color: '#374151',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#e5e7eb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        + Add a card
      </button>
    </div>
  );
}
