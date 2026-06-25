import { Box, Typography } from '@mui/material';
import MembersTable from './MembersTable';

export default function MembersContent() {
  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography
          sx={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--primary)',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Overview
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text)', mt: 0.5 }}>
          Members
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--muted)', mt: 0.5 }}>
          Manage team accounts, roles, and member access.
        </Typography>
      </Box>

      <MembersTable />
    </Box>
  );
}
