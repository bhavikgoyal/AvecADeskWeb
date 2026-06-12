import { Box, Divider, Grid, Typography } from '@mui/material';

export function FormGridItem({ children, size = { xs: 12, md: 6, lg: 4 } }) {
  return (
    <Grid size={size} sx={{ width: '100%', minWidth: 0 }}>
      <Box sx={{ width: '100%', minWidth: 0 }}>{children}</Box>
    </Grid>
  );
}

export default function FormSection({ title, description, children, divider = true, fill = false, stretch = false }) {
  return (
    <Box
      sx={{
        mb: divider ? 0 : 0,
        p: { xs: 1.25, md: 1.5 },
        borderRadius: 2.5,
        bgcolor: 'var(--muted-bg)',
        border: '1px solid var(--card-border)',
        width: '100%',
        minWidth: 0,
        ...(fill
          ? {
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
            }
          : {}),
        ...(stretch
          ? {
              '& .MuiGrid-container': { flex: 1, alignContent: 'stretch' },
            }
          : {}),
      }}
    >
      {(title || description) && (
        <Box sx={{ mb: 1.25 }}>
          {title && (
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text)', fontSize: '1rem' }}>
              {title}
            </Typography>
          )}
          {description && (
            <Typography variant="body2" sx={{ color: 'var(--muted)', mt: title ? 0.5 : 0, lineHeight: 1.55 }}>
              {description}
            </Typography>
          )}
        </Box>
      )}
      <Grid container spacing={{ xs: 1.25, sm: 1.25, md: 1.5 }} columns={12} sx={{ width: '100%', m: 0 }}>
        {children}
      </Grid>
      {divider && <Divider sx={{ mt: { xs: 1.5, md: 2 }, borderColor: 'var(--muted-border)' }} />}
    </Box>
  );
}
