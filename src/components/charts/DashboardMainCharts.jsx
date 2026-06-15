import { Grid } from '@mui/material';
import ChartCard from './ChartCard';
import { AnimatedAreaChart, AnimatedBarChart } from './AnimatedCharts';

export default function DashboardMainCharts({
  areaChartData,
  barChartData,
  barChartKeys,
  areaChartTitle,
  barChartTitle,
  height = 220,
}) {
  return (
    <Grid container spacing={{ xs: 1, md: 1.25 }} sx={{ mb: { xs: 1.25, md: 1.5 }, alignItems: 'flex-start' }}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <ChartCard title={areaChartTitle} subtitle="Animated trend for the last 12 months">
          <AnimatedAreaChart data={areaChartData} dataKey="value" secondaryKey="secondary" height={height} />
        </ChartCard>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <ChartCard title={barChartTitle} subtitle="Hourly activity breakdown">
          <AnimatedBarChart data={barChartData} keys={barChartKeys} height={height} />
        </ChartCard>
      </Grid>
    </Grid>
  );
}
