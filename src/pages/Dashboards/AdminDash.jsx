import DashboardTemplate from './DashboardTemplate';
import PeopleIcon from '@mui/icons-material/People';
import PaymentsIcon from '@mui/icons-material/Payments';
import StoreIcon from '@mui/icons-material/Store';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EmailIcon from '@mui/icons-material/Email';
import { buildSparkline } from '../../constants/chartData';

import { useEffect, useState } from 'react';
import { fetchWeekChecklistStats } from '../../utils/checklistStats';
import { fetchMonthRevenueDashboard } from '../../api/Receivablesapi';

const kpiStats = [
  {
    label: 'Total students',
    value: '75,782',
    trend: 2,
    sparklineData: buildSparkline(2),
    icon: <PeopleIcon />,
    color: 'var(--primary)',
    footer: [
      { label: 'New this mo', value: '+842', sub: 'vs 798 prior' },
      { label: 'Enrolled', value: '71.2k', sub: '94% active' },
      { label: 'Waitlist', value: '1,204', sub: '12 institutes' },
    ],
  },
  {
    label: 'Active users',
    value: '25,782',
    trend: -1,
    donutValue: 78,
    icon: <StoreIcon />,
    color: 'var(--teal)',
    progressBars: [
      { label: 'Daily logins', value: 78 },
      { label: 'Weekly active', value: 64 },
    ],
    footer: [
      { label: 'Online now', value: '312' },
      { label: 'Sessions', value: '4.2k', sub: 'Today' },
      { label: 'Avg duration', value: '18m' },
    ],
  },
  
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

const miniStats = [
  { icon: <ReceiptIcon fontSize="small" />, title: '132 Invoices', subtitle: '12 awaiting payment', color: 'var(--primary)', path: '/invoices' },
  { icon: <PaymentsIcon fontSize="small" />, title: '$18.4k Due', subtitle: 'Vendor commissions', color: 'var(--teal)', bg: 'rgba(32, 201, 151, 0.1)', path: '/reports/dues' },
  { icon: <PeopleIcon fontSize="small" />, title: '46 Enrolments', subtitle: 'In pipeline', color: 'var(--accent)', path: '/status/students' },
  { icon: <EmailIcon fontSize="small" />, title: '38 Reminders', subtitle: 'Sent this week', color: 'var(--warning)', bg: 'rgba(245, 159, 0, 0.1)', path: '/reminders' },
];

const activity = [
  { id: 'a1', title: 'Payment received', description: 'Student payment confirmed for INV-2041.', time: '12m ago', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
  { id: 'a2', title: 'Vendor approved', description: 'New vendor onboarding completed.', time: '1h ago', avatar: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=200&q=80' },
  { id: 'a3', title: 'Report generated', description: 'Anticipated receivables report exported.', time: '3h ago', initials: 'AR' },
];

const upcomingItems = [
  { id: 'a1', title: 'Vendor payout batch', subtitle: 'Due for approval today', path: '/vendors' },
  { id: 'a2', title: 'Receivables forecast', subtitle: 'Q3 report needs review', path: '/reports/receivables' },
  { id: 'a3', title: 'User access audit', subtitle: '2 pending invitations', path: '/users' },
];

export default function AdminDash() {
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
      // also set dueToday and overdue if desired
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
  return (
    <DashboardTemplate
      title="Admin Overview"
      // subtitle="Full system overview across vendors, students, finance, and operations."
      // welcomeSubtitle="You have 5 new messages and 2 new notifications across the platform."
      welcomeFooterStats={[
        { label: "Today's collections", value: monthRevenue ? `$${Number(monthRevenue.collected || 0).toLocaleString()}` : '$0', trend: 7 },
        { label: 'Growth rate', value: '78.4%', trend: -1 },
      ]}
      kpiStats={(function buildKpis() {
        // start with base KPIs (Revenue removed)
        const base = kpiStats.map((k) => {
          if (k.label !== 'Open tasks') return k;
          return {
            ...k,
            value: pending == null ? k.value : String(pending),
            footer: [
              { label: 'Due today', value: dueToday == null ? '0' : String(dueToday), sub: 'today' },
              { label: 'Overdue', value: overdue == null ? '0' : String(overdue), color: 'var(--danger)' },
              { label: 'Completed', value: completedThisWeek == null ? '0' : String(completedThisWeek), sub: 'This week' },
            ],
          };
        });

        // inject Revenue card after the second item (after Active users)
        if (monthRevenue) {
          const revenueCard = {
            label: 'Revenue',
            value: `$${Number(monthRevenue.revenue || 0).toLocaleString()}`,
            trend: 0,
            sparklineData: buildSparkline(4),
            icon: <PaymentsIcon />,
            color: 'var(--primary)',
            footer: [
              { label: 'Collected', value: `$${Number(monthRevenue.collected || 0).toLocaleString()}`, sub: 'This month' },
              { label: 'Outstanding', value: `$${Number(monthRevenue.outstanding || 0).toLocaleString()}`, sub: 'Current' },
              { label: 'Forecast', value: `$${Number(monthRevenue.forecast || 0).toLocaleString()}`, sub: 'Estimate' },
            ],
          };
          const insertAt = 2; // after Active users
          base.splice(insertAt, 0, revenueCard);
        }

        return base;
      })()}
      miniStats={miniStats}
      snapshotTitle="Revenue pulse"
      snapshotSubtitle="Collections trend this week"
      upcomingTitle="Priority actions"
      upcomingItems={upcomingItems}
      areaChartTitle="Revenue & receivables"
      barChartTitle="Platform traffic"
      tableTitle="Priority items"
      activity={activity}
      tableBasePath="/tasks"
    />
  );
}
