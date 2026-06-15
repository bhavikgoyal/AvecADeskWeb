import { Box } from '@mui/material';
import ChartCard from '../charts/ChartCard';
import { AnimatedAreaChart } from '../charts/AnimatedCharts';
import { revenueTrend } from '../../constants/chartData';

export default function DashboardTrendSnapshot({
  title = 'Weekly snapshot',
  subtitle = 'Rolling 7-day performance',
  data = revenueTrend.slice(-7),
  dataKey = 'value',
  secondaryKey = 'secondary',
}) {
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      className="dashboard-card dashboard-card--fill"
      sx={{
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: { xs: 280, lg: 320 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ flex: 1, width: '100%', minHeight: { xs: 220, lg: 280 }, display: 'flex' }}>
        <AnimatedAreaChart data={data} dataKey={dataKey} secondaryKey={secondaryKey} height="100%" />
      </Box>
    </ChartCard>
  );
}
