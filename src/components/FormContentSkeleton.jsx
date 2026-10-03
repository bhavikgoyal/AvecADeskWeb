import { Box, Paper, Skeleton } from '@mui/material';

/** Form / detail-page skeleton matching outlined fields + action buttons. */
export default function FormContentSkeleton({ rows = 9, sx = {} }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, md: 2 },
        border: '1px solid var(--card-border)',
        borderRadius: 2,
        bgcolor: '#fff',
        ...sx,
      }}
    >
      <Skeleton variant="text" width={160} height={22} sx={{ mb: 1.5 }} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
          gap: 2,
        }}
      >
        {Array.from({ length: rows }).map((_, i) => {
          const isWide = i >= rows - 3;
          return (
            <Box
              key={i}
              sx={isWide ? { gridColumn: { xs: '1', lg: '1 / -1' } } : undefined}
            >
              <Skeleton variant="text" width={110} height={14} sx={{ mb: 0.75 }} />
              <Skeleton variant="rounded" height={isWide ? 88 : 40} />
            </Box>
          );
        })}
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
          mt: 2.5,
          pt: 2,
          borderTop: '1px solid var(--card-border)',
        }}
      >
        <Skeleton variant="rounded" width={110} height={40} />
        <Skeleton variant="rounded" width={130} height={40} />
      </Box>
    </Paper>
  );
}
