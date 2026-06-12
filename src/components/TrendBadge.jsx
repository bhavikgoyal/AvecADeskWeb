import { Box, Typography } from '@mui/material';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function TrendBadge({ value, label }) {
  if (value === undefined || value === null) return null;

  const isPositive = value >= 0;
  const color = isPositive ? 'var(--success)' : 'var(--danger)';
  const bg = isPositive ? 'rgba(47, 179, 68, 0.1)' : 'rgba(214, 57, 57, 0.1)';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.3,
        px: 0.75,
        py: 0.25,
        borderRadius: 1.5,
        bgcolor: bg,
      }}
    >
      {isPositive ? (
        <TrendingUpIcon sx={{ fontSize: 14, color }} />
      ) : (
        <TrendingDownIcon sx={{ fontSize: 14, color }} />
      )}
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color }}>
        {isPositive ? '+' : ''}
        {value}%
      </Typography>
      {label && (
        <Typography sx={{ fontSize: '0.72rem', color: 'var(--muted)', ml: 0.25 }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}
