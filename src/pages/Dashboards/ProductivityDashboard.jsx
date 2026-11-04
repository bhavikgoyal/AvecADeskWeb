import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '../../theme/chartTheme';
import { getProductivityDashboard } from '../../api/productivityApi';
import { DateTextField } from '../../components/forms';

const PRODUCTIVE_COLOR = CHART_COLORS.primary;
const NEUTRAL_COLOR = CHART_COLORS.warning;

const RANGE_TABS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
];

const cardSx = {
  border: '1px solid var(--card-border)',
  borderRadius: 3,
  bgcolor: 'var(--card-bg)',
  p: { xs: 1.5, md: 2 },
  height: '100%',
  boxSizing: 'border-box',
};

const percent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

const formatHms = (seconds) => {
  const total = Math.max(Math.round(seconds), 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
};

const formatDisplayDate = (date) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const toIsoDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getRangeDates = (range, selectedDate, customFrom, customTo) => {
  if (range === 'custom') return { fromDate: customFrom, toDate: customTo };
  const toDate = toIsoDate(selectedDate);
  if (range === 'week') return { fromDate: toIsoDate(addDays(selectedDate, -6)), toDate };
  if (range === 'month') {
    return { fromDate: toIsoDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)), toDate };
  }
  return { fromDate: toDate, toDate };
};

const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

function IconBadge({ icon, color }) {
  return (
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: 2,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color,
        bgcolor: `color-mix(in srgb, ${color} 12%, transparent)`,
        '& svg': { fontSize: 20 },
      }}
    >
      {icon}
    </Box>
  );
}

function TimeSplitCard({ productivePct, neutralPct }) {
  const hasData = productivePct + neutralPct > 0;
  const data = hasData
    ? [
        { name: 'productive', v: productivePct, color: PRODUCTIVE_COLOR },
        { name: 'neutral', v: neutralPct, color: NEUTRAL_COLOR },
      ]
    : [{ name: 'empty', v: 1, color: 'var(--muted-bg)' }];

  const legend = [
    { label: 'Members Productivity Time', value: productivePct, color: PRODUCTIVE_COLOR },
    { label: 'Members Neutral Time', value: neutralPct, color: NEUTRAL_COLOR },
  ];

  return (
    <Paper elevation={0} sx={{ ...cardSx, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ position: 'relative', width: 104, height: 104, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="v" innerRadius={36} outerRadius={50} startAngle={90} endAngle={-270} stroke="none">
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: PRODUCTIVE_COLOR }}>{productivePct}%</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0 }}>
        {legend.map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, mt: 0.75, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: item.color, lineHeight: 1.1 }}>{item.value}%</Typography>
              <Typography sx={{ fontSize: 12, color: 'var(--muted)' }}>{item.label}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function SummaryItem({ icon, value, label, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <IconBadge icon={icon} color={color} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, color, fontSize: '1rem', lineHeight: 1.2 }}>{value}</Typography>
        <Typography noWrap sx={{ fontSize: 12, color: 'var(--muted)' }}>{label}</Typography>
      </Box>
    </Box>
  );
}

function ActiveMembersDialog({ open, onClose, members, rangeLabel }) {
  const headSx = { fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', py: 1, px: 1.25 };
  const cellSx = { fontSize: 13, color: 'var(--text)', py: 1, px: 1.25, borderTop: '1px solid var(--card-border)' };
  const timeSx = { ...cellSx, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pb: 0.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
            Active Members ({members.length})
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'var(--muted)' }}>{rangeLabel}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {members.length === 0 ? (
          <Typography sx={{ py: 3, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            No member was active in this period.
          </Typography>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Box component="th" sx={{ ...headSx, textAlign: 'left' }}>Member</Box>
                <Box component="th" sx={{ ...headSx, textAlign: 'right' }}>First Login</Box>
                <Box component="th" sx={{ ...headSx, textAlign: 'right' }}>Last Seen</Box>
                <Box component="th" sx={{ ...headSx, textAlign: 'right' }}>Login Days</Box>
                <Box component="th" sx={{ ...headSx, textAlign: 'right' }}>Work Time</Box>
                <Box component="th" sx={{ ...headSx, textAlign: 'right' }}>Productive</Box>
                <Box component="th" sx={{ ...headSx, textAlign: 'right' }}>Neutral</Box>
                <Box component="th" sx={{ ...headSx, textAlign: 'right' }}>Productivity</Box>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.userId}>
                  <Box component="td" sx={cellSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: 'var(--primary-soft)', color: 'var(--primary-dark)' }}>
                        {initials(m.name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>{m.name}</Typography>
                        {m.role && <Typography sx={{ fontSize: 11, color: 'var(--muted)' }}>{m.role}</Typography>}
                      </Box>
                    </Box>
                  </Box>
                  <Box component="td" sx={timeSx}>{formatDateTime(m.firstLoginOn)}</Box>
                  <Box component="td" sx={timeSx}>{formatDateTime(m.lastSeenOn)}</Box>
                  <Box component="td" sx={timeSx}>{m.loginDays}</Box>
                  <Box component="td" sx={timeSx}>{formatHms(m.totalSeconds)}</Box>
                  <Box component="td" sx={{ ...timeSx, color: PRODUCTIVE_COLOR, fontWeight: 700 }}>{formatHms(m.productiveSeconds)}</Box>
                  <Box component="td" sx={{ ...timeSx, color: NEUTRAL_COLOR, fontWeight: 700 }}>{formatHms(m.neutralSeconds)}</Box>
                  <Box component="td" sx={{ ...timeSx, fontWeight: 700 }}>
                    {percent(m.productiveSeconds, m.productiveSeconds + m.neutralSeconds)}%
                  </Box>
                </tr>
              ))}
            </tbody>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ProductivityDashboard() {
  const [range, setRange] = useState('today');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [customFrom, setCustomFrom] = useState(() => toIsoDate(addDays(new Date(), -6)));
  const [customTo, setCustomTo] = useState(() => toIsoDate(new Date()));
  const [reloadKey, setReloadKey] = useState(0);
  const [activeListOpen, setActiveListOpen] = useState(false);
  const [result, setResult] = useState({ key: null, members: [], error: '' });

  const { fromDate, toDate } = getRangeDates(range, selectedDate, customFrom, customTo);
  const requestKey = `${fromDate}|${toDate}|${reloadKey}`;

  useEffect(() => {
    if (!fromDate || !toDate) return undefined;
    let cancelled = false;
    getProductivityDashboard({ fromDate, toDate, trendDays: 1 })
      .then((data) => {
        if (cancelled) return;
        setResult({ key: requestKey, members: data.members, error: '' });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load productivity dashboard', err);
        setResult((prev) => ({ ...prev, key: requestKey, error: 'Productivity data could not be loaded.' }));
      });
    return () => { cancelled = true; };
  }, [fromDate, toDate, requestKey]);

  const { members, error } = result;
  const loading = Boolean(fromDate && toDate) && result.key !== requestKey;

  const stats = useMemo(() => {
    const productive = members.reduce((sum, m) => sum + m.productiveSeconds, 0);
    const neutral = members.reduce((sum, m) => sum + m.neutralSeconds, 0);
    const tasksDone = members.reduce((sum, m) => sum + m.tasksDone, 0);
    const tasksTotal = members.reduce((sum, m) => sum + m.tasksTotal, 0);
    const activeMembers = members
      .filter((m) => m.loginDays > 0 || m.totalSeconds > 0)
      .sort((a, b) => b.totalSeconds - a.totalSeconds || String(a.firstLoginOn).localeCompare(String(b.firstLoginOn)));

    return {
      productive,
      neutral,
      work: members.reduce((sum, m) => sum + m.totalSeconds, 0),
      productivityPct: percent(productive, productive + neutral),
      neutralPct: percent(neutral, productive + neutral),
      taskCompletionPct: percent(tasksDone, tasksTotal),
      tasksDone,
      tasksTotal,
      activeMembers,
    };
  }, [members]);

  const shiftDate = (direction) =>
    setSelectedDate((prev) => {
      if (range === 'month') return new Date(prev.getFullYear(), prev.getMonth() + direction + 1, 0);
      return addDays(prev, direction * (range === 'week' ? 7 : 1));
    });
  const rangeLabel =
    fromDate && toDate
      ? fromDate === toDate
        ? formatDisplayDate(new Date(`${fromDate}T00:00:00`))
        : `${formatDisplayDate(new Date(`${fromDate}T00:00:00`))} - ${formatDisplayDate(new Date(`${toDate}T00:00:00`))}`
      : '';

  return (
    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Paper elevation={0} sx={{ ...cardSx, height: 'auto' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.25 }}>
            <IconBadge icon={<InsightsOutlinedIcon />} color="var(--primary)" />
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', md: '1.35rem' }, color: 'var(--text)' }}>
              Productivity Dashboard
            </Typography>
           
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            {range === 'custom' ? (
              <>
                <DateTextField
                  size="small"
                  label="From"
                  value={customFrom}
                  onChangeValue={setCustomFrom}
                  maxDate={customTo || undefined}
                  sx={{ width: 170, '& .MuiInputBase-root': { height: 38, borderRadius: 2 } }}
                />
                <DateTextField
                  size="small"
                  label="To"
                  value={customTo}
                  onChangeValue={setCustomTo}
                  minDate={customFrom || undefined}
                  sx={{ width: 170, '& .MuiInputBase-root': { height: 38, borderRadius: 2 } }}
                />
              </>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  height: 38,
                  pl: 1.25,
                  pr: 0.5,
                  border: '1px solid var(--card-border)',
                  borderRadius: 2,
                  bgcolor: 'var(--card-bg)',
                }}
              >
                <CalendarMonthOutlinedIcon sx={{ fontSize: 18, color: 'var(--muted)' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', minWidth: 92, textAlign: 'center' }}>
                  {fromDate === toDate
                    ? formatDisplayDate(selectedDate)
                    : `${formatDisplayDate(new Date(`${fromDate}T00:00:00`))} - ${formatDisplayDate(selectedDate)}`}
                </Typography>
                <IconButton size="small" onClick={() => shiftDate(-1)} aria-label="Previous period">
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => shiftDate(1)} aria-label="Next period">
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              disabled={loading}
              onClick={() => setReloadKey((key) => key + 1)}
              sx={{ height: 38, textTransform: 'none', fontWeight: 700, borderRadius: 2, boxShadow: 'none', bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-dark)', boxShadow: 'none' } }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
          {RANGE_TABS.map((tab) => {
            const active = range === tab.value;
            return (
              <Button
                key={tab.value}
                onClick={() => setRange(tab.value)}
                variant={active ? 'contained' : 'outlined'}
                sx={{
                  height: 36,
                  px: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  boxShadow: 'none',
                  ...(active
                    ? { bgcolor: 'var(--primary)', '&:hover': { bgcolor: 'var(--primary-dark)', boxShadow: 'none' } }
                    : { color: 'var(--text)', borderColor: 'var(--card-border)', bgcolor: 'var(--card-bg)' }),
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>
        {loading && <LinearProgress sx={{ mt: 1.5, borderRadius: 999 }} />}
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={1.5} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <TimeSplitCard productivePct={stats.productivityPct} neutralPct={stats.neutralPct} />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4.5 }}>
          <Paper elevation={0} sx={cardSx}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', mb: 1.25 }}>Total Summary</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 1.25,
                p: 1.25,
                border: '1px solid var(--card-border)',
                borderRadius: 2,
              }}
            >
              <SummaryItem icon={<GroupsOutlinedIcon />} value={members.length} label="Total Members" color="var(--accent)" />
              <SummaryItem icon={<AccessTimeIcon />} value={formatHms(stats.work)} label="Total Work Time" color="var(--teal)" />
              <SummaryItem icon={<AssignmentTurnedInOutlinedIcon />} value={formatHms(stats.productive)} label="Total Productive Time" color={PRODUCTIVE_COLOR} />
              <SummaryItem icon={<HourglassEmptyIcon />} value={formatHms(stats.neutral)} label="Total Neutral Time" color={NEUTRAL_COLOR} />
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4.5 }}>
          <Paper
            elevation={0}
            sx={{
              ...cardSx,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconBadge icon={<GroupsOutlinedIcon />} color="var(--accent)" />
                <Typography sx={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Active Members</Typography>
              </Box>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1.1 }}>
                {stats.activeMembers.length} / {members.length}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'var(--muted)' }}>
                {percent(stats.activeMembers.length, members.length)}% active
              </Typography>
              <AvatarGroup
                max={6}
                sx={{
                  justifyContent: 'flex-end',
                  '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 10, borderColor: 'var(--card-bg)' },
                }}
              >
                {stats.activeMembers.map((m) => (
                  <Avatar key={m.userId} title={m.name} sx={{ bgcolor: 'var(--primary-soft)', color: 'var(--primary-dark)' }}>
                    {initials(m.name)}
                  </Avatar>
                ))}
              </AvatarGroup>
              <Button
                size="small"
                onClick={() => setActiveListOpen(true)}
                sx={{ alignSelf: 'flex-start', p: 0, minWidth: 0, textTransform: 'none', fontWeight: 700, color: 'var(--primary)' }}
              >
                View members
              </Button>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
                minWidth: 0,
                pl: { sm: 2 },
                pt: { xs: 2, sm: 0 },
                borderLeft: { sm: '1px solid var(--card-border)' },
                borderTop: { xs: '1px solid var(--card-border)', sm: 'none' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconBadge icon={<TaskAltIcon />} color="var(--success)" />
                <Typography sx={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Task Completion</Typography>
              </Box>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1.1 }}>
                {stats.taskCompletionPct}%
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'var(--muted)' }}>
                {stats.tasksDone} of {stats.tasksTotal} tasks done
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats.taskCompletionPct}
                sx={{
                  mt: 0.5,
                  height: 6,
                  borderRadius: 999,
                  bgcolor: 'var(--muted-bg)',
                  '& .MuiLinearProgress-bar': { bgcolor: 'var(--success)', borderRadius: 999 },
                }}
              />
            </Box>
          </Paper>
          <ActiveMembersDialog
            open={activeListOpen}
            onClose={() => setActiveListOpen(false)}
            members={stats.activeMembers}
            rangeLabel={rangeLabel}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
