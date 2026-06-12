import DashboardTemplate from './DashboardTemplate';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentsIcon from '@mui/icons-material/Payments';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { buildSparkline } from '../../constants/chartData';

const kpiStats = [
  { label: 'Open invoices', value: '56', trend: 3, sparklineData: buildSparkline(2), icon: <ReceiptIcon />, color: 'var(--primary)' },
  { label: 'Collected', value: '$142k', trend: 8, donutValue: 92, icon: <PaymentsIcon />, color: 'var(--teal)' },
  { label: 'Outstanding', value: '$31k', trend: -2, sparklineData: buildSparkline(5), icon: <AssignmentIcon />, color: 'var(--warning)' },
  { label: 'Reconciled', value: '98%', trend: 1, sparklineData: buildSparkline(1), icon: <FactCheckIcon />, color: 'var(--success)' },
];

const miniStats = [
  { icon: <ReceiptIcon fontSize="small" />, title: '12 Due this week', subtitle: 'Invoice follow-ups', path: '/invoices' },
  { icon: <PaymentsIcon fontSize="small" />, title: '$9k Overdue', subtitle: 'Needs escalation', color: 'var(--danger)', bg: 'rgba(214, 57, 57, 0.08)', path: '/reports/dues' },
  { icon: <AccountBalanceIcon fontSize="small" />, title: '214 Settled', subtitle: 'This month', color: 'var(--teal)', bg: 'rgba(32, 201, 151, 0.1)', path: '/reports/received' },
  { icon: <FactCheckIcon fontSize="small" />, title: '4 Unmatched', subtitle: 'Bank reconciliation', color: 'var(--warning)', bg: 'rgba(245, 159, 0, 0.1)', path: '/reports/receivables' },
];

const activity = [
  { id: 'a1', title: 'Reminder sent', description: 'Payment due reminder for INV-2035.', time: '20m ago', initials: 'RS' },
  { id: 'a2', title: 'Payment matched', description: 'Bank deposit matched to INV-2041.', time: '2h ago', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
];

const upcomingItems = [
  { id: 'c1', title: 'Invoice due', subtitle: 'INV-2038 due tomorrow', path: '/invoices' },
  { id: 'c2', title: 'Overdue escalation', subtitle: 'INV-2035 needs follow-up', path: '/reports/dues' },
  { id: 'c3', title: 'Bank reconciliation', subtitle: '4 unmatched deposits', path: '/reports/received' },
];

export default function AccDash() {
  return (
    <DashboardTemplate
      title="Accounting Dashboard"
      subtitle="Finance overview for invoices, receivables, and payment tracking."
      welcomeSubtitle="You have 3 invoices due this week and 1 reconciliation pending."
      welcomeFooterStats={[
        { label: 'Collected today', value: '$4,300', trend: 8 },
        { label: 'Outstanding', value: '$31k', trend: -2 },
      ]}
      kpiStats={kpiStats}
      miniStats={miniStats}
      snapshotTitle="Collection velocity"
      snapshotSubtitle="Payments received this week"
      upcomingTitle="Finance follow-ups"
      upcomingItems={upcomingItems}
      areaChartTitle="Payment collections"
      barChartTitle="Invoice activity"
      tableTitle="Invoices due soon"
      activity={activity}
      tableBasePath="/invoices"
    />
  );
}
