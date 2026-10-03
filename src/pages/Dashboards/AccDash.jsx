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
import { fetchInvoicesWithMonthlyTotals } from '../../api/invoicesApi';
import GroupedBarChartCard from '../../components/charts/GroupedBarChartCard';
import DashboardUpcomingPanel from '../../components/dashboard/DashboardUpcomingPanel';
import { CHART_COLORS } from '../../theme/chartTheme';
import AnticipatedReceivables1Page from '../anticipatedReceivables1/AnticipatedReceivables1Page';
import { ResponsiveContainer, BarChart, Bar,LineChart, Line, Tooltip, CartesianGrid, XAxis, YAxis } from 'recharts';

export default function AccDash() {
  const now = useMemo(() => new Date(), []);
  const [studentStats, setStudentStats] = useState({ total: 0, enrolled: 0, waitlist: 0, newThisMonth: 0 });
  const [studentsList, setStudentsList] = useState([]);
  const [studentSpark, setStudentSpark] = useState([]);
  const [monthRevenue, setMonthRevenue] = useState(null);
  const [installmentSummary, setInstallmentSummary] = useState({ weeksPrev: [], weeksThis: [], weeksNext: [], upcomingNext: [] });
  const [invoiceTotals, setInvoiceTotals] = useState(null);

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

    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    fetchInvoicesWithMonthlyTotals({ year: y, month: m })
      .then((res) => {
        if (!mounted) return;
        try { console.log('AccDash fetchInvoicesWithMonthlyTotals result:', res); } catch (e) { }
        setInvoiceTotals(res?.summary || null);
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
          const items = [];
          const rows = Array.isArray(monthRevenue) ? monthRevenue : (monthRevenue?.installments || []);
          let totalCommission = 0;
          let totalBonus = 0;
          let paidCount = 0;
          let dueCount = 0;
          function bucketKey(d) {
            if (!d) return null;
            return `${d.getFullYear()}-${d.getMonth()}`;
          }

          const cur = new Date(now.getFullYear(), now.getMonth(), 1);
          const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);

          const buckets = new Map();
          for (const t of ['last', 'cur', 'next']) buckets.set(t, { paid: 0, due: 0, paidCount: 0, dueCount: 0 });

          for (const it of rows) {
            const due = it.dueDate ? new Date(it.dueDate) : null;
            if (!due) continue;
            const comm = Number(it.commissionAmount ?? it.commission?.amount ?? 0) || 0;
            const bonus = Number(it.bonusAmount ?? it.bonus?.amount ?? 0) || 0;
            const amount = comm + bonus;
            const status = (it.commissionStatus || it.paymentStatus || '').toString().toLowerCase();

            if (due.getFullYear() === last.getFullYear() && due.getMonth() === last.getMonth()) {
              if (status === 'paid') { buckets.get('last').paid += amount; buckets.get('last').paidCount += 1; }
              else { buckets.get('last').due += amount; buckets.get('last').dueCount += 1; }
            } else if (due.getFullYear() === cur.getFullYear() && due.getMonth() === cur.getMonth()) {
              if (status === 'paid') { buckets.get('cur').paid += amount; buckets.get('cur').paidCount += 1; }
              else { buckets.get('cur').due += amount; buckets.get('cur').dueCount += 1; }
            } else if (due.getFullYear() === next.getFullYear() && due.getMonth() === next.getMonth()) {
              if (status === 'paid') { buckets.get('next').paid += amount; buckets.get('next').paidCount += 1; }
              else { buckets.get('next').due += amount; buckets.get('next').dueCount += 1; }
            }
          }

          const fmt = (n) => `$${Number(n || 0).toLocaleString()}`;
          if (invoiceTotals) {
            items.push({ label: 'This Month Paid', value: fmt(invoiceTotals.thisMonth?.paid ?? 0) });
            items.push({ label: 'This Month Due', value: fmt(invoiceTotals.thisMonth?.due ?? 0) });
          } else {
            items.push({ label: 'This Month Paid', value: fmt(buckets.get('cur').paid) });
            items.push({ label: 'This Month Due', value: fmt(buckets.get('cur').due) });
          }
          return items;
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
          data={(() => {
            const rows = Array.isArray(monthRevenue)? monthRevenue  : monthRevenue?.installments || [];
            const months = Array.from({ length: 12 }, (_, index) => {
            const date = new Date( now.getFullYear(), now.getMonth() - 11 + index, 1);

              return {
                name: date.toLocaleString('en-US', {month: 'short',}),
                year: date.getFullYear(),
                month: date.getMonth(),
                paid: 0,
                due: 0,
              };
            });

            rows.forEach((item) => { const dueDate = item.dueDate? new Date(item.dueDate) : null;
              if (!dueDate) return;
              const month = months.find( (m) => m.year === dueDate.getFullYear() && m.month === dueDate.getMonth());
              if (!month) return;
              const commission = Number(item.commissionAmount ??item.commission?.amount ?? 0 ) || 0;
              const bonus = Number( item.bonusAmount ?? item.bonus?.amount ?? 0 ) || 0;
              const amount = commission + bonus;
              const status = (item.commissionStatus ||item.paymentStatus ||'').toString().toLowerCase();
              if (status === 'paid')
                { month.paid += amount;} 
              else 
                { month.due += amount;  }
            });

            // Current month should match Accounting Dashboard totals
            if (invoiceTotals?.thisMonth)
            {
              const currentMonth = months[months.length - 1];
              currentMonth.paid = Number(invoiceTotals.thisMonth.paid || 0 );
              currentMonth.due = Number(invoiceTotals.thisMonth.due || 0 );
            }

            // Previous month should use invoice totals when available
            if (invoiceTotals?.lastMonth) 
            {
              const previousMonth = months[months.length - 2];
              previousMonth.paid = Number(invoiceTotals.lastMonth.paid || 0);
              previousMonth.due = Number(invoiceTotals.lastMonth.due || 0 );
            }

            return months;
          })()}
          margin={{  top: 10,  right: 20, left: 10, bottom: 5,}} barCategoryGap="20%"  >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />

          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) =>  `$${Number(value).toLocaleString()}`} />

          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--card-border)', fontSize: 12,  }}
            formatter={(value, name) => [ `$${Number(value).toLocaleString()}`, name, ]}  />

          <Bar dataKey="paid" name="Paid" fill={CHART_COLORS.teal} radius={[4, 4, 0, 0]} barSize={18}/>
          <Bar dataKey="due" name="Due" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  </Paper>
        {/* <Box sx={{ mt: 1.5 }}>
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
        </Box> */}
        <Box sx={{ mt: 1.5, width: '100%' }}>
                <AnticipatedReceivables1Page />
              </Box>
      </Box>
    </Box>
  );
}
