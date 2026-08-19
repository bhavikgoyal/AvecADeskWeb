import { useEffect, useState, useCallback } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { Box, Paper, Skeleton, Stack } from '@mui/material';
import BoardColumn from '../components/board/BoardColumn';
import AddCardModal from '../components/board/AddCardModal';
import CardDetailModal from '../components/board/CardDetailModal';
import { getBoardCards, getMyBoardCards, moveCard, createCard, deleteCard, getUsers } from '../api/cardApi';
import { useAuth } from '../hooks/useAuth';

function BoardCardSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
        bgcolor: '#fff',
        position: 'relative',
      }}
    >
      <Skeleton variant="circular" width={14} height={14} sx={{ position: 'absolute', top: 10, right: 10 }} />
      <Stack spacing={0.9}>
        <Skeleton variant="text" width="82%" height={18} />
        <Skeleton variant="rounded" width={120} height={22} sx={{ borderRadius: 999 }} />
        <Skeleton variant="text" width="45%" height={14} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.25 }}>
          <Skeleton variant="rounded" width={48} height={20} sx={{ borderRadius: 1 }} />
          <Skeleton variant="circular" width={26} height={26} />
        </Box>
      </Stack>
    </Paper>
  );
}

function BoardColumnSkeleton({ cardCount = 4 }) {
  return (
    <Box
      sx={{
        minWidth: 260,
        maxWidth: 260,
        width: 260,
        flex: '0 0 260px',
        bgcolor: '#f3f4f6',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        p: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        height: '78vh',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', px: '4px', gap: 1 }}>
        <Skeleton variant="text" width="68%" height={22} />
        <Skeleton variant="rounded" width={32} height={22} sx={{ borderRadius: 999, flexShrink: 0 }} />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <BoardCardSkeleton key={i} />
        ))}
      </Box>
      <Skeleton variant="text" width={100} height={18} sx={{ ml: 0.5 }} />
    </Box>
  );
}

function TasksBoardSkeleton() {
  const cardsPerColumn = [4, 5, 3, 4, 3];
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        width: '100%',
        overflowX: 'auto',
        p: '12px',
        boxSizing: 'border-box',
      }}
    >
      {cardsPerColumn.map((count, i) => (
        <BoardColumnSkeleton key={i} cardCount={count} />
      ))}
    </Box>
  );
}

export default function BoardPage() {
  const { user } = useAuth();
  const isAccounting = user?.role === 'Accounting';
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addModalStatusId, setAddModalStatusId] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (isAccounting) return;
    (async () => {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    })();
  }, [isAccounting]);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        searchText,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };
      const data = isAccounting
        ? await getMyBoardCards(filters)
        : await getBoardCards({ ...filters, assignedUserId: selectedUserId });
      setColumns(data);
    } catch (err) {
      setError(err.message || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [isAccounting, searchText, selectedUserId, fromDate, toDate]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const selectedCard = selectedCardId
    ? columns.flatMap((col) => col.cards).find((c) => c.cardID === selectedCardId) || null
    : null;

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    const cardId = parseInt(draggableId, 10);
    const newStatusId = parseInt(destination.droppableId, 10);
    const newPosition = destination.index;

    const prevColumns = columns;
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      const sourceCol = next.find((c) => String(c.cardStatusID) === source.droppableId);
      const destCol = next.find((c) => String(c.cardStatusID) === destination.droppableId);
      const [movedCard] = sourceCol.cards.splice(source.index, 1);
      destCol.cards.splice(destination.index, 0, movedCard);
      sourceCol.count = sourceCol.cards.length;
      destCol.count = destCol.cards.length;
      return next;
    });

    try {
      await moveCard({ cardId, newCardStatusID: newStatusId, newPosition });
    } catch (err) {
      setColumns(prevColumns);
      setError(err.message || 'Could not move card. Please try again.');
    }
  };

  const handleAddCard = async (statusId, title) => {
    try {
      await createCard({ cardTitle: title, cardStatusID: statusId });
      setAddModalStatusId(null);
      loadBoard();
    } catch (err) {
      setError(err.message || 'Could not create card.');
    }
  };

  const handleDeleteCard = async (cardId) => {
    try {
      await deleteCard(cardId);
      loadBoard();
    } catch (err) {
      setError(err.message || 'Could not delete card.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Tasks</h1>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {!isAccounting && (
            <select
              value={selectedUserId ?? ''}
              onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value, 10) : null)}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            placeholder="Search task"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 180, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />

          <button
            onClick={loadBoard}
            disabled={loading}
            style={{
              padding: '6px 14px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              opacity: loading ? 0.7 : 1,
            }}
          >
            ⟳ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <TasksBoardSkeleton />
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div
            className="board-scroll"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              width: '100%',
              overflowX: 'auto',
              overflowY: 'hidden',
              padding: '12px',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
            }}
          >
            {columns.map((col, columnIndex) => (
  <BoardColumn
    key={col.cardStatusID}
    column={col}
    columnIndex={columnIndex}  
    onAddCard={() => setAddModalStatusId(col.cardStatusID)}
    onDeleteCard={handleDeleteCard}
    onCardClick={(card) => setSelectedCardId(card.cardID)}
  />
))}
          </div>
        </DragDropContext>
      )}

      {addModalStatusId !== null && (
        <AddCardModal
          onSubmit={(title) => handleAddCard(addModalStatusId, title)}
          onClose={() => setAddModalStatusId(null)}
        />
      )}

      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCardId(null)}
          onUpdated={loadBoard}
        />
      )}
    </div>
  );
}
