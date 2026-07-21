import StoreIcon from '@mui/icons-material/Store';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaymentsIcon from '@mui/icons-material/Payments';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ContactPageIcon from '@mui/icons-material/ContactPage';

const sampleRows = (prefix, count = 4) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    name: `${prefix} Record ${index + 1}`,
    status: index % 2 === 0 ? 'Active' : 'Pending',
    updated: `Jun ${10 + index}, 2026`,
  }));

export const PAGE_CONFIG = {
  '/vendors': {
    title: 'Vendor Commission',
    subtitle: 'Manage vendor commission rates, payouts, and performance.',
    actionLabel: 'Add Vendor',
    showCharts: false,
    stats: [],
    columns: [
      { id: 'name', label: 'Vendor', field: 'name' },
      { id: 'status', label: 'Status', field: 'status' },
      { id: 'updated', label: 'Last updated', field: 'updated' },
    ],
    rows: sampleRows('Vendor'),
  },
  '/institutes': {
    title: 'Institute Commission',
    //subtitle: 'Track institute partnerships, commission tiers, and agreements.',
    actionLabel: 'Add Institute',
  
    columns: [
      { id: 'name', label: 'Institute', field: 'name' },
      { id: 'status', label: 'Status', field: 'status' },
      { id: 'updated', label: 'Last updated', field: 'updated' },
    ],
    rows: sampleRows('Institute'),
  },
  '/students': {
    title: 'Student Payments',
    subtitle: 'Monitor enrolments, payment schedules, and outstanding balances.',
    actionLabel: 'Add Payment',
    stats: [
      { label: 'Active students', value: '312', caption: '18 new this month', icon: <PeopleIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Collected', value: '$214k', caption: 'This quarter', icon: <PaymentsIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'Outstanding', value: '$31k', caption: 'Across 24 students', icon: <ReceiptIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Overdue', value: '7', caption: 'Reminder sent', icon: <FactCheckIcon fontSize="large" />, color: 'var(--accent)' },
    ],
    columns: [
      { id: 'name', label: 'Student', field: 'name' },
      { id: 'status', label: 'Payment status', field: 'status' },
      { id: 'updated', label: 'Last activity', field: 'updated' },
    ],
    rows: sampleRows('Student'),
  },
  '/courses': {
  title: 'Courses',
  subtitle: 'Manage courses offered across institutes.',
  actionLabel: 'Add Course',
  showCharts: false,
  stats: [],
  rows: [],
},

  '/invoices': {
    title: 'Invoices',
    //subtitle: 'Create, review, and track invoices across vendors and students.',
    actionLabel: 'Create Invoice',
    // stats: [
    //   { label: 'Open invoices', value: '56', caption: '12 due this week', icon: <ReceiptIcon fontSize="large" />, color: 'var(--primary)' },
    //   { label: 'Paid', value: '$142k', caption: 'Last 30 days', icon: <PaymentsIcon fontSize="large" />, color: 'var(--teal)' },
    //   { label: 'Drafts', value: '8', caption: 'Awaiting approval', icon: <AssignmentIcon fontSize="large" />, color: 'var(--amber)' },
    //   { label: 'Overdue', value: '9', caption: 'Escalated', icon: <FactCheckIcon fontSize="large" />, color: 'var(--accent)' },
    // ],
    columns: [
      { id: 'name', label: 'Invoice', field: 'name' },
      { id: 'status', label: 'Status', field: 'status' },
      { id: 'updated', label: 'Updated', field: 'updated' },
    ],
    rows: sampleRows('Invoice'),
  },
  '/reminders': {
    title: 'Reminder Rules',
   // subtitle: 'Configure automated payment and follow-up reminder workflows.',
    actionLabel: 'Add Rule',
    showCharts: false,
    // stats: [
    //   { label: 'Active rules', value: '14', caption: '3 payment due rules', icon: <AssignmentIcon fontSize="large" />, color: 'var(--primary)' },
    //   { label: 'Sent today', value: '38', caption: 'Email + SMS', icon: <ReceiptIcon fontSize="large" />, color: 'var(--teal)' },
    //   { label: 'Paused', value: '2', caption: 'Under review', icon: <FactCheckIcon fontSize="large" />, color: 'var(--amber)' },
    //   { label: 'Failed', value: '1', caption: 'Retry scheduled', icon: <PaymentsIcon fontSize="large" />, color: 'var(--accent)' },
    // ],
    columns: [
      { id: 'name', label: 'Rule', field: 'name' },
      { id: 'status', label: 'Status', field: 'status' },
      { id: 'updated', label: 'Last run', field: 'updated' },
    ],
    rows: sampleRows('Reminder'),
  },
  '/templates': {
    title: 'Email Templates',
    //subtitle: 'Manage branded email templates for reminders and notifications.',
    actionLabel: 'New Template',
    // stats: [
    //   { label: 'Templates', value: '22', caption: '6 payment related', icon: <ReceiptIcon fontSize="large" />, color: 'var(--primary)' },
    //   { label: 'Published', value: '18', caption: 'In production use', icon: <FactCheckIcon fontSize="large" />, color: 'var(--teal)' },
    //   { label: 'Drafts', value: '4', caption: 'Awaiting review', icon: <AssignmentIcon fontSize="large" />, color: 'var(--amber)' },
    //   { label: 'Last edited', value: 'Today', caption: 'Payment reminder v3', icon: <PaymentsIcon fontSize="large" />, color: 'var(--accent)' },
    // ],
    columns: [
      { id: 'name', label: 'Template', field: 'name' },
      { id: 'status', label: 'Status', field: 'status' },
      { id: 'updated', label: 'Updated', field: 'updated' },
    ],
    rows: sampleRows('Template'),
  },
  '/users': {
    title: 'Users Management',
    subtitle: 'Assign roles, manage access, and audit user activity.',
    actionLabel: 'Invite User',
    stats: [
      { label: 'Total users', value: '64', caption: '4 roles active', icon: <PeopleIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Admins', value: '6', caption: 'Full access', icon: <FactCheckIcon fontSize="large" />, color: 'var(--accent)' },
      { label: 'Consultants', value: '18', caption: 'Partial permissions', icon: <AssignmentIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'Pending invites', value: '3', caption: 'Awaiting acceptance', icon: <ReceiptIcon fontSize="large" />, color: 'var(--amber)' },
    ],
    columns: [
      { id: 'name', label: 'User', field: 'name' },
      { id: 'status', label: 'Status', field: 'status' },
      { id: 'updated', label: 'Last login', field: 'updated' },
    ],
    rows: sampleRows('User'),
  },
  '/work-history': {
    title: 'Work History',
    subtitle: 'Review consultant activity logs, hours, and completed actions.',
    actionLabel: 'Export Log',
    stats: [
      { label: 'Entries this week', value: '128', caption: 'Across all teams', icon: <AssignmentIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Hours logged', value: '412', caption: 'Billable + internal', icon: <PaymentsIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'Pending review', value: '6', caption: 'Needs approval', icon: <FactCheckIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Top contributor', value: 'Mark C.', caption: 'Consultant', icon: <PeopleIcon fontSize="large" />, color: 'var(--accent)' },
    ],
    columns: [
      { id: 'name', label: 'Activity', field: 'name' },
      { id: 'status', label: 'Type', field: 'status' },
      { id: 'updated', label: 'Timestamp', field: 'updated' },
    ],
    rows: sampleRows('Work log'),
  },
  '/tasks': {
    title: 'Tasks Management',
    subtitle: 'Assign, track, and complete operational tasks across teams.',
    actionLabel: 'Create Task',
    stats: [
      { label: 'Open tasks', value: '37', caption: '11 high priority', icon: <AssignmentIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Completed', value: '84', caption: 'This month', icon: <FactCheckIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'Overdue', value: '5', caption: 'Escalated', icon: <ReceiptIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Assigned to me', value: '9', caption: 'Due soon', icon: <PeopleIcon fontSize="large" />, color: 'var(--accent)' },
    ],
    columns: [
      { id: 'name', label: 'Task', field: 'name' },
      { id: 'status', label: 'Priority', field: 'status' },
      { id: 'updated', label: 'Due', field: 'updated' },
    ],
    rows: sampleRows('Task'),
  },
  '/status/students': {
    title: 'Student Enrolment Status',
    subtitle: 'Track enrolment pipeline stages and outstanding documentation.',
    actionLabel: 'Update Status',
    stats: [
      { label: 'In pipeline', value: '46', caption: '12 awaiting docs', icon: <PeopleIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Enrolled', value: '312', caption: 'Active students', icon: <FactCheckIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'On hold', value: '8', caption: 'Follow-up required', icon: <AssignmentIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Rejected', value: '3', caption: 'This quarter', icon: <ReceiptIcon fontSize="large" />, color: 'var(--accent)' },
    ],
    columns: [
      { id: 'name', label: 'Student', field: 'name' },
      { id: 'status', label: 'Stage', field: 'status' },
      { id: 'updated', label: 'Updated', field: 'updated' },
    ],
    rows: sampleRows('Enrolment'),
  },
  '/status/vendors': {
    title: 'Vendor Statuses',
    subtitle: 'Monitor vendor onboarding, compliance, and account health.',
    actionLabel: 'Update Status',
    stats: [
      { label: 'Active', value: '42', caption: 'Fully onboarded', icon: <StoreIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'Onboarding', value: '5', caption: 'Documentation pending', icon: <AssignmentIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Suspended', value: '1', caption: 'Compliance issue', icon: <FactCheckIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Review due', value: '4', caption: 'Annual check', icon: <ReceiptIcon fontSize="large" />, color: 'var(--accent)' },
    ],
    columns: [
      { id: 'name', label: 'Vendor', field: 'name' },
      { id: 'status', label: 'Status', field: 'status' },
      { id: 'updated', label: 'Updated', field: 'updated' },
    ],
    rows: sampleRows('Vendor status'),
  },
  '/status/institutes': {
    title: 'Institute Statuses',
    subtitle: 'Track institute partnership lifecycle and agreement status.',
    actionLabel: 'Update Status',
    stats: [
      { label: 'Active partners', value: '28', caption: 'Contract valid', icon: <StoreIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'Negotiating', value: '3', caption: 'In discussion', icon: <AssignmentIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Renewal due', value: '5', caption: 'Next 30 days', icon: <ReceiptIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Inactive', value: '1', caption: 'Archived', icon: <FactCheckIcon fontSize="large" />, color: 'var(--accent)' },
    ],
    columns: [
      { id: 'name', label: 'Institute', field: 'name' },
      { id: 'status', label: 'Status', field: 'status' },
      { id: 'updated', label: 'Updated', field: 'updated' },
    ],
    rows: sampleRows('Institute status'),
  },
  '/reports/ai-scraping': {
    title: 'AI Scraping Jobs',
    subtitle: 'Monitor scraping job runs, success rates, and data freshness.',
    actionLabel: 'Run Job',
    stats: [
      { label: 'Jobs today', value: '18', caption: '2 running now', icon: <SmartToyIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Success rate', value: '96%', caption: 'Last 7 days', icon: <FactCheckIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'Failed', value: '3', caption: 'Retry queued', icon: <AssignmentIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Records synced', value: '4.2k', caption: 'This week', icon: <ReceiptIcon fontSize="large" />, color: 'var(--accent)' },
    ],
    columns: [
      { id: 'name', label: 'Job', field: 'name' },
      { id: 'status', label: 'Result', field: 'status' },
      { id: 'updated', label: 'Run at', field: 'updated' },
    ],
    rows: sampleRows('Scrape job'),
  },
  '/reports/receivables': {
    title: 'Anticipated Receivables',
    subtitle: 'Forecast incoming payments and expected commission inflows.',
    actionLabel: 'Export Report',
    stats: [
      { label: 'Next 30 days', value: '$84k', caption: 'Projected inflow', icon: <PaymentsIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Next 90 days', value: '$241k', caption: 'Forecast', icon: <ReceiptIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'At risk', value: '$12k', caption: 'May slip', icon: <FactCheckIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Confirmed', value: '$52k', caption: 'Committed', icon: <AssignmentIcon fontSize="large" />, color: 'var(--accent)' },
    ],
    columns: [
      { id: 'name', label: 'Source', field: 'name' },
      { id: 'status', label: 'Confidence', field: 'status' },
      { id: 'updated', label: 'Expected', field: 'updated' },
    ],
    rows: sampleRows('Receivable'),
  },
  '/reports/received': {
    title: 'Payment Received',
    subtitle: 'Review confirmed payments and reconciliation status.',
    actionLabel: 'Export Report',
    stats: [
      { label: 'This month', value: '$128k', caption: 'Confirmed', icon: <PaymentsIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'Transactions', value: '214', caption: 'Settled', icon: <ReceiptIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Unmatched', value: '4', caption: 'Needs reconciliation', icon: <FactCheckIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Refunds', value: '$1.2k', caption: 'Processed', icon: <AssignmentIcon fontSize="large" />, color: 'var(--accent)' },
    ],
    columns: [
      { id: 'name', label: 'Payment', field: 'name' },
      { id: 'status', label: 'Status', field: 'status' },
      { id: 'updated', label: 'Received', field: 'updated' },
    ],
    rows: sampleRows('Payment'),
  },
  '/reports/dues': {
    title: 'Payment Dues',
    subtitle: 'Track overdue balances and upcoming due dates.',
    actionLabel: 'Send Reminder',
    stats: [
      { label: 'Total due', value: '$31k', caption: 'Outstanding', icon: <PaymentsIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Overdue', value: '$9k', caption: 'Past due date', icon: <FactCheckIcon fontSize="large" />, color: 'var(--accent)' },
      { label: 'Due this week', value: '$6k', caption: '7 accounts', icon: <ReceiptIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Reminders sent', value: '22', caption: 'Last 7 days', icon: <AssignmentIcon fontSize="large" />, color: 'var(--teal)' },
    ],
    columns: [
      { id: 'name', label: 'Account', field: 'name' },
      { id: 'status', label: 'Due status', field: 'status' },
      { id: 'updated', label: 'Due date', field: 'updated' },
    ],
    rows: sampleRows('Due account'),
  },
  '/reports/work-hours': {
    title: 'Work Hours Report',
    subtitle: 'Analyze logged hours by team, project, and billing category.',
    actionLabel: 'Export Report',
    stats: [
      { label: 'Hours this week', value: '412', caption: 'All teams', icon: <AssignmentIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Billable', value: '318', caption: '77% utilization', icon: <PaymentsIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'Non-billable', value: '94', caption: 'Internal work', icon: <ReceiptIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Top team', value: 'Finance', caption: '92 hours', icon: <PeopleIcon fontSize="large" />, color: 'var(--accent)' },
    ],
    columns: [
      { id: 'name', label: 'Team member', field: 'name' },
      { id: 'status', label: 'Category', field: 'status' },
      { id: 'updated', label: 'Period', field: 'updated' },
    ],
    rows: sampleRows('Hours'),
  },
  '/ai-tool': {
    title: 'AI Scraping Tool',
    subtitle: 'Launch and configure AI-assisted data scraping workflows.',
    actionLabel: 'Start Scrape',
    stats: [
      { label: 'Saved configs', value: '9', caption: 'Reusable templates', icon: <SmartToyIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Last run', value: '2h ago', caption: 'Institute directory', icon: <AssignmentIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'Queue', value: '1', caption: 'Scheduled tonight', icon: <ReceiptIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Data sources', value: '14', caption: 'Connected', icon: <FactCheckIcon fontSize="large" />, color: 'var(--accent)' },
    ],
    columns: [
      { id: 'name', label: 'Configuration', field: 'name' },
      { id: 'status', label: 'Status', field: 'status' },
      { id: 'updated', label: 'Last run', field: 'updated' },
    ],
    rows: sampleRows('Scrape config'),
  },
  '/vendor-portal': {
    title: 'Vendor Portal',
    subtitle: 'View your commission data, institute search, and account details.',
    actionLabel: 'Update Profile',
    stats: [
      { label: 'Commission YTD', value: '$24.6k', caption: 'Your earnings', icon: <PaymentsIcon fontSize="large" />, color: 'var(--teal)' },
      { label: 'Referrals', value: '38', caption: 'Active students', icon: <PeopleIcon fontSize="large" />, color: 'var(--primary)' },
      { label: 'Pending payout', value: '$3.1k', caption: 'Next cycle', icon: <ReceiptIcon fontSize="large" />, color: 'var(--amber)' },
      { label: 'Institutes', value: '12', caption: 'Partner matches', icon: <ContactPageIcon fontSize="large" />, color: 'var(--accent)' },
    ],
    columns: [
      { id: 'name', label: 'Record', field: 'name' },
      { id: 'status', label: 'Status', field: 'status' },
      { id: 'updated', label: 'Updated', field: 'updated' },
    ],
    rows: sampleRows('Portal item'),
  },
};
