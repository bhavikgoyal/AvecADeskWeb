import { Box, Divider, List, ListItemButton, ListItemText, Paper, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';

const defaultItems = [
  { id: 'u1', title: 'Invoice follow-up', subtitle: 'INV-2035 due today', path: '/invoices' },
  { id: 'u2', title: 'Enrolment review', subtitle: '3 students awaiting docs', path: '/status/students' },
  { id: 'u3', title: 'Vendor payout', subtitle: 'Batch scheduled for Friday', path: '/reports/dues' },
];

export default function DashboardUpcomingPanel({ title = 'Upcoming actions', items = defaultItems, fill = false }) {
  const navigate = useNavigate();

  return (
    <Paper
      elevation={0}
      className="dashboard-card"
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%',
        ...(fill ? { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } : {}),
      }}
    >
      <Box sx={{ px: 1.25, py: 1, borderBottom: '1px solid var(--card-border)' }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </Typography>
      </Box>
      <List disablePadding dense sx={fill ? { flex: 1 } : undefined}>
        {items.map((item, index) => (
          <Box key={item.id}>
            <ListItemButton onClick={() => navigate(item.path)} sx={{ py: 0.85, px: 1.25 }}>
              <ListItemText
                primary={<Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text)' }}>{item.title}</Typography>}
                secondary={<Typography sx={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{item.subtitle}</Typography>}
              />
              <ChevronRightIcon sx={{ color: 'var(--muted-light)', fontSize: 18 }} />
            </ListItemButton>
            {index < items.length - 1 && <Divider component="li" />}
          </Box>
        ))}
      </List>
    </Paper>
  );
}
