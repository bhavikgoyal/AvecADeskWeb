import { Droppable } from '@hello-pangea/dnd';
import CardItem from './CardItem';

const COLUMN_COLORS = [
  { accent: '#6366f1', bg: '#eef2ff', text: '#4338ca' },  
  { accent: '#f97316', bg: '#fff7ed', text: '#c2410c' },   
  { accent: '#22c55e', bg: '#f0fdf4', text: '#15803d' },   
  { accent: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8' },   
  { accent: '#ef4444', bg: '#fef2f2', text: '#b91c1c' },   
  { accent: '#eab308', bg: '#fefce8', text: '#a16207' },  
  { accent: '#ec4899', bg: '#fdf2f8', text: '#be185d' },   
];

export function getColumnColor(index) {
  return COLUMN_COLORS[index % COLUMN_COLORS.length];
}

export default function BoardColumn({
  column,
  columnIndex,       
  onAddCard,
  onDeleteCard,
  onCardClick,
}) {
  const theme = getColumnColor(columnIndex ?? 0); 

  return (
    <div
      style={{
        minWidth: 260,
        maxWidth: 260,
        flex: '0 0 260px',
        background: '#fff',                         
        border: '1px solid #e5e7eb',
        borderTop: `3px solid ${theme.accent}`,       
        borderRadius: 10,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: '78vh',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '2px 4px',
          flexShrink: 0,
          gap: 8,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 15,
              color: '#000',                      
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            flex: 1,
            minWidth: 0,
            lineHeight: 1.3,
          }}
        >
          {column.statusName}
        </span>

        <span
          style={{
            background: theme.bg,                     
            color: '#000',                        
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            padding: '2px 10px',
            border: `1px solid ${theme.accent}33`,     
            flexShrink: 0,
            marginTop: 1,
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
              flex: '1 1 0',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              borderRadius: 8,
              padding: '2px 2px 8px 2px',
              background: snapshot.isDraggingOver
                ? theme.bg                              
                : 'transparent',
            }}
          >
            {column.cards.map((card, index) => (
              <CardItem
                key={card.cardID}
                card={card}
                index={index}
                theme={theme}                           
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
            color: '#000',                           
          cursor: 'pointer',
          flexShrink: 0,
          fontWeight: 500,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = theme.bg;
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