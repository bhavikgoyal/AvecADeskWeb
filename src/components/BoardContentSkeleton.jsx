import { Box, Paper, Skeleton, Stack } from '@mui/material';

function BoardCardSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
        bgcolor: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        position: 'relative',
      }}
    >
      <Skeleton
        variant="circular"
        width={14}
        height={14}
        sx={{ position: 'absolute', top: 10, right: 10 }}
      />
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          px: '4px',
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Skeleton variant="text" width="68%" height={22} />
        <Skeleton variant="rounded" width={32} height={22} sx={{ borderRadius: 999, flexShrink: 0 }} />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          flex: '1 1 0',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: cardCount }).map((_, i) => (
          <BoardCardSkeleton key={i} />
        ))}
      </Box>

      <Skeleton variant="text" width={100} height={18} sx={{ ml: 0.5, flexShrink: 0 }} />
    </Box>
  );
}

/** Kanban skeleton matching Tasks Management board layout */
export default function BoardContentSkeleton({ columns = 5, sx = {} }) {
  const cardsPerColumn = [4, 5, 3, 4, 3, 4];

  return (
    <Box
      className="board-scroll"
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        p: '12px',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <BoardColumnSkeleton key={i} cardCount={cardsPerColumn[i % cardsPerColumn.length]} />
      ))}
    </Box>
  );
}
