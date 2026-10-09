import { useEffect, useState } from 'react';
import { getBoards, getCardsByBoardId, getListsByBoardId } from '../../api/cardApi';
import { SUBTLE_TEXT, TEXT, primaryButtonStyle } from './cardModalStyles';
import { PopoverHeader } from './cardModalUi';

const fieldLabelStyle = {
  display: 'block',
  marginBottom: 4,
  fontSize: 12,
  fontWeight: 700,
  color: SUBTLE_TEXT,
};

const selectStyle = {
  width: '100%',
  height: 40,
  padding: '0 8px',
  border: '1px solid #8590A2',
  borderRadius: 4,
  background: '#fff',
  color: TEXT,
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  cursor: 'pointer',
};

function groupCardIdsByList(cards) {
  const map = {};
  (cards || []).forEach((c) => {
    const key = String(c.listID ?? c.listId ?? '');
    if (!map[key]) map[key] = [];
    map[key].push(Number(c.cardID ?? c.cardId));
  });
  return map;
}

export default function MoveCardPopover({ cardId, currentBoardId, currentListId, onMove, onClose }) {
  const [boards, setBoards] = useState([]);
  const [boardId, setBoardId] = useState(currentBoardId != null ? String(currentBoardId) : '');
  const [lists, setLists] = useState([]);
  const [cardsByList, setCardsByList] = useState({});
  const [loadedBoardId, setLoadedBoardId] = useState(null);
  const [listId, setListId] = useState(currentListId != null ? String(currentListId) : '');
  const [position, setPosition] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isCurrentList = (id) => String(id) === String(currentListId);
  const defaultPositionFor = (id, map) => {
    if (!isCurrentList(id)) return 0;
    const index = (map[String(id)] || []).indexOf(Number(cardId));
    return index >= 0 ? index : 0;
  };

  useEffect(() => {
    let mounted = true;
    getBoards()
      .then((data) => mounted && setBoards(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load boards', err));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!boardId) return;
    let mounted = true;
    Promise.all([getListsByBoardId(boardId), getCardsByBoardId(boardId)])
      .then(([listData, cardData]) => {
        if (!mounted) return;
        const nextLists = Array.isArray(listData) ? listData : [];
        const map = groupCardIdsByList(cardData);
        const keepCurrent = nextLists.some((l) => isCurrentList(l.listID));
        const nextListId = keepCurrent
          ? String(currentListId)
          : nextLists[0]
            ? String(nextLists[0].listID)
            : '';
        setLists(nextLists);
        setCardsByList(map);
        setListId(nextListId);
        setPosition(defaultPositionFor(nextListId, map));
        setError('');
        setLoadedBoardId(boardId);
      })
      .catch((err) => {
        console.error('Failed to load lists', err);
        if (mounted) {
          setError('Lists could not be loaded.');
          setLoadedBoardId(boardId);
        }
      });
    return () => {
      mounted = false;
    };
  }, [boardId]);

  const loading = !!boardId && loadedBoardId !== boardId;
  const cardsInList = cardsByList[String(listId)] || [];
  const positionCount = isCurrentList(listId) ? Math.max(cardsInList.length, 1) : cardsInList.length + 1;
  const unchanged = isCurrentList(listId) && position === defaultPositionFor(listId, cardsByList);
  const canMove = !loading && !saving && !!listId && !unchanged;

  const handleListChange = (e) => {
    const nextId = e.target.value;
    setListId(nextId);
    setPosition(defaultPositionFor(nextId, cardsByList));
  };

  const handleMove = async () => {
    if (!canMove) return;
    setSaving(true);
    const target = lists.find((l) => String(l.listID) === String(listId));
    const ok = await onMove(Number(listId), position, target?.listName || '');
    if (!ok) setSaving(false);
  };

  return (
    <div>
      <PopoverHeader title="Move card" onClose={onClose} />

      <div style={{ fontSize: 12, fontWeight: 700, color: SUBTLE_TEXT, margin: '4px 0 12px' }}>
        Select destination
      </div>

      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={fieldLabelStyle}>Board</span>
        <select value={boardId} onChange={(e) => setBoardId(e.target.value)} style={selectStyle}>
          {!boards.some((b) => String(b.boardID) === boardId) && boardId && (
            <option value={boardId}>Current board</option>
          )}
          {boards.map((b) => (
            <option key={b.boardID} value={String(b.boardID)}>
              {b.boardName}
              {String(b.boardID) === String(currentBoardId) ? ' (current)' : ''}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <label style={{ flex: 1, minWidth: 0 }}>
          <span style={fieldLabelStyle}>List</span>
          <select
            value={listId}
            onChange={handleListChange}
            disabled={loading || lists.length === 0}
            style={{ ...selectStyle, opacity: loading ? 0.6 : 1 }}
          >
            {loading && <option value={listId}>Loading...</option>}
            {!loading && lists.length === 0 && <option value="">No lists</option>}
            {!loading &&
              lists.map((l) => (
                <option key={l.listID} value={String(l.listID)}>
                  {l.listName}
                  {isCurrentList(l.listID) ? ' (current)' : ''}
                </option>
              ))}
          </select>
        </label>

        <label style={{ width: 96, flexShrink: 0 }}>
          <span style={fieldLabelStyle}>Position</span>
          <select
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            disabled={loading || !listId}
            style={{ ...selectStyle, opacity: loading ? 0.6 : 1 }}
          >
            {Array.from({ length: positionCount }, (_, i) => (
              <option key={i} value={i}>
                {i + 1}
                {isCurrentList(listId) && i === defaultPositionFor(listId, cardsByList) ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div style={{ marginBottom: 12, fontSize: 12, color: '#AE2E24' }}>{error}</div>}

      <button
        type="button"
        onClick={handleMove}
        disabled={!canMove}
        style={{
          ...primaryButtonStyle,
          width: '100%',
          opacity: canMove ? 1 : 0.5,
          cursor: canMove ? 'pointer' : 'not-allowed',
        }}
      >
        {saving ? 'Moving...' : 'Move'}
      </button>
    </div>
  );
}
