import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Divider, Grid, List, ListItem, ListItemAvatar, ListItemText, Avatar, Paper, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { getResourceConfig } from '../../config/resourceConfig';
import { loadRecords } from '../../utils/resourceStorage';
import StatCard from '../../components/StatCard';
import WelcomeCard from '../../components/WelcomeCard';
import MiniStatRow from '../../components/MiniStatRow';
import QuickInsightsPanel from '../../components/dashboard/QuickInsightsPanel';
import DashboardUpcomingPanel from '../../components/dashboard/DashboardUpcomingPanel';
import ResponsiveTable from '../../components/ResponsiveTable';
import { useAuth } from '../../hooks/useAuth';
import { revenueTrend, trafficData } from '../../constants/chartData';

const DashboardTrendSnapshot = lazy(() => import('../../components/dashboard/DashboardTrendSnapshot'));
const DashboardMainCharts = lazy(() => import('../../components/charts/DashboardMainCharts'));

const chartFallback = (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
    <CircularProgress size={28} sx={{ color: 'var(--primary)' }} />
  </Box>
);

export default function DashboardTemplate({
  title,
  subtitle,
  welcomeSubtitle,
  welcomeFooterStats = [],
  kpiStats = [],
  miniStats = [],
  areaChartData = revenueTrend,
  barChartData = trafficData,
  barChartKeys = ['visits', 'signups'],
  areaChartTitle = 'Revenue overview',
  barChartTitle = 'Traffic summary',
  snapshotTitle = 'Weekly snapshot',
  snapshotSubtitle = 'Rolling 7-day performance',
  upcomingTitle = 'Upcoming actions',
  upcomingItems,
  tableTitle,
  columns,
  rows,
  activity = [],
  tableBasePath = '/tasks',
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const primaryKpis = kpiStats.slice(0, 2);
  const secondaryKpis = kpiStats.slice(2, 4);
  const tableResource = getResourceConfig(tableBasePath);
  const [storedRows, setStoredRows] = useState([]);

  useEffect(() => {
    if (tableBasePath) {
      setStoredRows(loadRecords(tableBasePath));
    }
  }, [tableBasePath]);

  const tableColumns = useMemo(
    () => columns || tableResource?.columns || [],
    [columns, tableResource],
  );
  const tableRows = useMemo(() => {
    const source = rows ?? storedRows;
    return source.slice(0, 6);
  }, [rows, storedRows]);

  const openRecord = (row) => {
    navigate(`${tableBasePath}/${row.id}`, { state: { edit: true } });
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.25, mb: 1.5, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Overview
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text)', mt: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--muted)', mt: 0.5, maxWidth: 560 }}>
            {subtitle}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate('/reports/receivables')}
            sx={{ textTransform: 'none', borderRadius: 2, borderColor: 'var(--card-border)', color: 'var(--text)' }}
          >
            New view
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate('/reports/receivables/new')}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-dark)' } }}
          >
            Create report
          </Button>
        </Box>
      </Box>

      <Grid container spacing={{ xs: 1, md: 1.25 }} sx={{ mb: { xs: 1.25, md: 1.5 }, alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, lg: 7 }} sx={{ display: 'flex' }}>
          <Stack spacing={1.25} sx={{ flex: 1, width: '100%', height: '100%' }}>
            <WelcomeCard
              userName={user?.name}
              avatar={user?.avatar}
              subtitle={welcomeSubtitle || subtitle}
              footerStats={welcomeFooterStats}
            />

            {secondaryKpis.length > 0 && (
              <Grid container spacing={1.25}>
                {secondaryKpis.map((stat) => (
                  <Grid key={stat.label} size={{ xs: 12, sm: 6 }}>
                    <StatCard {...stat} />
                  </Grid>
                ))}
              </Grid>
            )}

            <Box sx={{ flex: 1, display: 'flex', minHeight: { xs: 280, lg: 0 }, alignSelf: 'stretch' }}>
              <Suspense fallback={chartFallback}>
                <DashboardTrendSnapshot
                  title={snapshotTitle}
                  subtitle={snapshotSubtitle}
                  data={areaChartData.slice(-7)}
                />
              </Suspense>
            </Box>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }} sx={{ display: 'flex' }}>
          <Stack spacing={1.25} sx={{ flex: 1, width: '100%', height: '100%' }}>
            {primaryKpis.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
            <QuickInsightsPanel />
            <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
              <DashboardUpcomingPanel title={upcomingTitle} items={upcomingItems} fill />
            </Box>
          </Stack>
        </Grid>
      </Grid>

      <MiniStatRow items={miniStats} />

      <Suspense fallback={chartFallback}>
        <DashboardMainCharts
          areaChartData={areaChartData}
          barChartData={barChartData}
          barChartKeys={barChartKeys}
          areaChartTitle={areaChartTitle}
          barChartTitle={barChartTitle}
          height={220}
        />
      </Suspense>

      <Grid container spacing={{ xs: 1, md: 1.25 }} sx={{ width: '100%' }}>
        <Grid size={{ xs: 12, lg: activity.length > 0 ? 8 : 12 }}>
          <Paper elevation={0} className="dashboard-card" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: { xs: 1.25, md: 1.5 }, py: 1.25, borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontWeight: 700, color: 'var(--text)' }}>{tableTitle}</Typography>
              <Button size="small" onClick={() => navigate(`${tableBasePath}/new`)} sx={{ textTransform: 'none' }}>
                Add item
              </Button>
            </Box>
            {tableRows.length > 0 && tableColumns.length > 0 ? (
              <ResponsiveTable
                columns={tableColumns}
                rows={tableRows}
                getRowKey={(row) => row.id}
                alwaysTable
                onRowClick={openRecord}
              />
            ) : (
              <Box sx={{ px: 1.5, py: 2 }}>
                <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
                  No records yet. Use Add item to create one.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {activity.length > 0 && (
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper elevation={0} className="dashboard-card" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: { xs: 1.25, md: 1.5 }, py: 1.25, borderBottom: '1px solid var(--card-border)' }}>
                <Typography sx={{ fontWeight: 700, color: 'var(--text)' }}>Recent activity</Typography>
              </Box>
              <List disablePadding>
                {activity.map((item, index) => (
                  <Box key={item.id}>
                    <ListItem
                      sx={{ py: 1, px: { xs: 1.25, md: 1.5 }, alignItems: 'flex-start', cursor: 'pointer' }}
                      onClick={() => navigate('/tasks')}
                    >
                      <ListItemAvatar sx={{ minWidth: 44 }}>
                        <Avatar src={item.avatar} sx={{ width: 34, height: 34, bgcolor: 'var(--primary-soft)', color: 'var(--primary)', fontSize: '0.8rem' }}>
                          {item.initials || item.title?.[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{item.title}</Typography>}
                        secondary={
                          <Typography variant="body2" sx={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                            {item.description}
                          </Typography>
                        }
                      />
                      <Typography variant="caption" sx={{ color: 'var(--muted-light)', mt: 0.5, whiteSpace: 'nowrap' }}>
                        {item.time}
                      </Typography>
                    </ListItem>
                    {index < activity.length - 1 && <Divider component="li" />}
                  </Box>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
