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
import { ResponsiveContainer, LineChart, Line, Tooltip, CartesianGrid, XAxis, YAxis } from 'recharts';
import { fetchWeekChecklistStats } from '../../utils/checklistStats';
import { fetchMonthRevenueDashboard } from '../../api/Receivablesapi';
import { fetchInvoicesWithMonthlyTotals, fetchNextMonthInvoiceTotal } from '../../api/invoicesApi';
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
  const [nextMonthInvoiceTotal, setNextMonthInvoiceTotal] = useState(0);
  const [vendorStats, setVendorStats] = useState({
    total: 0,
    newThisMonth: 0,
    active: 0,
    pending: 0,
    loggedInToday: 0,
  });
  const [vendorRowsList, setVendorRowsList] = useState([]);

  useEffect(() => {
    const loadNextMonthTotal = async () => {
      try {
        const total = await fetchNextMonthInvoiceTotal();
        setNextMonthInvoiceTotal(total);
      } catch (err) {
        console.error(err);
      }
    };

    loadNextMonthTotal();
  }, []);

  useEffect(() => {
    console.log("Updated State:", nextMonthInvoiceTotal);
  }, [nextMonthInvoiceTotal]);

  useEffect(() => {
    let mounted = true;
    fetchVendorRows()
      .then((rows) => {
        if (!mounted) return;
        const list = Array.isArray(rows) ? rows : [];
        setVendorRowsList(list);
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
        const idleOneMonth = list.filter((v) => {
          if (!v.lastLogin) return false;
          const parsed = Date.parse(v.lastLogin);
          if (Number.isNaN(parsed)) return false;
          const d = new Date(parsed);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }).length;
        const neverLoggedIn = total - idleOneMonth;
        setVendorStats({ total, newThisMonth, active, pending, loggedInToday, idleOneMonth, neverLoggedIn });
      })
      .catch(() => { });
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
    }).catch(() => { });
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
      .catch(() => { })
    return () => { mounted = false; };
  }, []);
  const [studentStats, setStudentStats] = useState({ total: 0, newThisMonth: 0 });
  const [newStudentsList, setNewStudents] = useState([]);
  const [installmentSummary, setInstallmentSummary] = useState({ weeksPrev: [], weeksThis: [], weeksNext: [], upcomingNext: [] });
  const [invoiceTotals, setInvoiceTotals] = useState(null);
  const now = useMemo(() => new Date(), []);
  useEffect(() => {
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
      .catch(() => { });
    return () => { mounted = false; };
  }, []);
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
        setNewStudents(Array.isArray(list) ? list : []);
      })
      .catch(() => { });
    return () => { mounted = false; };
  }, []);

  const buildDailySparklineFromDates = (dates = [], days = 10) => {
    const out = [];
    const nowDate = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(nowDate);
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const cnt = dates.filter((dt) => {
        const parsed = dt ? Date.parse(dt) : NaN;
        if (Number.isNaN(parsed)) return false;
        const dd = new Date(parsed);
        return dd.toDateString() === key;
      }).length;
      out.push({ v: cnt });
    }
    return out;
  };

  const vendorActivitySpark = useMemo(() => buildDailySparklineFromDates(vendorRowsList.map(v => v.lastLogin)), [vendorRowsList]);
  const studentSignupSpark = useMemo(() => {
    const safeList = Array.isArray(newStudentsList) ? newStudentsList : [];
    const mapper = (s) => s.createdAt || s.created_at || s.created;
    const nowDate = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - i);
      days.push(d);
    }
    const cumulative = days.map((day) => {
      const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
      let cnt = 0;
      for (const s of safeList) {
        const raw = mapper(s);
        if (!raw) continue;
        const parsed = Date.parse(raw);
        if (Number.isNaN(parsed)) continue;
        if (parsed <= endOfDay.getTime()) cnt += 1;
      }
      return { v: cnt };
    });
    if (!Array.isArray(cumulative) || cumulative.length !== 7) return Array.from({ length: 7 }, () => ({ v: 0 }));
    cumulative[cumulative.length - 1].v = studentStats.total || cumulative[cumulative.length - 1].v;
    return cumulative;
  }, [newStudentsList, now, studentStats.total]);

  const vendorTotalSpark = useMemo(() => {
    const safeList = Array.isArray(vendorRowsList) ? vendorRowsList : [];
    const mapper = (v) => v.createdAt || v.created_at || v.created;
    const nowDate = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - i);
      days.push(d);
    }
    const cumulative = days.map((day) => {
      const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
      let cnt = 0;
      for (const v of safeList) {
        const raw = mapper(v);
        if (!raw) continue;
        const parsed = Date.parse(raw);
        if (Number.isNaN(parsed)) continue;
        if (parsed <= endOfDay.getTime()) cnt += 1;
      }
      return { v: cnt };
    });
    if (!Array.isArray(cumulative) || cumulative.length !== 7) return Array.from({ length: 7 }, () => ({ v: 0 }));
    cumulative[cumulative.length - 1].v = vendorStats.total || cumulative[cumulative.length - 1].v;
    return cumulative;
  }, [vendorRowsList, now, vendorStats.total]);
  const buildMonthlySparkline = (rows = [], months = 6) => {
    const out = [];
    const nowDate = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
      const label = d.toLocaleString(undefined, { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();
      let total = 0;
      for (const it of rows) {
        const due = it.dueDate ? new Date(it.dueDate) : null;
        if (!due) continue;
        if (due.getFullYear() === year && due.getMonth() === month) {
          const comm = Number(it.commissionAmount ?? it.commission?.amount ?? 0) || 0;
          const bonus = Number(it.bonusAmount ?? it.bonus?.amount ?? 0) || 0;
          total += comm + bonus;
        }
      }
      out.push({ name: label, v: total });
    }
    return out;
  };

  const receivablesSpark = useMemo(() => {
    const rows = Array.isArray(monthRevenue) ? monthRevenue : (monthRevenue?.installments || []);
    const nowDate = new Date();
    const label = nowDate.toLocaleString(undefined, { month: 'short' });
    let total = 0;
    if (invoiceTotals && invoiceTotals.thisMonth) {
      total = Number(invoiceTotals.thisMonth.paid || 0) + Number(invoiceTotals.thisMonth.due || 0);
    } else {
      for (const it of rows) {
        const due = it.dueDate ? new Date(it.dueDate) : null;
        if (!due) continue;
        if (due.getFullYear() === nowDate.getFullYear() && due.getMonth() === nowDate.getMonth()) {
          const comm = Number(it.commissionAmount ?? it.commission?.amount ?? 0) || 0;
          const bonus = Number(it.bonusAmount ?? it.bonus?.amount ?? 0) || 0;
          total += comm + bonus;
        }
      }
    }
    return [{ name: label, v: total }, { name: label, v: total }];
  }, [monthRevenue, invoiceTotals]);
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
            sparklineData: receivablesSpark.length ? receivablesSpark : buildSparkline(4),
            sparklineFormatter: (v) => `$${Number(v || 0).toLocaleString()}`,
            chart: (
              <Box sx={{ height: 44, mt: 0.25 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(receivablesSpark.length ? receivablesSpark : [{ name: '', paid: 0, due: 0 }, { name: '', paid: 0, due: 0 }])} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="name" tick={false} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, (dataMax) => Math.max(1, Math.ceil((Number(dataMax) || 0) * 1.05))]} hide />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--card-border)', fontSize: 12 }} formatter={(v, name) => [`$${Number(v).toLocaleString()}`, name]} />
                    <Line type="monotone" dataKey="paid" stroke={CHART_COLORS.teal} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="due" stroke={CHART_COLORS.danger} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ),
            icon: <PaymentsIcon />,
            color: 'var(--teal)',
            footer: [{ label: 'Paid', value: invoiceTotals ? `$${Number(invoiceTotals.thisMonth?.paid || 0).toLocaleString()}` : `$${Number(paidThisMonth || 0).toLocaleString()}`, sub: 'This month' }, { label: 'Due', value: invoiceTotals ? `$${Number(invoiceTotals.thisMonth?.due || 0).toLocaleString()}` : `$${Number(dueThisMonth || 0).toLocaleString()}`, sub: 'Current' }],
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
              } catch (e) { }
            }
            return [
              { title: 'Last Month', data: [{ name: '', paid: buckets.last.paid, due: buckets.last.due }], keys: ['paid', 'due'], colors: [CHART_COLORS.teal, CHART_COLORS.danger] },
              { title: 'This Month', data: [{ name: '', paid: buckets.cur.paid, due: buckets.cur.due }], keys: ['paid', 'due'], colors: [CHART_COLORS.teal, CHART_COLORS.danger] },
            ];
          })()}
        />
        <Box sx={{ mt: 1.5 }}>
          <Paper elevation={0} className="dashboard-card" sx={{ borderRadius: 3, p: { xs: 1.25, md: 1.5 }, cursor: "pointer", }}
            onClick={() => { navigate("/students?filter=next-month"); }}>
            <Typography sx={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>
              Next Month — Total Upcoming
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--text)', mt: 1 }}>
              {`$${Number(nextMonthInvoiceTotal || 0).toLocaleString()}`}
            </Typography>
          </Paper>
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <Grid container spacing={1.25} sx={{ alignItems: 'stretch' }}>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex' }}>
              <StatCard
                label="Currently Active Vendors"
                value={vendorStats.loggedInToday.toLocaleString()}
                sparklineData={vendorActivitySpark}
                icon={<HowToRegIcon />}
                color="var(--teal)"
                footer={[
                  {
                    label: 'Active today',
                    value: vendorStats.loggedInToday.toLocaleString(),
                    onClick: () => {
                      navigate('/vendors?activity=active-today');
                    },
                  },
                  {
                    label: 'Idle',
                    value: vendorStats.neverLoggedIn ? vendorStats.neverLoggedIn.toLocaleString() : '0',
                    color: 'var(--error, #d32f2f)',
                    onClick: () => {
                      navigate('/vendors?activity=idle');
                    },
                  },
                ]}
                sx={{ flex: 1, width: '100%' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex' }}>
              <StatCard
                label="Total students"
                value={studentStats.total.toLocaleString()}
                sparklineData={studentSignupSpark}
                icon={<PeopleIcon />}
                color="var(--primary)"
                footer={[{
                  label: 'New this month', value: `+${studentStats.newThisMonth}`, sub: 'this month', onClick: () => {
                    const d = new Date();
                    const y = d.getFullYear();
                    const m = d.getMonth() + 1;
                    navigate(`/students?year=${y}&month=${m}`);
                  }
                }]}
                sx={{ flex: 1, width: '100%' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex' }}>
              <StatCard
                label="Total Vendors"
                value={vendorStats.total.toLocaleString()}
                sparklineData={vendorTotalSpark}
                icon={<StoreIcon />}
                color="var(--teal)"
                footer={[
                  {
                    label: 'New this month',
                    value: `+${vendorStats.newThisMonth}`,
                    sub: 'this month',
                    onClick: () => {
                      const d = new Date();
                      const y = d.getFullYear();
                      const m = d.getMonth() + 1;
                      navigate(`/vendors?year=${y}&month=${m}`);
                    },
                  },
                  {
                    label: 'Active',
                    value: vendorStats.active.toLocaleString(),
                    onClick: () => {
                      navigate('/vendors?status=active');
                    },
                  },
                  {
                    label: 'Pending',
                    value: vendorStats.pending.toLocaleString(),
                    onClick: () => {
                      navigate('/vendors?status=pending');
                    },
                  },
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