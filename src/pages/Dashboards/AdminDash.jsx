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
import { CHART_COLORS } from '../../theme/chartTheme';

import { useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { fetchWeekChecklistStats } from '../../utils/checklistStats';
import { fetchMonthRevenueDashboard } from '../../api/Receivablesapi';
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
    fetchMonthRevenueDashboard()
      .then((res) => {
        if (!mounted) return;
        setMonthRevenue(res);
      })
      .catch(() => {})
    return () => { mounted = false; };
  }, []);
  // dynamic accounting/student data
  const [studentStats, setStudentStats] = useState({ total: 0, newThisMonth: 0 });
  const [installmentSummary, setInstallmentSummary] = useState({ totalFees: 0, totalPaid: 0, totalBalance: 0, countPaid: 0, countPending: 0, weeksThis: [], weeksPrev: [], weeksNext: [], upcomingNext: [] });

  useEffect(() => {
    let mounted = true;
    fetchStudentPaymentInstallments()
      .then((list) => {
        if (!mounted) return;
        if (!Array.isArray(list)) return;
        const totals = list.reduce((acc, it) => {
          acc.totalFees += Number(it.feesAmount || 0);
          acc.totalPaid += Number(it.paidAmount || 0);
          acc.totalBalance += Number(it.balanceAmount || 0);
          if ((it.paymentStatus || '').toLowerCase() === 'paid') acc.countPaid += 1;
          else acc.countPending += 1;
          const key = `${it.studentId}::${it.fullName}`;
          if (!acc.byStudentMap[key]) acc.byStudentMap[key] = { studentId: it.studentId, fullName: it.fullName, fees: 0, paid: 0, balance: 0, installments: 0 };
          const s = acc.byStudentMap[key];
          s.fees += Number(it.feesAmount || 0);
          s.paid += Number(it.paidAmount || 0);
          s.balance += Number(it.balanceAmount || 0);
          s.installments += 1;
          return acc;
        }, { totalFees: 0, totalPaid: 0, totalBalance: 0, countPaid: 0, countPending: 0, byStudentMap: {} });
        const byStudent = Object.values(totals.byStudentMap).sort((a,b) => b.balance - a.balance);
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevYear = prevMonthDate.getFullYear();
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonth = nextMonthDate.getMonth();
        const nextYear = nextMonthDate.getFullYear();
        const makeWeeks = (year, month) => {
          const weeks = [];
          const first = new Date(year, month, 1);
          const last = new Date(year, month + 1, 0);
          let start = new Date(first);
          while (start <= last) {
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            weeks.push({ start: new Date(start), end: end > last ? new Date(last) : end, paid: 0, due: 0 });
            start.setDate(start.getDate() + 7);
          }
          return weeks;
        };
        const weeksThis = makeWeeks(currentYear, currentMonth);
        const weeksPrev = makeWeeks(prevYear, prevMonth);
        const weeksNext = makeWeeks(nextYear, nextMonth);
        const addToWeeks = (arr, weeks) => {
          arr.forEach((it) => {
            const d = it.dueDate ? new Date(it.dueDate) : null;
            if (!d) return;
            for (const w of weeks) {
              if (d >= w.start && d <= w.end) {
                w.paid += Number(it.paidAmount || 0);
                w.due += Number(it.balanceAmount || 0) + Number(it.paidAmount || 0);
                break;
              }
            }
          });
        };
        addToWeeks(list, weeksThis);
        addToWeeks(list, weeksPrev);
        addToWeeks(list, weeksNext);
        const upcomingNext = list.filter((it) => {
          if (!it.dueDate) return false;
          const d = new Date(it.dueDate);
          return d.getFullYear() === nextYear && d.getMonth() === nextMonth;
        }).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
        setInstallmentSummary({ totalFees: totals.totalFees, totalPaid: totals.totalPaid, totalBalance: totals.totalBalance, countPaid: totals.countPaid, countPending: totals.countPending, byStudent, weeksThis, weeksPrev, weeksNext, upcomingNext });
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchAllStudents()
      .then((list) => {
        if (!mounted) return;
        const total = Array.isArray(list) ? list.length : 0;
        const now = new Date();
        const newThisMonth = Array.isArray(list) ? list.filter((s) => { if (!s.createdAt) return false; const d = new Date(s.createdAt); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length : 0;
        setStudentStats({ total, newThisMonth });
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);
  return (
    <>
    <DashboardTemplate
      title="Admin Overview"
      welcomeFooterStats={[
        { label: "Today's collections", value: monthRevenue ? `$${Number(monthRevenue.collected || 0).toLocaleString()}` : '$0'},
      ]}
      kpiStats={[
        {
          label: 'Total students',
          value: studentStats.total.toLocaleString(),
          sparklineData: buildSparkline(2),
          icon: <PeopleIcon />,
          color: 'var(--primary)',
          footer: [ { label: 'New this mo', value: `+${studentStats.newThisMonth}`, sub: 'this month' } ],
        },
        {
          label: 'Total Vendors',
          value: vendorStats.total.toLocaleString(),
          sparklineData: buildSparkline(2),
          icon: <StoreIcon />,
          color: 'var(--teal)',
          footer: [
            { label: 'New this month', value: `+${vendorStats.newThisMonth}`, sub: 'this month' },
            { label: 'Active', value: vendorStats.active.toLocaleString() },
            { label: 'Pending', value: vendorStats.pending.toLocaleString() },
          ],
        },
        {
          label: 'Currently Active Vendors',
          value: vendorStats.loggedInToday.toLocaleString(),
          sparklineData: buildSparkline(2),
          icon: <HowToRegIcon />,
          color: 'var(--teal)',
          footer: [
            { label: 'Logged in today', value: vendorStats.loggedInToday.toLocaleString() },
            { label: 'Active total', value: vendorStats.active.toLocaleString() },
            { label: 'Pending', value: vendorStats.pending.toLocaleString() },
          ],
        },
        {
          label: 'Receivables',
          value: monthRevenue ? `$${Number(monthRevenue.revenue || 0).toLocaleString()}` : '$0',
          sparklineData: buildSparkline(4),
          icon: <PaymentsIcon />,
          color: 'var(--teal)',
          footer: [ { label: 'Collected', value: monthRevenue ? `$${Number(monthRevenue.collected || 0).toLocaleString()}` : '$0', sub: 'This month' }, { label: 'Outstanding', value: monthRevenue ? `$${Number(monthRevenue.outstanding || 0).toLocaleString()}` : '$0', sub: 'Current' } ],
        },
        {
          label: 'Open tasks',
          value: pending == null ? '' : String(pending),
          sparklineData: buildSparkline(3),
          icon: <AssignmentIcon />,
          color: 'var(--warning)',
          footer: [ { label: 'Due today', value: dueToday == null ? '0' : String(dueToday), sub: 'today' }, { label: 'Overdue', value: overdue == null ? '0' : String(overdue), color: 'var(--danger)' }, { label: 'Completed', value: completedThisWeek == null ? '0' : String(completedThisWeek), sub: 'This week' } ],
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

      <Box sx={{ mt: 1.5, width: '100%' }}>
        <GroupedBarChartCard
          items={[
            {
              title: 'Last Month - weekly paid vs due',
              data: installmentSummary.weeksPrev
                ? installmentSummary.weeksPrev.map((w, i) => ({ name: `W${i + 1}`, paid: w.paid, due: w.due }))
                : [],
              keys: ['paid', 'due'],
               colors: [CHART_COLORS.teal, CHART_COLORS.danger],
            },
            {
              title: 'This Month - weekly paid vs due',
              data: installmentSummary.weeksThis
                ? installmentSummary.weeksThis.map((w, i) => ({ name: `W${i + 1}`, paid: w.paid, due: w.due }))
                : [],
              keys: ['paid', 'due'],
               colors: [CHART_COLORS.teal, CHART_COLORS.danger],
            },
          ]}
        />
        <Box sx={{ mt: 1.5 }}>
          <Paper elevation={0} className="dashboard-card" sx={{ borderRadius: 3, p: { xs: 1.25, md: 1.5 } }}>
            <Typography sx={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>
              Next Month — Total Upcoming
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--text)', mt: 1 }}>
              {`$${(installmentSummary.upcomingNext || [])
                .reduce((sum, it) => sum + Number(it.balanceAmount || 0), 0)
                .toLocaleString()}`}
            </Typography>
          </Paper>
        </Box>
      </Box>
    </>
  );
}
