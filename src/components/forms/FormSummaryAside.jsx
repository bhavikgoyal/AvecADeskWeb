import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

const statusColor = {
  Active: 'success',
  Pending: 'warning',
  Completed: 'info',
  'On Hold': 'default',
  Overdue: 'error',
  Draft: 'default',
};

export default function FormSummaryAside({ resource, form }) {
  const checks = [
    { label: 'Name provided', done: Boolean(form.name?.trim()) },
    { label: 'Reference code set', done: Boolean(form.code?.trim()) },
    { label: 'Contact email added', done: Boolean(form.email?.trim()) },
    { label: 'Amount configured', done: form.amount !== '' && form.amount != null },
  ];
  const completed = checks.filter((item) => item.done).length;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        p: { xs: 2, md: 2.5 },
        border: '1px solid var(--card-border)',
        bgcolor: 'linear-gradient(180deg, #f8fbff 0%, #fff 100%)',
        background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
        position: { lg: 'sticky' },
        top: { lg: 16 },
      }}
    >
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Preview
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text)', mt: 1 }}>
        {form.name?.trim() || `New ${resource?.singular?.toLowerCase() || 'record'}`}
      </Typography>
      <Typography sx={{ fontSize: '0.82rem', color: 'var(--muted)', mt: 0.5 }}>
        {form.code?.trim() || 'Reference code pending'}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Chip size="small" label={form.status || 'Pending'} color={statusColor[form.status] || 'default'} />
        <Chip size="small" variant="outlined" label={form.priority || 'Medium'} />
      </Stack>

      <Divider sx={{ my: 2, borderColor: 'var(--muted-border)' }} />

      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', mb: 1 }}>
        Completion · {completed}/{checks.length}
      </Typography>
      <Stack spacing={1}>
        {checks.map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {item.done ? (
              <CheckCircleIcon sx={{ fontSize: 18, color: 'var(--success)' }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'var(--muted-light)' }} />
            )}
            <Typography sx={{ fontSize: '0.8rem', color: item.done ? 'var(--text)' : 'var(--muted)' }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ my: 2, borderColor: 'var(--muted-border)' }} />

      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', mb: 0.75 }}>
        Quick tips
      </Typography>
      <Typography sx={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        Use clear reference codes, assign an owner, and add notes so your team can track follow-ups easily.
      </Typography>
    </Paper>
  );
}
