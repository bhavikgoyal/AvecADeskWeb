import DashboardTemplate from './DashboardTemplate';
import PeopleIcon from '@mui/icons-material/People';
import PaymentsIcon from '@mui/icons-material/Payments';
import StoreIcon from '@mui/icons-material/Store';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EmailIcon from '@mui/icons-material/Email';
import { buildSparkline } from '../../constants/chartData';

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
    label: 'Revenue',
    value: '$214k',
    trend: 8,
    sparklineData: buildSparkline(4),
    icon: <PaymentsIcon />,
    color: 'var(--primary)',
    footer: [
      { label: 'Collected', value: '$186k', sub: 'This month' },
      { label: 'Outstanding', value: '$28k', sub: '12 invoices' },
      { label: 'Forecast', value: '$241k', sub: 'Q3 est.' },
    ],
  },
  {
    label: 'Open tasks',
    value: '37',
    trend: 4,
    sparklineData: buildSparkline(3),
    icon: <AssignmentIcon />,
    color: 'var(--warning)',
    footer: [
      { label: 'Due today', value: '8', sub: '3 urgent' },
      { label: 'Overdue', value: '2', color: 'var(--danger)' },
      { label: 'Completed', value: '124', sub: 'This week' },
    ],
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
  return (
    <DashboardTemplate
      title="Admin Overview"
      // subtitle="Full system overview across vendors, students, finance, and operations."
      // welcomeSubtitle="You have 5 new messages and 2 new notifications across the platform."
      welcomeFooterStats={[
        { label: "Today's collections", value: '$6,782', trend: 7 },
        { label: 'Growth rate', value: '78.4%', trend: -1 },
      ]}
      kpiStats={kpiStats}
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
