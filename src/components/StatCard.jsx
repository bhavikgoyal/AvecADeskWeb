import { Box, LinearProgress, Paper, Typography } from '@mui/material';
import TrendBadge from './TrendBadge';
import { SparklineChart, DonutProgress } from './charts/AnimatedCharts';
import { CHART_COLORS } from '../theme/chartTheme';

function FooterMetrics({ items = [], color }) {
  if (!items.length) return null;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`,
        gap: 0.75,
        mt: 1,
        pt: 1,
        borderTop: '1px solid var(--card-border)',
      }}
    >
      {items.map((item) => (
        <Box key={item.label} sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            {item.label}
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: item.color || color || 'var(--text)', mt: 0.15, lineHeight: 1.2 }}>
            {item.value}
          </Typography>
          {item.sub && (
            <Typography sx={{ fontSize: '0.65rem', color: 'var(--muted-light)', lineHeight: 1.2 }}>{item.sub}</Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

function defaultSparklineFooter(trend) {
  return [
    { label: '7d avg', value: trend >= 0 ? '+4.2%' : '-1.8%', sub: 'vs prior' },
    { label: 'Peak day', value: 'Jun 9', sub: 'Highest' },
    { label: 'Forecast', value: trend >= 0 ? 'Up' : 'Flat', sub: 'Next week' },
  ];
}

function defaultDonutFooter(value) {
  return [
    { label: 'On track', value: `${Math.max(value - 8, 0)}%`, color: 'var(--success)' },
    { label: 'At risk', value: `${Math.min(12, 100 - value)}%`, color: 'var(--warning)' },
    { label: 'Target', value: '85%', sub: `Gap ${value - 85 > 0 ? '+' : ''}${value - 85}%` },
  ];
}

export default function StatCard({
  icon,
  label,
  value,
  caption,
  color,
  trend,
  sparklineData,
  donutValue,
  chart,
  footer,
  progressBars,
}) {
  const footerItems =
    footer ||
    (donutValue !== undefined
      ? defaultDonutFooter(donutValue)
      : sparklineData
        ? defaultSparklineFooter(trend ?? 0)
        : caption
          ? [{ label: 'Status', value: caption }]
          : []);

  return (
    <Paper
      elevation={0}
      className="dashboard-card stat-card"
      sx={{
        p: 1.25,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.35 }}>
            {label}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.35, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.4rem' }, color: 'var(--text)', lineHeight: 1 }}>
              {value}
            </Typography>
            {trend !== undefined && <TrendBadge value={trend} />}
          </Box>
          {caption && !sparklineData && donutValue === undefined && (
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--muted)', mt: 0.25 }}>{caption}</Typography>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              backgroundColor: 'var(--primary-soft)',
              display: 'grid',
              placeItems: 'center',
              color: color || CHART_COLORS.primary,
              flexShrink: 0,
              '& svg': { fontSize: 18 },
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      {donutValue !== undefined && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.25 }}>
          <DonutProgress value={donutValue} size={72} color={color || CHART_COLORS.primary} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {(progressBars || [
              { label: 'Engagement', value: donutValue },
              { label: 'Retention', value: Math.max(donutValue - 12, 0) },
            ]).map((bar) => (
              <Box key={bar.label} sx={{ mb: 0.75 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.2 }}>
                  <Typography sx={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 600 }}>{bar.label}</Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: 'var(--text)', fontWeight: 700 }}>{bar.value}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={bar.value}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: 'var(--primary-soft)',
                    '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: color || CHART_COLORS.primary },
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {sparklineData && (
        <Box sx={{ height: 40, mt: 0.25 }}>
          <SparklineChart data={sparklineData} color={color || CHART_COLORS.primary} height={40} />
        </Box>
      )}

      {chart}

      <FooterMetrics items={footerItems} color={color} />
    </Paper>
  );
}
