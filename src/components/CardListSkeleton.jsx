import { Box, Skeleton } from '@mui/material';

/** Collapsible list-row skeleton used by receivables-style grouped cards. */
export default function CardListSkeleton({ rows = 6, sx = {} }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ...sx }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1.75,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Skeleton variant="circular" width={22} height={22} />
          <Skeleton variant="text" width={`${36 + (i % 3) * 14}%`} height={20} />
          <Skeleton variant="rounded" width={78} height={22} sx={{ borderRadius: 999, ml: 'auto' }} />
          <Skeleton variant="text" width={72} height={20} />
        </Box>
      ))}
    </Box>
  );
}
