import { Box, Skeleton } from '@mui/material';

/**
 * Table-shaped skeleton aligned to column widths.
 * @param {{ label?: string, width?: string|number, flex?: number }[]} columns
 */
export default function TableContentSkeleton({
  columns = [],
  rows = 8,
  showHeader = true,
  sx = {},
}) {
  const cols =
    columns.length > 0
      ? columns
      : Array.from({ length: 5 }, (_, i) => ({
          label: '',
          flex: i === 0 ? 1.4 : 1,
        }));

  return (
    <Box sx={{ width: '100%', overflowX: 'auto', ...sx }}>
      <Box sx={{ minWidth: Math.max(640, cols.length * 110) }}>
        {showHeader && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: cols.map((c) => c.width || `${c.flex || 1}fr`).join(' '),
              gap: 1.5,
              px: { xs: 1.25, md: 1.5 },
              py: 1.1,
              bgcolor: 'rgba(101, 119, 146, 0.06)',
              borderBottom: '1px solid var(--card-border)',
              alignItems: 'center',
            }}
          >
            {cols.map((col, i) =>
              col.label ? (
                <Box
                  key={col.id || i}
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {col.label}
                </Box>
              ) : (
                <Skeleton key={col.id || i} variant="text" width="55%" height={16} />
              ),
            )}
          </Box>
        )}

        {Array.from({ length: rows }).map((_, rowIndex) => (
          <Box
            key={rowIndex}
            sx={{
              display: 'grid',
              gridTemplateColumns: cols.map((c) => c.width || `${c.flex || 1}fr`).join(' '),
              gap: 1.5,
              px: { xs: 1.25, md: 1.5 },
              py: 1.15,
              borderBottom: '1px solid var(--card-border)',
              alignItems: 'center',
            }}
          >
            {cols.map((col, colIndex) => (
              <Skeleton
                key={`${rowIndex}-${col.id || colIndex}`}
                variant="rounded"
                height={col.skeletonHeight || 14}
                width={col.skeletonWidth || `${70 + ((rowIndex + colIndex) % 3) * 10}%`}
                sx={{ borderRadius: col.round ? 999 : 1, maxWidth: '100%' }}
              />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
