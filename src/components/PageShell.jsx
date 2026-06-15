import { lazy, Suspense, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Grid, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StatCard from './StatCard';
import ResponsiveTable from './ResponsiveTable';
import { buildSparkline } from '../constants/chartData';

const PageChartsPanel = lazy(() => import('./charts/PageChartsPanel'));

export default function PageShell({
  title,
  subtitle,
  stats = [],
  columns = [],
  rows = [],
  actionLabel = 'Add New',
  searchPlaceholder = 'Search...',
  showCharts = true,
  onAdd,
  onRowClick,
}) {
  const [query, setQuery] = useState('');

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term)),
    );
  }, [rows, query]);

  const enhancedStats = stats.map((stat, index) => ({
    ...stat,
    trend: stat.trend ?? (index % 2 === 0 ? 4 : -1),
    sparklineData:
      stat.sparklineData ?? (stat.donutValue === undefined ? buildSparkline(index + 1) : undefined),
  }));

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: 1, textTransform: 'uppercase' }}>
          Overview
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text)', mt: 0.5 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'var(--muted)', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {enhancedStats.length > 0 && (
        <Grid container spacing={{ xs: 1, md: 1.25 }} sx={{ mb: { xs: 1.25, md: 1.5 }, width: '100%', alignItems: 'flex-start' }}>
          {enhancedStats.map((item) => (
            <Grid key={item.label} size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard {...item} />
            </Grid>
          ))}
        </Grid>
      )}

      {showCharts && (
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ color: 'var(--primary)' }} />
            </Box>
          }
        >
          <PageChartsPanel height={200} />
        </Suspense>
      )}

      <Paper elevation={0} className="dashboard-card" sx={{ borderRadius: 3, overflow: 'hidden', width: '100%' }}>
        <Box sx={{ px: { xs: 1.25, md: 1.5 }, py: 1.25, borderBottom: '1px solid var(--card-border)' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ width: '100%' }}>
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'var(--muted)' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                flex: 1,
                minWidth: { xs: '100%', md: '200px' },
                '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'var(--muted-bg)' },
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={onAdd}
              sx={{
                textTransform: 'none',
                bgcolor: 'var(--primary)',
                '&:hover': { bgcolor: 'var(--primary-dark)' },
                width: { xs: '100%', md: 'auto' },
                height: 40,
                px: 3,
                borderRadius: 2,
                fontWeight: 600,
              }}
            >
              {actionLabel}
            </Button>
          </Stack>
          {rows.length > 0 && (
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--muted)', mt: 1, fontWeight: 600 }}>
              Showing {filteredRows.length} of {rows.length} records
              {query.trim() ? ` matching "${query.trim()}"` : ''}
            </Typography>
          )}
        </Box>

        {columns.length > 0 && rows.length > 0 ? (
          filteredRows.length > 0 ? (
            <ResponsiveTable columns={columns} rows={filteredRows} getRowKey={(row) => row.id} variant="resource" alwaysTable onRowClick={onRowClick} />
          ) : (
            <Box sx={{ px: { xs: 1.25, md: 1.5 }, py: 2.5 }}>
              <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
                No results for &ldquo;{query}&rdquo;. Try a different search.
              </Typography>
            </Box>
          )
        ) : (
          <Box sx={{ px: { xs: 1.25, md: 1.5 }, py: 2.5 }}>
            <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
              No records yet. Use the action above to get started.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
