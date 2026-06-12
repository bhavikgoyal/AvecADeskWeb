import { Box, CircularProgress } from '@mui/material';

export default function RouteFallback() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'var(--bg)',
      }}
    >
      <CircularProgress size={36} sx={{ color: 'var(--primary)' }} />
    </Box>
  );
}
