import { Box, Chip, Stack, Typography } from '@mui/material';
import { FORM_PAGE_MAX_WIDTH } from './formStyles';

export default function FormPageLayout({ title, subtitle, metaItems = [], children, maxWidth = FORM_PAGE_MAX_WIDTH }) {
  return (
    <Box className="form-page" sx={{ width: '100%', maxWidth, mx: 'auto', pb: 2 }}>
      <Box sx={{ mb: 1.5, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: 1, textTransform: 'uppercase' }}>
          Form
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text)', mt: 0.5, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'var(--muted)', mt: 0.5, lineHeight: 1.5, fontSize: '0.82rem' }}>
            {subtitle}
          </Typography>
        )}
        {metaItems.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1 }}>
            {metaItems.map((item) => (
              <Chip
                key={item.label}
                size="small"
                label={`${item.label}: ${item.value}`}
                sx={{
                  height: 24,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  bgcolor: 'var(--muted-bg)',
                  border: '1px solid var(--card-border)',
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            ))}
          </Stack>
        )}
      </Box>
      {children}
    </Box>
  );
}
