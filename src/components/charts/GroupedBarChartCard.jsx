import ChartCard from './ChartCard';
import { AnimatedBarChart } from './AnimatedCharts';
import { CHART_COLORS } from '../../theme/chartTheme';


export default function GroupedBarChartCard({
  title,
  subtitle,
  data = [],
  keys = ['thisMonth', 'lastMonth', 'nextMonth'],
  colors = [CHART_COLORS.primary, CHART_COLORS.teal],
  height = 220,
  maxBarSize = 28,
  action,
  sx = {},
}) {
  return (
    <ChartCard title={title} subtitle={subtitle} action={action} sx={{ ...sx, minHeight: Math.max(180, height + 40) }}>
      <AnimatedBarChart
        data={data}
        keys={keys}
        colors={colors}
        height={height}
        maxBarSize={maxBarSize}
      />
    </ChartCard>
  );
}
