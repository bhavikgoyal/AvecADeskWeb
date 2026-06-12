import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Box } from '@mui/material';
import { CHART_ANIMATION, CHART_COLORS } from '../../theme/chartTheme';

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--card-border)',
  fontSize: 12,
};

export function SparklineChart({ data, color = CHART_COLORS.primary, height = 48 }) {
  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            {...CHART_ANIMATION}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function AnimatedAreaChart({ data, dataKey = 'value', height = 260, secondaryKey }) {
  const fillParent = height === '100%';

  return (
    <Box
      sx={{
        width: '100%',
        height: fillParent ? '100%' : height,
        minHeight: fillParent ? 280 : undefined,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="areaPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
            </linearGradient>
            {secondaryKey && (
              <linearGradient id="areaSecondary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity={0.02} />
              </linearGradient>
            )}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={tooltipStyle} />
          {secondaryKey && (
            <Area
              type="monotone"
              dataKey={secondaryKey}
              stroke={CHART_COLORS.teal}
              fill="url(#areaSecondary)"
              strokeWidth={2}
              {...CHART_ANIMATION}
            />
          )}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={CHART_COLORS.primary}
            fill="url(#areaPrimary)"
            strokeWidth={2.5}
            {...CHART_ANIMATION}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function AnimatedBarChart({ data, keys = ['visits', 'signups'], height = 260 }) {
  const colors = [CHART_COLORS.primary, CHART_COLORS.teal];

  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: CHART_COLORS.primarySoft }} />
          {keys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length]}
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
              {...CHART_ANIMATION}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function DonutProgress({ value = 78, size = 120, color = CHART_COLORS.primary }) {
  const data = [
    { name: 'progress', value },
    { name: 'remaining', value: 100 - value },
  ];

  return (
    <Box sx={{ width: size, height: size, position: 'relative', mx: 'auto' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={size * 0.36}
            outerRadius={size * 0.46}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
            {...CHART_ANIMATION}
          >
            <Cell fill={color} />
            <Cell fill="rgba(101, 119, 146, 0.12)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          fontSize: size * 0.18,
          color: 'var(--text)',
        }}
      >
        {value}%
      </Box>
    </Box>
  );
}
