import { Grid } from '@mui/material';
import ChartCard from './ChartCard';
import { AnimatedAreaChart, AnimatedBarChart } from './AnimatedCharts';
import { revenueTrend, trafficData } from '../../constants/chartData';

export default function PageChartsPanel({ height = 200 }) {
  return (
    <Grid container spacing={{ xs: 1, md: 1.25 }} sx={{ mb: { xs: 1.25, md: 1.5 }, alignItems: 'flex-start' }}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <ChartCard title="Performance trend" subtitle="Animated overview for this module">
          <AnimatedAreaChart data={revenueTrend} dataKey="value" secondaryKey="secondary" height={height} />
        </ChartCard>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <ChartCard title="Activity summary" subtitle="Recent volume breakdown">
          <AnimatedBarChart data={trafficData} keys={['visits', 'signups']} height={height} />
        </ChartCard>
      </Grid>
    </Grid>
  );
}
