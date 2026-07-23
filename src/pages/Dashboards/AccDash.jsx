import DashboardTemplate from './DashboardTemplate';
import PeopleIcon from '@mui/icons-material/People';
import PaymentsIcon from '@mui/icons-material/Payments';
import StoreIcon from '@mui/icons-material/Store';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { buildSparkline, revenueTrend } from '../../constants/chartData';
import { useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { fetchMonthRevenueDashboard } from '../../api/Receivablesapi';
import { fetchStudentPaymentInstallments } from '../../api/Receivablesapi';
import { fetchAllStudents } from '../../api/studentsApi';
import GroupedBarChartCard from '../../components/charts/GroupedBarChartCard';


const lastMonth = [
  { name: '00', thisMonth: 120, lastMonth: 40 },
  { name: '04', thisMonth: 180, lastMonth: 55 },
  { name: '08', thisMonth: 260, lastMonth: 80 },
  { name: '12', thisMonth: 320, lastMonth: 110 },
  { name: '16', thisMonth: 280, lastMonth: 95 },
  { name: '20', thisMonth: 340, lastMonth: 120 },
  { name: '24', thisMonth: 220, lastMonth: 70 },
];
const thisMonth = [
  { name: '00', thisMonth: 120, lastMonth: 40 },
  { name: '04', thisMonth: 180, lastMonth: 55 },
  { name: '08', thisMonth: 260, lastMonth: 80 },
  { name: '12', thisMonth: 320, lastMonth: 110 },
  { name: '16', thisMonth: 280, lastMonth: 95 },
  { name: '20', thisMonth: 340, lastMonth: 120 },
  { name: '24', thisMonth: 220, lastMonth: 70 },
];
const nextMonth = [
  { name: '00', thisMonth: 120, lastMonth: 40 },
  { name: '04', thisMonth: 180, lastMonth: 55 },
  { name: '08', thisMonth: 260, lastMonth: 80 },
  { name: '12', thisMonth: 320, lastMonth: 110 },
  { name: '16', thisMonth: 280, lastMonth: 95 },
  { name: '20', thisMonth: 340, lastMonth: 120 },
  { name: '24', thisMonth: 220, lastMonth: 70 },
];

export default function AccDash() {
  const [monthRevenue, setMonthRevenue] = useState(null);
  useEffect(() => {
    let mounted = true;
    fetchMonthRevenueDashboard()
      .then((res) => { if (!mounted) return; setMonthRevenue(res); })
      .catch(() => {})
    return () => { mounted = false; };
  }, []);
  const now = new Date();
  const monthIndex = now.getMonth();
  const prevIndex = monthIndex - 1 >= 0 ? monthIndex - 1 : 11;
  const nextIndex = monthIndex + 1 <= 11 ? monthIndex + 1 : 0;

  const chartData = [
    { name: 'Previous', lastMonth: revenueTrend[prevIndex] ?? 0 },
    { name: 'Current', thisMonth: revenueTrend[monthIndex] ?? 0 },
    { name: 'Next', nextMonth: revenueTrend[nextIndex] ?? 0 },
  ];

  const [studentStats, setStudentStats] = useState({ total: 0, enrolled: 0, waitlist: 0, newThisMonth: 0 });
  const [installmentSummary, setInstallmentSummary] = useState({ totalFees: 0, totalPaid: 0, totalBalance: 0, countPaid: 0, countPending: 0, byStudent: [] });
  useEffect(() => {
    let mounted = true;
    fetchStudentPaymentInstallments()
      .then((list) => {
        if (!mounted) return;
        if (!Array.isArray(list)) return setInstallmentSummary((s) => s);
        const totals = list.reduce(
          (acc, it) => {
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
          },
          { totalFees: 0, totalPaid: 0, totalBalance: 0, countPaid: 0, countPending: 0, byStudentMap: {} }
        );
        const byStudent = Object.values(totals.byStudentMap).sort((a, b) => b.balance - a.balance);
        // compute weekly aggregates for this month and last month
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
        const weeksNext = makeWeeks(nextYear, nextMonth);
        addToWeeks(list, weeksNext);
        // upcoming installments for next month (raw items)
        const upcomingNext = list.filter((it) => {
          if (!it.dueDate) return false;
          const d = new Date(it.dueDate);
          return d.getFullYear() === nextYear && d.getMonth() === nextMonth;
        }).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
        setInstallmentSummary({ totalFees: totals.totalFees, totalPaid: totals.totalPaid, totalBalance: totals.totalBalance, countPaid: totals.countPaid, countPending: totals.countPending, byStudent, weeksThis, weeksPrev, weeksNext, upcomingNext });
      })
      .catch(() => {})
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    let mounted = true;
    fetchAllStudents()
      .then((list) => {
        if (!mounted) return;
        const total = Array.isArray(list) ? list.length : 0;
        const enrolled = list.filter((s) => (s.enrolmentStatus || '').toLowerCase() === 'enrolled').length;
        const waitlist = list.filter((s) => (s.enrolmentStatus || '').toLowerCase() === 'interested').length;
        const now = new Date();
        const newThisMonth = Array.isArray(list)
          ? list.filter((s) => {
              if (!s.createdAt) return false;
              const d = new Date(s.createdAt);
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }).length
          : 0;
        setStudentStats({ total, enrolled, waitlist, newThisMonth });
      })
      .catch(() => {})
    return () => { mounted = false; };
  }, []);

  return (
    <DashboardTemplate
      title="Accounting Dashboard"
      subtitle="This Month's Receivables Overview"
      welcomeFooterStats={[
        { label: 'Received', value: monthRevenue ? `$${Number(monthRevenue.collected || 0).toLocaleString()}` : '$0' },
        { label: 'Due', value: monthRevenue ? `$${Number(monthRevenue.outstanding || 0).toLocaleString()}` : '$0' },
      ]}
      kpiStats={(() => {
        const base = [
          {
            label: 'Total students',
            value: studentStats.total.toLocaleString(),
            sparklineData: buildSparkline(2),
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
      
      showTable={false}
      children={(
        <>
          <GroupedBarChartCard title="Last Month - weekly paid vs due" data={installmentSummary.weeksPrev ? installmentSummary.weeksPrev.map((w, i) => ({ name: `W${i+1}`, paid: w.paid, due: w.due })) : []} keys={["paid","due"]} height={220} sx={{ height: 260 }} />
          <GroupedBarChartCard title="This Month - weekly paid vs due" data={installmentSummary.weeksThis ? installmentSummary.weeksThis.map((w, i) => ({ name: `W${i+1}`, paid: w.paid, due: w.due })) : []} keys={["paid","due"]} height={220} sx={{ height: 260 }} />
           <GroupedBarChartCard
            title="Next Month — upcoming installments (by week)"
            data={installmentSummary.weeksNext ? installmentSummary.weeksNext.map((w, i) => ({ name: `W${i+1}`, paid: w.paid, due: w.due })) : []}
            keys={["paid", "due"]}
            height={220}
            sx={{ height: 260 }}
          />

        </>
      )}
        rightExtra={null}
    />
  );
}
