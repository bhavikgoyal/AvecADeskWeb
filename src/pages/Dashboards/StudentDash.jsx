import DashboardTemplate from './DashboardTemplate';
import PeopleIcon from '@mui/icons-material/People';
import PaymentsIcon from '@mui/icons-material/Payments';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SchoolIcon from '@mui/icons-material/School';
import DescriptionIcon from '@mui/icons-material/Description';
import { buildSparkline, enrollmentData } from '../../constants/chartData';

const kpiStats = [
  { label: 'Active students', value: '312', trend: 6, sparklineData: buildSparkline(2), icon: <PeopleIcon />, color: 'var(--primary)' },
  { label: 'Enrolment pipeline', value: '46', trend: 3, donutValue: 72, icon: <AssignmentIcon />, color: 'var(--warning)' },
  { label: 'Payments on track', value: '89%', trend: 2, sparklineData: buildSparkline(3), icon: <PaymentsIcon />, color: 'var(--teal)' },
  { label: 'Status updates', value: '14', trend: 8, sparklineData: buildSparkline(5), icon: <FactCheckIcon />, color: 'var(--success)' },
];

const miniStats = [
  { icon: <SchoolIcon fontSize="small" />, title: '18 New enrolments', subtitle: 'This month', path: '/students' },
  { icon: <DescriptionIcon fontSize="small" />, title: '12 Awaiting docs', subtitle: 'Follow-up needed', color: 'var(--warning)', bg: 'rgba(245, 159, 0, 0.1)', path: '/status/students' },
  { icon: <PaymentsIcon fontSize="small" />, title: '7 Overdue', subtitle: 'Payment reminders sent', color: 'var(--danger)', bg: 'rgba(214, 57, 57, 0.08)', path: '/invoices' },
  { icon: <FactCheckIcon fontSize="small" />, title: '89% On track', subtitle: 'Current term payments', color: 'var(--success)', bg: 'rgba(47, 179, 68, 0.1)', path: '/reports/received' },
];

const activity = [
  { id: 'a1', title: 'Enrolment approved', description: 'Aisha Patel moved to enrolled status.', time: '30m ago', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' },
  { id: 'a2', title: 'Document uploaded', description: 'Rohan Singh submitted visa documents.', time: '4h ago', initials: 'RS' },
];

const upcomingItems = [
  { id: 's1', title: 'Document review', subtitle: '12 students awaiting uploads', path: '/status/students' },
  { id: 's2', title: 'Payment reminders', subtitle: '7 overdue invoices to chase', path: '/invoices' },
  { id: 's3', title: 'Interview schedule', subtitle: '4 candidates this week', path: '/tasks' },
];

export default function StudentDash() {
  return (
    <DashboardTemplate
      title="Student Dashboard"
      subtitle="Student enrolment pipeline, payments, and status tracking."
      welcomeSubtitle="You have 12 students awaiting documentation and 7 overdue payments."
      welcomeFooterStats={[
        { label: 'Enrolled today', value: '6', trend: 4 },
        { label: 'Pipeline health', value: '72%', trend: 3 },
      ]}
      kpiStats={kpiStats}
      miniStats={miniStats}
      snapshotTitle="Enrolment momentum"
      snapshotSubtitle="New enrolments over the last 7 days"
      upcomingTitle="Student follow-ups"
      upcomingItems={upcomingItems}
      areaChartTitle="Enrolment trends"
      barChartData={enrollmentData}
      barChartKeys={['enrolled', 'pending']}
      barChartTitle="Weekly enrolments"
      tableTitle="Students needing attention"
      activity={activity}
      tableBasePath="/students"
    />
  );
}
