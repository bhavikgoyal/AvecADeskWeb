import { Box } from '@mui/material';
import ChartCard from './ChartCard';
import { AnimatedBarChart } from './AnimatedCharts';
import { CHART_COLORS } from '../../theme/chartTheme';

function SingleGroupedBarChart({
  title = 'This Month, Last Month, Next Month',
  subtitle,
  data = [],
  keys = ['thisMonth', 'lastMonth'],
  colors = [CHART_COLORS.primary, CHART_COLORS.teal],
  height = 220,
  maxBarSize = 28,
  action,
  sx = {},
}) {
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      action={action}
      sx={{ ...sx, minHeight: Math.max(180, height + 40), height: '100%' }}
    >
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

/**
 * Single card, or pass `items` for a built-in 2-column auto-row grid.
 *
 * @example
 * <GroupedBarChartCard
 *   items={[
 *     { title: 'A', data, keys: ['paid', 'due'] },
 *     { title: 'B', data, keys: ['paid', 'due'] },
 *   ]}
 * />
 */
export default function GroupedBarChartCard({ items, ...singleProps }) {
  if (items?.length) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: { xs: 1, md: 1.25 },
          width: '100%',
          alignItems: 'stretch',
        }}
      >
        {items.map((chart, index) => (
          <Box key={chart.id ?? chart.title ?? index} sx={{ minWidth: 0 }}>
            <SingleGroupedBarChart {...chart} />
          </Box>
        ))}
      </Box>
    );
  }

  return <SingleGroupedBarChart {...singleProps} />;
}
