import { Box, Paper, Typography } from '@mui/material';

export default function ChartCard({ title, subtitle, action, children, className = 'dashboard-card', sx = {} }) {
  return (
    <Paper
      elevation={0}
      className={className}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...sx,
      }}
    >
      <Box
        sx={{
          px: { xs: 1.25, md: 1.5 },
          py: 1.25,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          borderBottom: '1px solid var(--card-border)',
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: 'var(--muted)', mt: 0.25, fontSize: '0.8rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      <Box className="chart-body" sx={{ flex: 1, p: { xs: 1, md: 1.25 }, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</Box>
    </Paper>
  );
}
