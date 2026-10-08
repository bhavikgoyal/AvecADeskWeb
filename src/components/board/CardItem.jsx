import { Draggable } from '@hello-pangea/dnd';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import {
  getCoverBackground,
  getCoverHex,
  getCoverTextHex,
  hasCover,
  resolveCoverImageUrl,
  useColorblindMode,
} from '../../utils/cardCover';
import { getLabelTextColor } from '../../utils/labelColors';
import { getAvatarColor, getInitials } from './cardModalStyles';

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

const tagChipStyle = {
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 6,
  color: '#000',
  maxWidth: '100%',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  whiteSpace: 'normal',
};

export default function CardItem({ card, index, theme, onDelete, onCardClick }) {
  const labels = card.labels || [];
  const overdue = isOverdue(card.dueDate, card.checklistCompleted, card.checklistTotal);
  const priorityTag = card.priorityName ? tagStyle(card.priorityName) : null;
  const [colorblind] = useColorblindMode();

  const cover = hasCover(card.cover) ? card.cover : null;
  const coverImageUrl = resolveCoverImageUrl(cover?.imageUrl);
  const coverBackground = cover && !coverImageUrl
    ? getCoverBackground(cover.color, getCoverHex(cover), colorblind)
    : null;
  const isFullCover = cover?.size === 'full';

    // Card members + assigned user (modal જેવી જ logic)
  const cardMembers = (card.members || []).map((m) => ({
    id: m.userID ?? m.userId,
    name:
      `${m.firstName || ''} ${m.lastName || ''}`.trim() ||
      m.userName ||
      'Unknown',
  }));
  const assignedInMembers = cardMembers.some(
    (m) => String(m.id) === String(card.assignedUserID),
  );
  const memberList =
    card.assignedUserName && !assignedInMembers
      ? [
          { id: `assigned-${card.assignedUserID}`, name: card.assignedUserName },
          ...cardMembers,
        ]
      : cardMembers;
  const shownMembers = memberList.slice(0, 3);
  const extraMembers = memberList.length - shownMembers.length;

  const deleteButton = (color = '#9ca3af', extraStyle = {}) => (
    <button
      onClick={(e) => { e.stopPropagation(); onDelete(card.cardID); }}
      aria-label="Delete card"
      style={{ border: 'none', background: 'transparent', color, cursor: 'pointer', fontSize: 14, flexShrink: 0, ...extraStyle }}
    >
      ×
    </button>
  );

  const labelsRow = labels.length > 0 && (
    <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
      {labels.map((l) => (
        <span
          key={l.labelID ?? l.labelId}
          title={l.labelName}
          style={{
            height: 16,
            minWidth: 40,
            maxWidth: '100%',
            padding: '0 6px',
            borderRadius: 4,
            boxSizing: 'border-box',
            background: l.color || '#fff',
            border: l.color ? 'none' : '1px dashed #8590A2',
            color: l.color ? getLabelTextColor(l.color) : '#44546F',
            fontSize: 11,
            fontWeight: 600,
            lineHeight: '16px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {l.labelName}
        </span>
      ))}
    </div>
  );

  const statusRow = (card.statusName || card.priorityName) && (
    <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap', minWidth: 0 }}>
      {card.statusName && theme && (
        <span style={{ ...tagChipStyle, background: theme.bg }}>{card.statusName}</span>
      )}
      {card.priorityName && priorityTag && (
        <span style={{ ...tagChipStyle, background: priorityTag.bg }}>{card.priorityName}</span>
      )}
    </div>
  );

  const footerRow = (
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
        {card.attachmentCount > 0 && (
          <span
            title={`${card.attachmentCount} attachment${card.attachmentCount === 1 ? '' : 's'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#44546F' }}
          >
            <AttachFileIcon sx={{ fontSize: 14, transform: 'rotate(45deg)' }} />
            {card.attachmentCount}
          </span>
        )}
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

                {memberList.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {shownMembers.map((m, i) => (
              <div
                key={m.id}
                title={m.name}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: getAvatarColor(m.name),
                  color: '#fff',
                  border: '2px solid #fff',
                  boxSizing: 'border-box',
                  marginLeft: i === 0 ? 0 : -6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {getInitials(m.name)}
              </div>
            ))}
            {extraMembers > 0 && (
              <div
                title={`${extraMembers} more`}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: '2px solid #fff',
                  boxSizing: 'border-box',
                  marginLeft: -6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                +{extraMembers}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const titleRow = (
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
      {deleteButton()}
    </div>
  );

  // Full image cover: title sits on the image, but labels/badges stay visible below it
  const renderFullImageCover = () => {
    const darkImage = (cover.brightness || 'dark') === 'dark';
    return (
      <>
        <div
          style={{
            position: 'relative',
            minHeight: 150,
            display: 'flex',
            alignItems: 'flex-end',
            background: `${darkImage
              ? 'linear-gradient(transparent 35%, rgba(0,0,0,0.65))'
              : 'linear-gradient(transparent 35%, rgba(255,255,255,0.85))'}, center / cover no-repeat url("${coverImageUrl}")`,
          }}
        >
          {deleteButton(darkImage ? '#fff' : '#44546F', {
            position: 'absolute',
            top: 6,
            right: 6,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: darkImage ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.7)',
            lineHeight: '24px',
            padding: 0,
          })}
          <p
            style={{
              margin: 0,
              padding: '10px 12px',
              fontSize: 16,
              fontWeight: 600,
              color: darkImage ? '#fff' : '#172B4D',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}
          >
            {card.cardTitle}
          </p>
        </div>
        <div style={{ padding: 10 }}>
          {labelsRow}
          {statusRow}
          {footerRow}
        </div>
      </>
    );
  };

  const renderFullColorCover = () => (
    <div
      style={{
        position: 'relative',
        minHeight: 56,
        padding: '12px 28px 12px 12px',
        background: coverBackground,
        color: getCoverTextHex(cover),
      }}
    >
      {deleteButton('#44546F', { position: 'absolute', top: 6, right: 6 })}
      <p
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}
      >
        {card.cardTitle}
      </p>
    </div>
  );

  const renderNormal = () => (
    <>
      {cover && coverImageUrl && (
        <img
          src={coverImageUrl}
          alt=""
          draggable={false}
          style={{ display: 'block', width: '100%', maxHeight: 200, objectFit: 'cover' }}
        />
      )}
      {cover && !coverImageUrl && (
        <div style={{ height: 32, background: coverBackground }} />
      )}
      <div style={{ padding: 10 }}>
        {labelsRow}
        {titleRow}
        {statusRow}
        {footerRow}
      </div>
    </>
  );

  const renderContent = () => {
    if (!isFullCover) return renderNormal();
    return coverImageUrl ? renderFullImageCover() : renderFullColorCover();
  };

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
            padding: 0,
            overflow: 'hidden',
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: snapshot.isDragging ? '0 4px 10px rgba(0,0,0,0.12)' : 'none',
            boxSizing: 'border-box',
            maxWidth: '100%',
            flexShrink: 0,
            overflowWrap: 'break-word',
            ...provided.draggableProps.style,
          }}
        >
          {renderContent()}
        </div>
      )}
    </Draggable>
  );
}
