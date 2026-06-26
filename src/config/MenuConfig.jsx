import DashboardIcon from '@mui/icons-material/Dashboard';
import StoreIcon from '@mui/icons-material/Store';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptIcon from '@mui/icons-material/Receipt';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EmailIcon from '@mui/icons-material/Email';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import HistoryIcon from '@mui/icons-material/History';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SearchIcon from '@mui/icons-material/Search';
import ContactPageIcon from '@mui/icons-material/ContactPage';
import PaymentsIcon from '@mui/icons-material/Payments';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

export const GET_MENU = (role) => {
  const menus = {
    Admin: [
      {
        category: 'CORE',
        items: [
          { title: 'Admin Overview', path: '/dashboard/admin', Icon: DashboardIcon },
          { title: 'Vendor Dashboard', path: '/dashboard/vendor', Icon: DashboardIcon },
          { title: 'Accounting Dashboard', path: '/dashboard/accounting', Icon: DashboardIcon },
          { title: 'Student Dashboard', path: '/dashboard/student', Icon: DashboardIcon },
        ],
      },
      {
        category: 'MANAGEMENT',
        items: [
          { title: 'Vendor Commission', path: '/vendors', Icon: StoreIcon },
          { title: 'Institute Commission', path: '/institutes', Icon: AccountBalanceIcon },
          { title: 'Institutes Scrapping', path: '/institutes-scrapping', Icon: TravelExploreIcon },
          { title: 'Student Payments', path: '/students', Icon: PeopleIcon },
          { title: 'Invoices', path: '/invoices', Icon: ReceiptIcon },
          { title: 'Reminder Rules', path: '/reminders', Icon: NotificationsActiveIcon },
          { title: 'Email Templates', path: '/templates', Icon: EmailIcon },
          { title: 'Users Management', path: '/users', Icon: ManageAccountsIcon },
          { title: 'Work History', path: '/work-history', Icon: HistoryIcon },
          { title: 'Tasks Management', path: '/tasks', Icon: AssignmentIcon },
          { title: 'Members', path: '/Members', Icon: PeopleIcon },
          { title: 'Employee Work Hours', path: '/EmployeeWorkHours', Icon: AssignmentIcon },
        ],
      },
      {
        category: 'STATUSES',
        items: [
          { title: 'Student Enrolment', path: '/status/students', Icon: FactCheckIcon },
          { title: 'Vendor Statuses', path: '/status/vendors', Icon: FactCheckIcon },
          { title: 'Institute Statuses', path: '/status/institutes', Icon: FactCheckIcon },
        ],
      },
      {
        category: 'REPORTS',
        items: [
          { title: 'AI Scraping Jobs', path: '/reports/ai-scraping', Icon: SmartToyIcon },
          { title: 'Anticipated Receivables', path: '/reports/receivables', Icon: PaymentsIcon },
          { title: 'Payment Received', path: '/reports/received', Icon: AutoGraphIcon },
          { title: 'Payment Dues', path: '/reports/dues', Icon: AutoGraphIcon },
          { title: 'Work Hours', path: '/reports/work-hours', Icon: HistoryIcon },
        ],
      },
      {
        category: 'ADMIN TOOLS',
        items: [{ title: 'AI Scraping Tool', path: '/ai-tool', Icon: SmartToyIcon }],
      },
    ],

    Accounting: [
      {
        category: 'CORE',
        items: [
          { title: 'Admin Overview', path: '/dashboard/admin', Icon: DashboardIcon },
          { title: 'Accounting Dashboard', path: '/dashboard/accounting', Icon: DashboardIcon },
        ],
      },
      {
        category: 'FINANCE',
        items: [
          { title: 'Student Payments', path: '/students', Icon: PeopleIcon },
          { title: 'Invoices', path: '/invoices', Icon: ReceiptIcon },
          { title: 'Reminder Rules', path: '/reminders', Icon: NotificationsActiveIcon },
          { title: 'Work History (View)', path: '/work-history', Icon: HistoryIcon },
          { title: 'Tasks Management', path: '/tasks', Icon: AssignmentIcon },
        ],
      },
      {
        category: 'REPORTS',
        items: [
          { title: 'Anticipated Receivables', path: '/reports/receivables', Icon: PaymentsIcon },
          { title: 'Payment Received', path: '/reports/received', Icon: AutoGraphIcon },
          { title: 'Payment Dues', path: '/reports/dues', Icon: AutoGraphIcon },
        ],
      },
    ],

    Consultant: [
      {
        category: 'CORE',
        items: [
          { title: 'Admin Overview', path: '/dashboard/admin', Icon: DashboardIcon },
          { title: 'Vendor Dashboard', path: '/dashboard/vendor', Icon: DashboardIcon },
          { title: 'Student Dashboard', path: '/dashboard/student', Icon: DashboardIcon },
        ],
      },
      {
        category: 'MANAGEMENT',
        items: [
          { title: 'Vendors (P)', path: '/vendors', Icon: StoreIcon },
          { title: 'Institutes (P)', path: '/institutes', Icon: AccountBalanceIcon },
          { title: 'Student Payments', path: '/students', Icon: PeopleIcon },
          { title: 'Work History (P)', path: '/work-history', Icon: HistoryIcon },
          { title: 'Tasks Management', path: '/tasks', Icon: AssignmentIcon },
        ],
      },
      {
        category: 'STATUSES',
        items: [
          { title: 'Student Enrolment', path: '/status/students', Icon: FactCheckIcon },
          { title: 'Vendor Statuses', path: '/status/vendors', Icon: FactCheckIcon },
          { title: 'Institute Statuses', path: '/status/institutes', Icon: FactCheckIcon },
        ],
      },
    ],

    Vendor: [
      {
        category: 'CORE',
        items: [
          { title: 'Vendor Dashboard', path: '/dashboard/vendor', Icon: DashboardIcon },
          { title: 'Student Dashboard', path: '/dashboard/student', Icon: DashboardIcon },
        ],
      },
      {
        category: 'VENDOR PORTAL',
        items: [
          { title: 'My Portal (Data)', path: '/vendor-portal', Icon: ContactPageIcon },
          { title: 'My Commission', path: '/vendors', Icon: StoreIcon },
          { title: 'Search Institutes', path: '/institutes', Icon: SearchIcon },
        ],
      },
    ],
  };

  return menus[role] || [];
};
