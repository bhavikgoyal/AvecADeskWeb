import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { DragDropContext } from "@hello-pangea/dnd";
import {
  Box,
  Button,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import BoardColumn from "../components/board/BoardColumn";
import AddCardModal from "../components/board/AddCardModal";
import CardDetailModal from "../components/board/CardDetailModal";
import {
  getBoardCards,
  getMyBoardCards,
  getCardStatuses,
  createCardStatus,
  moveCardToList,
  createCard,
  createBoard,
  getBoards,
  updateBoard,
  getListsByBoardId,
  getCardsByBoardId,
  createList,
  deleteCard,
  getUsers,
} from "../api/cardApi";
import { useAuth } from "../hooks/useAuth";
import {
  listContainedButtonSx,
  listSearchFieldSx,
  listSelectFieldSx,
  listSelectProps,
  LIST_FILTER_ALL,
} from "../components/forms";
import AddListComposer from "../components/board/AddListComposer";

function BoardCardSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        borderRadius: "10px",
        border: "1px solid #e5e7eb",
        bgcolor: "#fff",
        position: "relative",
      }}
    >
      <Skeleton
        variant="circular"
        width={14}
        height={14}
        sx={{ position: "absolute", top: 10, right: 10 }}
      />
      <Stack spacing={0.9}>
        <Skeleton variant="text" width="82%" height={18} />
        <Skeleton
          variant="rounded"
          width={120}
          height={22}
          sx={{ borderRadius: 999 }}
        />
        <Skeleton variant="text" width="45%" height={14} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pt: 0.25,
          }}
        >
          <Skeleton
            variant="rounded"
            width={48}
            height={20}
            sx={{ borderRadius: 1 }}
          />
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
        flex: "0 0 260px",
        bgcolor: "#f3f4f6",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        p: "10px",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        height: "78vh",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          px: "4px",
          gap: 1,
        }}
      >
        <Skeleton variant="text" width="68%" height={22} />
        <Skeleton
          variant="rounded"
          width={32}
          height={22}
          sx={{ borderRadius: 999, flexShrink: 0 }}
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
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
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        width: "100%",
        overflowX: "auto",
        p: "12px",
        boxSizing: "border-box",
      }}
    >
      {cardsPerColumn.map((count, i) => (
        <BoardColumnSkeleton key={i} cardCount={count} />
      ))}
    </Box>
  );
}

function BoardSearch({ onBoardSelect }) {
  const [search, setSearch] = useState("");
  const [boards, setBoards] = useState([]);
  const [open, setOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const loadBoards = async () => {
    try {
      const data = await getBoards();
      setBoards(data || []);
      setOpen(true);
    } catch (err) {
      console.error("Failed to load boards:", err);
    }
  };

  const filteredBoards = boards.filter((board) =>
    String(board.boardName || "")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  return (
    <Box
      ref={searchRef}
      sx={{
        position: "relative",
        flex: "1 1 0",
        minWidth: 0,
        "@container (min-width: 1320px)": {
          flex: "0 0 350px",
        },
      }}
    >
      <TextField
        size="small"
        fullWidth
        placeholder="Search board"
        value={search}
        onFocus={loadBoards}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        sx={{
          ...listSearchFieldSx,
          width: "100%",
          maxWidth: "none",
          "& .MuiInputBase-root": {
            height: 40,
          },
        }}
      />

      {open && (
        <Box
          sx={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "100%",
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
            zIndex: 1500,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {filteredBoards.length > 0 ? (
            filteredBoards.map((board) => (
              <Box
                key={board.boardID}
                onClick={() => {
                  onBoardSelect({
                    boardID: board.boardID,
                    boardName: board.boardName,
                  });
                  setSearch("");
                  setOpen(false);
                }}
                sx={{
                  px: 1.5,
                  py: 1,
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#374151",
                  "&:hover": {
                    backgroundColor: "#f3f4f6",
                  },
                }}
              >
                {board.boardName}
              </Box>
            ))
          ) : (
            <Box
              sx={{
                px: 1.5,
                py: 1.2,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              No boards found
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function CreateBoardButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const createRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (createRef.current && !createRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleCreateBoard = async () => {
    const boardName = title.trim();

    if (!boardName) return;

    try {
      await createBoard(boardName);

      toast.success("Board created successfully", {
        hideProgressBar: true,
      });

      setTitle("");
      setOpen(false);
    } catch (err) {
      console.error("Failed to create board:", err);
    }
  };

  return (
    <Box
      ref={createRef}
      sx={{
        position: "relative",
        display: "inline-flex",
        flexShrink: 0,
      }}
    >
      <Button
        variant="contained"
        size="small"
        onClick={() => {
          setTitle("");
          setOpen((prev) => !prev);
        }}
        sx={{
          ...listContainedButtonSx,
          height: 40,
          minWidth: 90,
          borderRadius: "8px",
          textTransform: "none",
          fontWeight: 600,
          boxShadow: "none",
        }}
      >
        Create
      </Button>

      {open && (
        <Box
          sx={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 300,
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
            p: 1.5,
            zIndex: 1500,
          }}
        >
          <Box
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: "#374151",
              mb: 0.8,
            }}
          >
            Board title <span style={{ color: "#ef4444" }}>*</span>
          </Box>

          <TextField
            fullWidth
            size="small"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Board title"
            sx={{
              "& .MuiOutlinedInput-root": {
                height: 38,
                borderRadius: "7px",
              },
            }}
          />

          {!title.trim() && (
            <Box
              sx={{
                mt: 0.7,
                fontSize: 12,
                color: "#4b5563",
              }}
            >
              👋 Board title is required
            </Box>
          )}

          <Button
            fullWidth
            variant="contained"
            onClick={handleCreateBoard}
            disabled={!title.trim()}
            sx={{
              mt: 1.2,
              height: 34,
              borderRadius: "7px",
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "none",
              backgroundColor: "#1976d2",
              "&:hover": {
                backgroundColor: "#1565c0",
                boxShadow: "none",
              },
              "&.Mui-disabled": {
                backgroundColor: "#d1d5db",
                color: "#9ca3af",
              },
            }}
          >
            Create Board
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default function BoardPage() {
  const { user } = useAuth();
  const isAccounting = user?.role === "Accounting";
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addModalStatusId, setAddModalStatusId] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);

  const [searchText, setSearchText] = useState("");

  const [boardSearchText, setBoardSearchText] = useState("");
  const [selectedBoardName, setSelectedBoardName] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState(null);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [users, setUsers] = useState([]);
  const [boardInitializing, setBoardInitializing] = useState(true);

  const [isEditingBoardName, setIsEditingBoardName] = useState(false);
  const [boardNameDraft, setBoardNameDraft] = useState("");
  const boardTitleRef = useRef(null);

  useEffect(() => {
    const loadDefaultBoard = async () => {
      try {
        const data = await getBoards();

        if (data && data.length > 0) {
          const savedBoardId = localStorage.getItem("selectedBoardId");

          const savedBoard = savedBoardId
            ? data.find(
                (board) => Number(board.boardID) === Number(savedBoardId),
              )
            : null;

          const boardToOpen = savedBoard || data[0];

          setSelectedBoardId(boardToOpen.boardID);
          setSelectedBoardName(boardToOpen.boardName);

          localStorage.setItem("selectedBoardId", String(boardToOpen.boardID));
        }
      } catch (err) {
        console.error("Failed to load default board:", err);
      } finally {
        setBoardInitializing(false);
      }
    };

    loadDefaultBoard();
  }, []);

  useEffect(() => {
    if (isAccounting) return;
    (async () => {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    })();
  }, [isAccounting]);

  const handleBoardNameSave = useCallback(async () => {
    const newBoardName = boardNameDraft.trim();

    if (!selectedBoardId) return;

    if (!newBoardName) {
      setBoardNameDraft(selectedBoardName);
      setIsEditingBoardName(false);
      return;
    }

    if (newBoardName === selectedBoardName.trim()) {
      setIsEditingBoardName(false);
      return;
    }

    try {
      await updateBoard(selectedBoardId, newBoardName);

      setSelectedBoardName(newBoardName);
      setBoardNameDraft(newBoardName);
      setIsEditingBoardName(false);

      toast.success("Board name updated successfully", {
        hideProgressBar: true,
      });
    } catch (err) {
      console.error("Failed to update board name:", err);

      setBoardNameDraft(selectedBoardName);
      setIsEditingBoardName(false);

      toast.error("Failed to update board name", {
        hideProgressBar: true,
      });
    }
  }, [boardNameDraft, selectedBoardId, selectedBoardName]);

  useEffect(() => {
    if (!isEditingBoardName) return;

    const handleOutsideClick = (event) => {
      if (
        boardTitleRef.current &&
        !boardTitleRef.current.contains(event.target)
      ) {
        handleBoardNameSave();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isEditingBoardName, handleBoardNameSave]);

  const loadBoard = useCallback(async () => {
    if (!selectedBoardId) {
      setColumns([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters = {
        searchText,
        assignedUserId: selectedUserId,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };

      const [lists, cards] = await Promise.all([
        getListsByBoardId(selectedBoardId),
        getCardsByBoardId(selectedBoardId, filters),
      ]);

      const boardColumns = (lists || []).map((list) => {
        const listCards = (cards || []).filter(
          (card) => Number(card.listID) === Number(list.listID),
        );

        return {
          cardStatusID: list.listID,
          statusName: list.listName,
          count: listCards.length,
          cards: listCards,
        };
      });

      setColumns(boardColumns);
    } catch (err) {
      setError(err.message || "Failed to load board");
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBoardId, searchText, selectedUserId, fromDate, toDate]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const selectedCard = selectedCardId
    ? columns
        .flatMap((col) => col.cards)
        .find((c) => c.cardID === selectedCardId) || null
    : null;
  const selectedCardListName = selectedCard
    ? columns.find((col) =>
        col.cards.some((c) => c.cardID === selectedCard.cardID),
      )?.statusName || ""
    : "";

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const cardId = parseInt(draggableId, 10);
    const newListId = parseInt(destination.droppableId, 10);
    const newPosition = destination.index;

    const prevColumns = columns;
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }));
      const sourceCol = next.find(
        (c) => String(c.cardStatusID) === source.droppableId,
      );
      const destCol = next.find(
        (c) => String(c.cardStatusID) === destination.droppableId,
      );
      const [movedCard] = sourceCol.cards.splice(source.index, 1);
      destCol.cards.splice(destination.index, 0, movedCard);
      sourceCol.count = sourceCol.cards.length;
      destCol.count = destCol.cards.length;
      return next;
    });

    try {
      await moveCardToList({
        cardID: cardId,
        listID: newListId,
        position: newPosition,
      });
    } catch (err) {
      setColumns(prevColumns);
      setError(err.message || "Could not move card. Please try again.");
    }
  };

  const handleAddCard = async (listId, title) => {
    if (!selectedBoardId) return;

    try {
      await createCard({
        boardID: selectedBoardId,
        listID: listId,
        cardTitle: title,
        assignedUserID: isAccounting ? Number(user?.id) : undefined,
      });

      setAddModalStatusId(null);
      loadBoard();
    } catch (err) {
      setError(err.message || "Could not create card.");
    }
  };

  const handleAddList = async (listName) => {
    if (!selectedBoardId) return;

    try {
      const list = await createList({
        boardID: selectedBoardId,
        listName,
      });

      setColumns((prev) => [
        ...prev,
        {
          cardStatusID: list.listID,
          statusName: list.listName,
          count: 0,
          cards: [],
        },
      ]);
    } catch (err) {
      setError(err.message || "Could not create list.");
    }
  };

  const handleDeleteCard = async (cardId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this card?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCard(cardId);
      loadBoard();
    } catch (err) {
      setError(err.message || "Could not delete card.");
    }
  };

  const filteredColumns = columns.filter((col) =>
    String(col.statusName || "")
      .toLowerCase()
      .includes(boardSearchText.trim().toLowerCase()),
  );

  return (
    <div
      style={{
        backgroundColor: "#e3f0f8",
        border: "1px solid #d7e7f1",
        borderRadius: "14px",
        padding: "10px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* ================= HEADER ================= */}
      <Box
        sx={{
          containerType: "inline-size",
          backgroundColor: "#bfd8e9",
          margin: "-10px -10px 10px",
          padding: "10px 12px",
          borderRadius: "13px 13px 0 0",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 1.25,
            "@container (min-width: 860px)": {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            },
          }}
        >
          {/* ---------- Board Title ---------- */}
          <Box
            ref={boardTitleRef}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              flex: "0 1 auto",
              minWidth: 0,
            }}
          >
            {isEditingBoardName ? (
              <TextField
                autoFocus
                size="small"
                value={boardNameDraft}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setBoardNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleBoardNameSave();
                  }
                }}
                sx={{
                  width: 260,
                  maxWidth: "100%",
                  "& .MuiInputBase-root": {
                    height: 40,
                  },
                }}
              />
            ) : (
              <Box
                component="h2"
                onClick={
                  selectedBoardName
                    ? () => {
                        setBoardNameDraft(selectedBoardName);
                        setIsEditingBoardName(true);
                      }
                    : undefined
                }
                sx={{
                  fontSize: { xs: 18, md: 20 },
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  margin: 0,
                  padding: "6px 10px",
                  borderRadius: "6px",
                  cursor: selectedBoardName ? "pointer" : "default",
                  "&:hover": selectedBoardName
                    ? {
                        backgroundColor: "#dcebf5",
                      }
                    : {},
                }}
              >
                {boardInitializing ? "" : selectedBoardName || "Select Board"}
              </Box>
            )}
          </Box>

          {/* ---------- Controls ---------- */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              width: "100%",
              minWidth: 0,
              "@container (min-width: 860px)": {
                flex: "1 1 auto",
                width: "auto",
                maxWidth: 820,
                marginLeft: "auto",
              },
              "@container (min-width: 1320px)": {
                flexDirection: "row",
                alignItems: "center",
                flex: "0 0 auto",
                maxWidth: "none",
              },
            }}
          >
            {/* ROW 1: Search board + Create */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                minWidth: 0,
              }}
            >
              <BoardSearch
                onBoardSelect={({ boardID, boardName }) => {
                  setIsEditingBoardName(false);
                  setSelectedBoardId(boardID);
                  setSelectedBoardName(boardName);

                  localStorage.setItem("selectedBoardId", String(boardID));
                }}
              />
              <CreateBoardButton />
            </Box>

            {/* ROW 2: Search task + From + To + Refresh */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
                minWidth: 0,
                "@container (min-width: 1320px)": {
                  flexWrap: "nowrap",
                },
              }}
            >
              {/* Task Search */}
              <TextField
                size="small"
                placeholder="Search task"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{
                  ...listSearchFieldSx,
                  flex: "1 1 160px",
                  minWidth: 140,
                  maxWidth: "none",
                  "@container (min-width: 1320px)": {
                    flex: "0 0 190px",
                  },
                  "& .MuiInputBase-root": {
                    height: 40,
                  },
                }}
              />

              {/* From Date */}
              <TextField
                type="date"
                size="small"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                sx={{
                  ...listSearchFieldSx,
                  flex: "0 0 170px",
                  width: 170,
                  minWidth: 170,
                  maxWidth: 170,
                  "& .MuiInputBase-root": {
                    height: 40,
                  },
                }}
              />

              {/* To Date */}
              <TextField
                type="date"
                size="small"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                sx={{
                  ...listSearchFieldSx,
                  flex: "0 0 170px",
                  width: 170,
                  minWidth: 170,
                  maxWidth: 170,
                  "& .MuiInputBase-root": {
                    height: 40,
                  },
                }}
              />

              {/* Refresh */}
              <Button
                variant="contained"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={loadBoard}
                disabled={loading}
                sx={{
                  ...listContainedButtonSx,
                  height: 40,
                  minWidth: 100,
                  flex: "0 0 auto",
                }}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            color: "#b91c1c",
            padding: "8px 12px",
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {boardInitializing ? null : !selectedBoardName ? (
        <Box
          sx={{
            minHeight: "calc(100vh - 180px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 600,
            color: "#6b7280",
          }}
        >
          Choose a Board
        </Box>
      ) : loading ? (
        <TasksBoardSkeleton />
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div
            className="board-scroll"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              width: "100%",
              overflowX: "auto",
              overflowY: "hidden",
              padding: "12px 0 12px 0",
              minHeight: "81vh",
              boxSizing: "border-box",
              whiteSpace: "nowrap",
            }}
          >
            {filteredColumns.map((col, columnIndex) => (
              <BoardColumn
                key={col.cardStatusID}
                column={col}
                columnIndex={columnIndex}
                onAddCard={() => setAddModalStatusId(col.cardStatusID)}
                onDeleteCard={handleDeleteCard}
                onCardClick={(card) => setSelectedCardId(card.cardID)}
              />
            ))}

            <AddListComposer onAdd={handleAddList} />
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
          listName={selectedCardListName}
          boardId={selectedBoardId}
          onClose={() => setSelectedCardId(null)}
          onUpdated={loadBoard}
        />
      )}
    </div>
  );
}
