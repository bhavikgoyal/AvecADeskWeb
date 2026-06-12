import { Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DonutProgress } from '../charts/AnimatedCharts';

const tasks = [
  { label: 'Invoice follow-ups', value: 72 },
  { label: 'Enrolment reviews', value: 58 },
  { label: 'Vendor onboarding', value: 41 },
];

const quickLinks = [
  { label: 'View tasks', path: '/tasks' },
  { label: 'Open invoices', path: '/invoices' },
  { label: 'Student payments', path: '/students' },
];

export default function QuickInsightsPanel() {
  const navigate = useNavigate();

  return (
    <Paper elevation={0} className="dashboard-card" sx={{ p: 1.25, borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
        Quick insights
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
        <DonutProgress value={78} size={72} />
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)' }}>Platform health</Typography>
          <Typography variant="body2" sx={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
            78% of workflows on track this week
          </Typography>
        </Box>
      </Box>
      <Stack spacing={1} sx={{ mb: 1.25 }}>
        {tasks.map((task) => (
          <Box key={task.label}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 600 }}>{task.label}</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{task.value}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={task.value}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'var(--primary-soft)',
                '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: 'var(--primary)' },
              }}
            />
          </Box>
        ))}
      </Stack>
      <Stack spacing={1} sx={{ mt: 'auto' }}>
        {quickLinks.map((link) => (
          <Button
            key={link.path}
            variant="outlined"
            size="small"
            onClick={() => navigate(link.path)}
            sx={{ textTransform: 'none', borderRadius: 2, borderColor: 'var(--card-border)', color: 'var(--text)', justifyContent: 'flex-start' }}
          >
            {link.label}
          </Button>
        ))}
      </Stack>
    </Paper>
  );
}
