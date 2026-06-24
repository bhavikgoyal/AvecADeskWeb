import { useEffect, useState, useCallback } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import BoardColumn from '../components/board/BoardColumn';
import AddCardModal from '../components/board/AddCardModal';
import CardDetailModal from '../components/board/CardDetailModal';
import { getBoardCards, moveCard, createCard, deleteCard, getUsers } from '../api/cardApi';

export default function BoardPage() {
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addModalStatusId, setAddModalStatusId] = useState(null);
const [selectedCard, setSelectedCard] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [fromDate, setFromDate] = useState('');  
  const [toDate, setToDate] = useState('');     


  const [users, setUsers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    })();
  }, []);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBoardCards({
        searchText,
        assignedUserId: selectedUserId,
        fromDate: fromDate || undefined,  
        toDate: toDate || undefined,      
      });
      setColumns(data);
    } catch (err) {
      setError(err.message || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [searchText, selectedUserId, fromDate, toDate]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getBoardCards({
          searchText,
          assignedUserId: selectedUserId,
          fromDate: fromDate || undefined, 
          toDate: toDate || undefined,      
        });
        if (isMounted) setColumns(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load board');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [searchText, selectedUserId, fromDate, toDate]);  

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
    console.log('Creating card with statusId:', statusId); 
    try {
        await createCard({
            cardTitle: title,
            cardStatusID: statusId,
        });
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Tasks </h1>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* ✅ Users Dropdown */}
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

          {/* Search */}
          <input
            type="text"
            placeholder="Search task"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 180, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />

          {/* ✅ From Date */}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />

          {/* ✅ To Date */}
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }}
          />

          {/* ✅ Refresh Button */}
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
            {loading ? '...' : '⟳ Refresh'}
          </button>

        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading board...</p>
      ) : (
       <DragDropContext onDragEnd={handleDragEnd}>
  <div style={{
    display: 'flex',
    gap: 12,
    marginLeft: -12,
    marginRight: -12,
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 16,
    alignItems: 'flex-start',


  }}>
    {columns.map((col) => (
      <BoardColumn
        key={col.cardStatusID}
        column={col}
        onAddCard={() => setAddModalStatusId(col.cardStatusID)}
        onDeleteCard={handleDeleteCard}
        onCardClick={(card) => setSelectedCard(card)}
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
    onClose={() => setSelectedCard(null)}
    onUpdated={loadBoard}
  />
)}
    </div>
  );
}