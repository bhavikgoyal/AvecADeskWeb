import DashboardTemplate from './DashboardTemplate';
import StoreIcon from '@mui/icons-material/Store';
import PaymentsIcon from '@mui/icons-material/Payments';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { buildSparkline, enrollmentData } from '../../constants/chartData';

const kpiStats = [
  { label: 'Commission YTD', value: '$24.6k', trend: 12, sparklineData: buildSparkline(3), icon: <PaymentsIcon />, color: 'var(--teal)' },
  { label: 'Active referrals', value: '38', trend: 5, donutValue: 64, icon: <PeopleIcon />, color: 'var(--primary)' },
  { label: 'Partner institutes', value: '12', trend: 0, sparklineData: buildSparkline(2), icon: <SearchIcon />, color: 'var(--accent)' },
  { label: 'Pending payout', value: '$3.1k', trend: 4, sparklineData: buildSparkline(4), icon: <StoreIcon />, color: 'var(--warning)' },
];

const miniStats = [
  { icon: <PeopleIcon fontSize="small" />, title: '8 New referrals', subtitle: 'This month', path: '/students' },
  { icon: <PaymentsIcon fontSize="small" />, title: '$420 Pending', subtitle: 'Student A. Patel', color: 'var(--primary)', path: '/reports/receivables' },
  { icon: <TrendingUpIcon fontSize="small" />, title: '+12% Growth', subtitle: 'Vs last quarter', color: 'var(--success)', bg: 'rgba(47, 179, 68, 0.1)', path: '/vendor-portal' },
  { icon: <StoreIcon fontSize="small" />, title: 'Next payout', subtitle: 'Jun 15, 2026', color: 'var(--teal)', bg: 'rgba(32, 201, 151, 0.1)', path: '/reports/received' },
];

const activity = [
  { id: 'a1', title: 'Payout scheduled', description: 'Commission payout queued for next cycle.', time: '1h ago', avatar: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=200&q=80' },
  { id: 'a2', title: 'New referral', description: 'Student enrolment linked to your account.', time: 'Yesterday', initials: 'NR' },
];

const upcomingItems = [
  { id: 'v1', title: 'Pending payout', subtitle: '$420 for Student A. Patel', path: '/reports/received' },
  { id: 'v2', title: 'New referral', subtitle: '1 enrolment linked this week', path: '/students' },
  { id: 'v3', title: 'Profile update', subtitle: 'Refresh commission details', path: '/vendor-portal' },
];

export default function VendorDash() {
  return (
    <DashboardTemplate
      title="Vendor Dashboard"
      subtitle="Your commission performance, referrals, and institute partnerships."
      welcomeSubtitle="You have 2 pending payouts and 1 new referral this week."
      welcomeFooterStats={[
        { label: 'Commission YTD', value: '$24.6k', trend: 12 },
        { label: 'Conversion', value: '64%', trend: 5 },
      ]}
      kpiStats={kpiStats}
      miniStats={miniStats}
      snapshotTitle="Referral activity"
      snapshotSubtitle="Weekly commission trend"
      upcomingTitle="Vendor to-dos"
      upcomingItems={upcomingItems}
      areaChartTitle="Commission earnings"
      barChartData={enrollmentData}
      barChartKeys={['enrolled', 'pending']}
      barChartTitle="Weekly referrals"
      tableTitle="Vendor commission"
      tableBasePath="/vendors"
      activity={activity}
    />
  );
}
