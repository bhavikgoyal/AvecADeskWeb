import DashboardTemplate from './DashboardTemplate';
import PeopleIcon from '@mui/icons-material/People';
import PaymentsIcon from '@mui/icons-material/Payments';
import StoreIcon from '@mui/icons-material/Store';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { buildSparkline } from '../../constants/chartData';
import { useEffect, useState, useMemo } from 'react';
import { fetchAllStudents } from '../../api/studentsApi';
import { fetchMonthRevenueDashboard } from '../../api/Receivablesapi';
import { Box, Paper, Typography } from '@mui/material';
import GroupedBarChartCard from '../../components/charts/GroupedBarChartCard';
import DashboardUpcomingPanel from '../../components/dashboard/DashboardUpcomingPanel';
import { CHART_COLORS } from '../../theme/chartTheme';
import AnticipatedReceivables1Page from '../anticipatedReceivables1/AnticipatedReceivables1Page';
import { fetchMonthlyPaidDueTotals } from '../../api/anticipatedReceivablesApi';
import { ResponsiveContainer, BarChart, Bar,LineChart, Line, Tooltip, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';

export default function AccDash() {
  const now = useMemo(() => new Date(), []);
  const [studentStats, setStudentStats] = useState({ total: 0, enrolled: 0, waitlist: 0, newThisMonth: 0 });
  const [studentsList, setStudentsList] = useState([]);
  const [studentSpark, setStudentSpark] = useState([]);
  const [monthRevenue, setMonthRevenue] = useState(null);
  const [installmentSummary, setInstallmentSummary] = useState({ weeksPrev: [], weeksThis: [], weeksNext: [], upcomingNext: [] });
  const [monthlyPaidDue, setMonthlyPaidDue] = useState({});
  useEffect(() => {
    let mounted = true;
    fetchMonthlyPaidDueTotals()
      .then((totals) => { if (mounted) setMonthlyPaidDue(totals || {}); })
      .catch(() => { });
    return () => { mounted = false; };
  }, []);

  const paymentOverviewData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - 11 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const totals = monthlyPaidDue[key] || { paid: 0, due: 0 };
      return {
        name: `${date.toLocaleString('en-US', { month: 'short' })}-${String(date.getFullYear()).slice(-2)}`,
        paid: Number(totals.paid.toFixed(2)),
        due: Number(totals.due.toFixed(2)),
      };
    });
  }, [monthlyPaidDue]);

  useEffect(() => {
    let mounted = true;
    fetchAllStudents()
      .then((list) => {
        if (!mounted) return;
        const arr = Array.isArray(list) ? list : [];
        setStudentsList(arr);
        const total = arr.length;
        const enrolled = arr.filter((s) => (s.enrolmentStatus || '').toLowerCase() === 'enrolled').length;
        const waitlist = arr.filter((s) => (s.enrolmentStatus || '').toLowerCase() === 'interested' || (s.enrolmentStatus || '').toLowerCase() === 'waitlist').length;
        const now = new Date();
        const newThisMonth = arr.filter((s) => {
          const d = s.createdAt ? new Date(s.createdAt) : null;
          return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }).length;
        setStudentStats({ total, enrolled, waitlist, newThisMonth });
      })
      .catch(() => { });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const buckets = Array.from({ length: daysInMonth }, () => 0);
    for (const s of studentsList || []) {
      const d = s.createdAt ? new Date(s.createdAt) : null;
      if (!d) continue;
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        const idx = d.getDate() - 1;
        if (idx >= 0 && idx < buckets.length) buckets[idx] += 1;
      }
    }
    setStudentSpark(buckets.map((v) => ({ v })));
  }, [studentsList, now]);

  useEffect(() => {
    let mounted = true;
     const from = new Date(now.getFullYear(), now.getMonth() -11,1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0,23,59,59,999).toISOString();
    fetchMonthRevenueDashboard({ fromDate: from, toDate: to })
      .then((data) => {
        if (!mounted) return;
        try { console.log('fetchMonthRevenueDashboard response:', data); } catch (e) { }
        setMonthRevenue(data || null);
      })
      .catch(() => { });

    return () => { mounted = false; };
  }, [now]);

  useEffect(() => {
    const rows = Array.isArray(monthRevenue) ? monthRevenue : (monthRevenue?.installments || []);
    const cur = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    function makeWeeks() {
      return Array.from({ length: 5 }, () => ({ paid: 0, due: 0 }));
    }

    const weeksPrev = makeWeeks();
    const weeksThis = makeWeeks();
    const weeksNext = makeWeeks();
    const upcomingNext = [];

    for (const it of rows) {
      const due = it.dueDate ? new Date(it.dueDate) : null;
      const comm = Number(it.commissionAmount ?? it.commission?.amount ?? 0) || 0;
      const bonus = Number(it.bonusAmount ?? it.bonus?.amount ?? 0) || 0;
      const amount = comm + bonus;
      const status = (it.commissionStatus || it.paymentStatus || '').toString().toLowerCase();

      if (!due) continue;
      const day = due.getDate();
      const weekIndex = Math.min(4, Math.floor((day - 1) / 7));

      if (due.getFullYear() === last.getFullYear() && due.getMonth() === last.getMonth()) {
        if (status === 'paid') weeksPrev[weekIndex].paid += amount; else weeksPrev[weekIndex].due += amount;
      } else if (due.getFullYear() === cur.getFullYear() && due.getMonth() === cur.getMonth()) {
        if (status === 'paid') weeksThis[weekIndex].paid += amount; else weeksThis[weekIndex].due += amount;
      } else if (due.getFullYear() === next.getFullYear() && due.getMonth() === next.getMonth()) {
        if (status === 'paid') weeksNext[weekIndex].paid += amount; else weeksNext[weekIndex].due += amount;
        upcomingNext.push(it);
      }
    }

    setInstallmentSummary({ weeksPrev, weeksThis, weeksNext, upcomingNext });
  }, [monthRevenue, now]);

  return (
    <Box>
      <DashboardTemplate
        title="Accounting Dashboard"
        subtitle="This Month's Receivables Overview"
        welcomeFooterStats={(() => {
          const current = paymentOverviewData[paymentOverviewData.length - 1] || { paid: 0, due: 0 };
          const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          return [
            { label: 'This Month Paid', value: fmt(current.paid) },
            { label: 'This Month Due', value: fmt(current.due) },
          ];
        })()}
        kpiStats={(() => {
          const base = [
            {
              label: 'Total students',
              value: studentStats.total.toLocaleString(),
              sparklineData: studentSpark && studentSpark.length ? studentSpark : buildSparkline(2),
              icon: <PeopleIcon />,
              color: 'var(--primary)',
              footer: [
                { label: 'New this month', value: `+${studentStats.newThisMonth}`, sub: 'this month' },
              ],
            },
          ];

          base.push();
          return base;
        })()}
        showSnapshot={false}
        showQuickInsights={false}
        showUpcoming={false}
        showCharts={false}
        showMiniStats={false}
        showTable={false}
        tableBasePath="/invoices"
        rightExtra={null}
      />

    <Box sx={{ mt: 1.5, width: '100%', minHeight: 280 }}>
  <Paper
    elevation={0}
    sx={{
      border: '1px solid var(--card-border)',
      borderRadius: 3,
      p: { xs: 1.5, md: 2 },
    }}
  >
    <Typography
      sx={{
        fontWeight: 700,
        color: 'var(--text)',
        fontSize: '0.95rem',
        mb: 2,
      }}
    >
      Payment Overview - Last 12 Months
    </Typography>

    <Box sx={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={paymentOverviewData}
          margin={{  top: 10,  right: 20, left: 10, bottom: 5,}} barCategoryGap="20%"  >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />

          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) =>  `$${Number(value).toLocaleString()}`} />

          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--card-border)', fontSize: 12,  }}
            formatter={(value, name) => [ `$${Number(value).toLocaleString()}`, name, ]}  />

          <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
          <Bar dataKey="paid" name="Paid" fill={CHART_COLORS.teal} radius={[4, 4, 0, 0]} barSize={18}/>
          <Bar dataKey="due" name="Due" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  </Paper>
        <Box sx={{ mt: 1.5, width: '100%' }}>
                <AnticipatedReceivables1Page />
              </Box>
      </Box>
    </Box>
  );
}
