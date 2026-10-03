import { Box, CircularProgress } from '@mui/material';
import { useLocation } from 'react-router-dom';
import BoardContentSkeleton from './BoardContentSkeleton';

export default function RouteFallback() {
  const location = useLocation();
  const isTasks = location.pathname.includes('/tasks');

  if (isTasks) {
    return (
      <Box sx={{ p: { xs: 1.25, sm: 1.5, md: 2 }, bgcolor: 'var(--bg)', minHeight: '100%' }}>
        <BoardContentSkeleton columns={5} />
      </Box>
    );
  }

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
