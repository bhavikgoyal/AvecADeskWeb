import { lazy, Suspense, useMemo, useState ,useEffect} from 'react';
import { Box, Button, CircularProgress, Grid, IconButton, Paper, TextField, TablePagination, Typography } from '@mui/material';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import StatCard from './StatCard';
import ResponsiveTable from './ResponsiveTable';
import TableContentSkeleton from './TableContentSkeleton';
import { buildSparkline } from '../constants/chartData';
import { listContainedButtonSx, listSearchFieldSx, listToolbarActionsSx, listToolbarRowSx, listToolbarSearchGroupSx } from './forms';


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
  headerExtra = null,
   headerActionsAfterAdd = null,
  loading = false,
  onAdd,
  onRowClick,
  onDelete,
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const searchableFields = useMemo(() => {
    const fields = columns
      .map((column) => column.field || column.id)
      .filter((field) => typeof field === 'string' && !field.startsWith('__'));

    return fields.length > 0 ? fields : null;
  }, [columns]);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const values = searchableFields
        ? searchableFields.map((field) => row?.[field])
        : Object.values(row);

      return values.some((value) => String(value ?? '').toLowerCase().includes(term));
    });
  }, [rows, query, searchableFields]);

  
const paginatedRows = useMemo(() => {
  return filteredRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
}, [filteredRows, page, rowsPerPage]);

useEffect(() => {
  setPage(0);
}, [query]);

  const enhancedStats = stats.map((stat, index) => ({
    ...stat,
    trend: stat.trend ?? (index % 2 === 0 ? 4 : -1),
    sparklineData:
      stat.sparklineData ?? (stat.donutValue === undefined ? buildSparkline(index + 1) : undefined),
  }));

  const tableColumns = useMemo(() => {
    if (!onDelete) return columns;
    return [
      ...columns,
      {
        id: '__delete__',
        label: 'Action',
        align: 'left',
        headerSx: { width: 70, px: 1 },
        cellSx: { px: 1},
        render: (row) => (
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onDelete(row); }}
            sx={{
              color: 'var(--danger)',
              opacity: 0.55,
              '&:hover': { opacity: 1, bgcolor: 'rgba(214, 57, 57, 0.08)' },
            }}
          >
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        ),
      },
    ];
  }, [columns, onDelete]);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ mb: 1.5 }}>
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

      <Paper elevation={0} className="dashboard-card" sx={{ borderRadius: 2, overflow: 'hidden', width: '100%' }}>
        <Box sx={{ px: 2, py: 2, borderBottom: '1px solid var(--card-border)' }}>
        <Box sx={listToolbarRowSx}>
        <Box sx={listToolbarSearchGroupSx}>
    <TextField
      size="small"
      placeholder={searchPlaceholder}
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      sx={listSearchFieldSx}
    />
    {headerExtra}
  </Box>

   <Box sx={listToolbarActionsSx}>
   <Button
            variant="contained" size="small" onClick={onAdd}
            sx={listContainedButtonSx}>
            {actionLabel}
          </Button>
          {headerActionsAfterAdd}
        </Box>
        </Box>
        </Box>

        {loading ? (
          <TableContentSkeleton
            rows={8}
            columns={[
              ...tableColumns.map((col, index) => ({
                id: col.id || index,
                label: typeof col.label === 'string' ? col.label : '',
                flex:
                  index === 0
                    ? 1.6
                    : String(col.label || '').toLowerCase().includes('email') ||
                        String(col.label || '').toLowerCase().includes('institute') ||
                        String(col.label || '').toLowerCase().includes('course') ||
                        String(col.label || '').toLowerCase().includes('campus') ||
                        String(col.label || '').toLowerCase().includes('ranking')
                      ? 1.4
                      : String(col.label || '').toLowerCase().includes('status') ||
                          String(col.label || '').toLowerCase().includes('link') ||
                          String(col.label || '').toLowerCase().includes('fees')
                        ? 0.7
                        : 1,
                skeletonWidth:
                  col.id === '__delete__' || col.id === 'actions' ? 28 : undefined,
                skeletonHeight: col.id === '__delete__' || col.id === 'actions' ? 28 : 14,
                round: col.id === '__delete__' || col.id === 'actions',
              })),
            ]}
          />
        ) : tableColumns.length > 0 && rows.length > 0 ? (
          filteredRows.length > 0 ? (
            <ResponsiveTable columns={tableColumns} rows={paginatedRows} getRowKey={(row) => row.id} variant="resource" alwaysTable onRowClick={onRowClick} />
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
        {!loading && (
          <TablePagination
            component="div"
            count={filteredRows.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        )}
      </Paper>
    </Box>
  );
}
