import DashboardTemplate from './DashboardTemplate';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentsIcon from '@mui/icons-material/Payments';
import PeopleIcon from '@mui/icons-material/People';
import EmailIcon from '@mui/icons-material/Email';
import AssignmentIcon from '@mui/icons-material/Assignment';
import StoreIcon from '@mui/icons-material/Store';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { buildSparkline, revenueTrend, trafficData } from '../../constants/chartData';
import { fetchStudentPaymentInstallments } from '../../api/Receivablesapi';
import { fetchAllStudents } from '../../api/studentsApi';
import GroupedBarChartCard from '../../components/charts/GroupedBarChartCard';
import StatCard from '../../components/StatCard';
import { CHART_COLORS } from '../../theme/chartTheme';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Paper, Typography, Button } from '@mui/material';
import { fetchWeekChecklistStats } from '../../utils/checklistStats';
import { fetchMonthRevenueDashboard } from '../../api/Receivablesapi';
import { fetchInvoicesWithMonthlyTotals } from '../../api/invoicesApi';
import { fetchVendorRows } from '../../api/vendorsApi';
const kpiStats = [
  {
    label: 'Open tasks',
    value: '',
    trend: 0,
    sparklineData: buildSparkline(3),
    icon: <AssignmentIcon />,
    color: 'var(--warning)',
    footer: [],
  },
];
export default function AdminDash() {
  const navigate = useNavigate();
  
  const [vendorStats, setVendorStats] = useState({
    total: 0,
    newThisMonth: 0,
    active: 0,
    pending: 0,
    loggedInToday: 0,
  });
  useEffect(() => {
    let mounted = true;
    fetchVendorRows()
      .then((rows) => {
        if (!mounted) return;
        const list = Array.isArray(rows) ? rows : [];
        const now = new Date();
        const total = list.length;
        const newThisMonth = list.filter((v) => {
          if (!v.createdAt) return false;
          const d = new Date(v.createdAt);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }).length;
        const active = list.filter((v) => v.isActive || v.active || (v.status || '').toLowerCase() === 'active').length;
        const pending = list.filter((v) => (v.status || '').toLowerCase() === 'pending' || v.pending === true).length;
        const loggedInToday = list.filter((v) => {
          if (!v.lastLogin) return false;
          const d = new Date(v.lastLogin);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        }).length;
        setVendorStats({ total, newThisMonth, active, pending, loggedInToday });
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);
  const [pending, setPending] = useState(null);
  const [completedThisWeek, setCompletedThisWeek] = useState(null);
  const [dueToday, setDueToday] = useState(null);
  const [overdue, setOverdue] = useState(null);
  useEffect(() => {
    let mounted = true;
    fetchWeekChecklistStats().then((res) => {
      if (!mounted) return;
      setPending(res.pending);
      setCompletedThisWeek(res.completedThisWeek);
      setDueToday(res.dueToday ?? 0);
      setOverdue(res.overdue ?? 0);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  const [monthRevenue, setMonthRevenue] = useState(null);
  useEffect(() => {
    let mounted = true;
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    fetchMonthRevenueDashboard({ fromDate: from, toDate: to })
      .then((res) => {
        if (!mounted) return;
        setMonthRevenue(res);
      })
      .catch(() => {})
    return () => { mounted = false; };
  }, []);
  // dynamic accounting/student data
  const [studentStats, setStudentStats] = useState({ total: 0, newThisMonth: 0 });
  const [installmentSummary, setInstallmentSummary] = useState({ weeksPrev: [], weeksThis: [], weeksNext: [], upcomingNext: [] });
  const [invoiceTotals, setInvoiceTotals] = useState(null);
  const now = useMemo(() => new Date(), []);
  useEffect(() => {
    // derive weekly buckets from monthRevenue (commission+bonus) similar to AccDash
    const rows = Array.isArray(monthRevenue) ? monthRevenue : (monthRevenue?.installments || []);
    const cur = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const makeWeeks = (year, month) => {
      const weeks = [];
      const first = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      let start = new Date(first);
      while (start <= lastDay) {
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        weeks.push({ start: new Date(start), end: end > lastDay ? new Date(lastDay) : end, paid: 0, due: 0 });
        start.setDate(start.getDate() + 7);
      }
      return weeks;
    };
    const weeksThis = makeWeeks(cur.getFullYear(), cur.getMonth());
    const weeksPrev = makeWeeks(last.getFullYear(), last.getMonth());
    const weeksNext = makeWeeks(next.getFullYear(), next.getMonth());
    const upcomingNext = [];
    for (const it of rows) {
      const due = it.dueDate ? new Date(it.dueDate) : null;
      if (!due) continue;
      const comm = Number(it.commissionAmount ?? it.commission?.amount ?? 0) || 0;
      const bonus = Number(it.bonusAmount ?? it.bonus?.amount ?? 0) || 0;
      const amount = comm + bonus;
      const status = (it.commissionStatus || it.paymentStatus || '').toString().toLowerCase();
      const add = (weeks) => {
        for (const w of weeks) {
          if (due >= w.start && due <= w.end) {
            if (status === 'paid') w.paid += amount; else w.due += amount;
            break;
          }
        }
      };
      if (due.getFullYear() === last.getFullYear() && due.getMonth() === last.getMonth()) add(weeksPrev);
      else if (due.getFullYear() === cur.getFullYear() && due.getMonth() === cur.getMonth()) add(weeksThis);
      else if (due.getFullYear() === next.getFullYear() && due.getMonth() === next.getMonth()) { add(weeksNext); upcomingNext.push(it); }
    }
    setInstallmentSummary({ weeksPrev, weeksThis, weeksNext, upcomingNext });
  }, [monthRevenue, now]);
  useEffect(() => {
    let mounted = true;
    const y = now.getFullYear();
    const m = now.getMonth() + 1; 
    fetchInvoicesWithMonthlyTotals({ year: y, month: m })
      .then((res) => {
        if (!mounted) return;
        setInvoiceTotals(res?.summary || null);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);
  // compute paid/due totals for current month for KPI footer
  const { paidThisMonth, dueThisMonth } = (() => {
    const rows = Array.isArray(monthRevenue) ? monthRevenue : (monthRevenue?.installments || []);
    const nowDate = new Date();
    const cur = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    let paid = 0;
    let due = 0;
    for (const it of rows) {
      const dueDate = it.dueDate ? new Date(it.dueDate) : null;
      if (!dueDate) continue;
      if (dueDate.getFullYear() === cur.getFullYear() && dueDate.getMonth() === cur.getMonth()) {
        const comm = Number(it.commissionAmount ?? it.commission?.amount ?? 0) || 0;
        const bonus = Number(it.bonusAmount ?? it.bonus?.amount ?? 0) || 0;
        const amount = comm + bonus;
        const status = (it.commissionStatus || it.paymentStatus || '').toString().toLowerCase();
        if (status === 'paid') paid += amount; else due += amount;
      }
    }
    return { paidThisMonth: paid, dueThisMonth: due };
  })();
  useEffect(() => {
    let mounted = true;
    fetchAllStudents()
      .then((list) => {
        if (!mounted) return;
        const total = Array.isArray(list) ? list.length : 0;
        const now = new Date();
        const newList = Array.isArray(list) ? list.filter((s) => { if (!s.createdAt) return false; const d = new Date(s.createdAt); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }) : [];
        const newThisMonth = newList.length;
        setStudentStats({ total, newThisMonth });
        setNewStudents(newList);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);
  return (
    <>
    <DashboardTemplate
      title="Admin Overview"
      welcomeFooterStats={(() => {
        if (invoiceTotals) {
          const fmt = (n) => `$${Number(n || 0).toLocaleString()}`;
          const now = new Date();
          const y = now.getFullYear();
          const m = now.getMonth() + 1;
          return [
            { label: 'This Month Paid', value: fmt(invoiceTotals.thisMonth?.paid ?? 0), path: `/invoices?view=paid&year=${y}&month=${m}` },
            { label: 'This Month Due', value: fmt(invoiceTotals.thisMonth?.due ?? 0), path: `/invoices?view=due&year=${y}&month=${m}` },
          ];
        }
        const rows = Array.isArray(monthRevenue) ? monthRevenue : (monthRevenue?.installments || []);
        const now = new Date();
        const cur = new Date(now.getFullYear(), now.getMonth(), 1);
        const buckets = { cur: { paid: 0, due: 0 } };
        for (const it of rows) {
          const due = it.dueDate ? new Date(it.dueDate) : null;
          if (!due) continue;
          if (due.getFullYear() === cur.getFullYear() && due.getMonth() === cur.getMonth()) {
            const comm = Number(it.commissionAmount ?? it.commission?.amount ?? 0) || 0;
            const bonus = Number(it.bonusAmount ?? it.bonus?.amount ?? 0) || 0;
            const amount = comm + bonus;
            const status = (it.commissionStatus || it.paymentStatus || '').toString().toLowerCase();
            if (status === 'paid') buckets.cur.paid += amount; else buckets.cur.due += amount;
          }
        }
        const fmt = (n) => `$${Number(n || 0).toLocaleString()}`;
        const now2 = new Date();
        const y2 = now2.getFullYear();
        const m2 = now2.getMonth() + 1;
        return [
          { label: 'This Month Paid', value: fmt(buckets.cur.paid), path: `/invoices?view=paid&year=${y2}&month=${m2}` },
          { label: 'This Month Due', value: fmt(buckets.cur.due), path: `/invoices?view=due&year=${y2}&month=${m2}` },
        ];
      })()}
          kpiStats={[
        {
          label: 'Receivables',
          value: invoiceTotals ? `$${Number(invoiceTotals.thisMonth?.paid || 0).toLocaleString()}` : `$${Number(paidThisMonth || 0).toLocaleString()}`,
          sparklineData: buildSparkline(4),
          icon: <PaymentsIcon />,
          color: 'var(--teal)',
          footer: [ { label: 'Paid', value: invoiceTotals ? `$${Number(invoiceTotals.thisMonth?.paid || 0).toLocaleString()}` : `$${Number(paidThisMonth || 0).toLocaleString()}`, sub: 'This month' }, { label: 'Due', value: invoiceTotals ? `$${Number(invoiceTotals.thisMonth?.due || 0).toLocaleString()}` : `$${Number(dueThisMonth || 0).toLocaleString()}`, sub: 'Current' } ],
        }
      ]}
      showSnapshot={false}
      showQuickInsights={false}
      showUpcoming={false}
      showCharts={false}
      showMiniStats={false}
      showTable={false}
      rightExtra={null}
      tableBasePath="/invoices"
      miniStats={[]}
      activity={[]}
      upcomingItems={[]}
      areaChartData={revenueTrend}
    />
      <Box sx={{ mt: 1.5, width: '100%', minHeight: 280 }}>
        <GroupedBarChartCard
          items={(() => {
            const rows = Array.isArray(monthRevenue) ? monthRevenue : (monthRevenue?.installments || []);
            const cur = new Date(now.getFullYear(), now.getMonth(), 1);
            const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const buckets = { last: { paid: 0, due: 0 }, cur: { paid: 0, due: 0 }, next: { paid: 0, due: 0 } };
            for (const it of rows) {
              const due = it.dueDate ? new Date(it.dueDate) : null;
              if (!due) continue;
              const comm = Number(it.commissionAmount ?? it.commission?.amount ?? 0) || 0;
              const bonus = Number(it.bonusAmount ?? it.bonus?.amount ?? 0) || 0;
              const amount = comm + bonus;
              const status = (it.commissionStatus || it.paymentStatus || '').toString().toLowerCase();
              if (due.getFullYear() === last.getFullYear() && due.getMonth() === last.getMonth()) {
                if (status === 'paid') buckets.last.paid += amount; else buckets.last.due += amount;
              } else if (due.getFullYear() === cur.getFullYear() && due.getMonth() === cur.getMonth()) {
                if (status === 'paid') buckets.cur.paid += amount; else buckets.cur.due += amount;
              } else if (due.getFullYear() === next.getFullYear() && due.getMonth() === next.getMonth()) {
                if (status === 'paid') buckets.next.paid += amount; else buckets.next.due += amount;
              }
            }
           if (invoiceTotals) {
              try {
                buckets.last.paid = Number(invoiceTotals.lastMonth?.paid ?? buckets.last.paid) || 0;
                buckets.last.due = Number(invoiceTotals.lastMonth?.due ?? buckets.last.due) || 0;
                buckets.cur.paid = Number(invoiceTotals.thisMonth?.paid ?? buckets.cur.paid) || 0;
                buckets.cur.due = Number(invoiceTotals.thisMonth?.due ?? buckets.cur.due) || 0;
              } catch (e) {}
            }
            return [
              { title: 'Last Month', data: [{ name: '', paid: buckets.last.paid, due: buckets.last.due }], keys: ['paid', 'due'], colors: [CHART_COLORS.teal, CHART_COLORS.danger] },
              { title: 'This Month', data: [{ name: '', paid: buckets.cur.paid, due: buckets.cur.due }], keys: ['paid', 'due'], colors: [CHART_COLORS.teal, CHART_COLORS.danger] },
              ];
          })()}
        />
        <Box sx={{ mt: 1.5 }}>
          <Paper elevation={0} className="dashboard-card" sx={{ borderRadius: 3, p: { xs: 1.25, md: 1.5 } }}>
            <Typography sx={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>
              Next Month — Total Upcoming
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--text)', mt: 1 }}>
              {`$${(installmentSummary.upcomingNext || [])
                .reduce((sum, it) => {
                  const comm = Number(it.commissionAmount ?? it.commission?.amount ?? 0) || 0;
                  const bonus = Number(it.bonusAmount ?? it.bonus?.amount ?? 0) || 0;
                  const balance = Number(it.balanceAmount ?? 0) || 0;
                  const value = (comm || bonus) ? (comm + bonus) : balance;
                  return sum + value;
                }, 0)
                .toLocaleString()}`}
            </Typography>
          </Paper>
        </Box>
       <Box sx={{ mt: 1.5 }}>
          <Grid container spacing={1.25} sx={{ alignItems: 'stretch' }}>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex' }}>
              <StatCard
                label="Currently Active Vendors"
                value={vendorStats.loggedInToday.toLocaleString()}
                sparklineData={buildSparkline(2)}
                icon={<HowToRegIcon />}
                color="var(--teal)"
                footer={[
                  { label: 'Logged in today', value: vendorStats.loggedInToday.toLocaleString() },
                  { label: 'Active total', value: vendorStats.active.toLocaleString() },
                  { label: 'Pending', value: vendorStats.pending.toLocaleString() },
                ]}
                sx={{ flex: 1, width: '100%' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex' }}>
              <StatCard
                label="Total students"
                value={studentStats.total.toLocaleString()}
                sparklineData={buildSparkline(2)}
                icon={<PeopleIcon />}
                color="var(--primary)"
                footer={[{ label: 'New this mo', value: `+${studentStats.newThisMonth}`, sub: 'this month', onClick: () => {
                  const d = new Date();
                  const y = d.getFullYear();
                  const m = d.getMonth() + 1;
                  navigate(`/students?year=${y}&month=${m}`);
                } }]}
                sx={{ flex: 1, width: '100%' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex' }}>
              <StatCard
                label="Total Vendors"
                value={vendorStats.total.toLocaleString()}
                sparklineData={buildSparkline(2)}
                icon={<StoreIcon />}
                color="var(--teal)"
                footer={[
                  { label: 'New this month', value: `+${vendorStats.newThisMonth}`, sub: 'this month' },
                  { label: 'Active', value: vendorStats.active.toLocaleString() },
                  { label: 'Pending', value: vendorStats.pending.toLocaleString() },
                ]}
                sx={{ flex: 1, width: '100%' }}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  );
}