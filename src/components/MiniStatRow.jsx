import { Box, Grid, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function MiniStatRow({ items = [] }) {
  const navigate = useNavigate();

  if (!items.length) return null;

  return (
    <Grid container spacing={{ xs: 1, md: 1.25 }} sx={{ mb: { xs: 1.25, md: 1.5 } }}>
      {items.map((item) => (
        <Grid key={item.title} size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper
            elevation={0}
            className="dashboard-card"
            onClick={item.path ? () => navigate(item.path) : undefined}
            sx={{
              p: 1.25,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: item.path ? 'pointer' : 'default',
              transition: 'box-shadow 0.2s',
              '&:hover': item.path ? { boxShadow: '0 4px 20px rgba(51, 133, 198, 0.12)' } : undefined,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: item.bg || 'var(--primary-soft)',
                color: item.color || 'var(--primary)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{item.title}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{item.subtitle}</Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
