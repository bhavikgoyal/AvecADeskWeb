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
import DescriptionIcon from '@mui/icons-material/Description';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SchoolIcon from '@mui/icons-material/School';
  
export const GET_MENU = (role) => {
  const menus = {
    'Super Admin': [
      {
        category: 'CORE',
        items: [
          { title: 'DashBoard', path: '/dashboard/admin', Icon: DashboardIcon },
        ],
      },
      {
        category: 'INSTITUTE MANAGEMENT',
        items: [
          
          { title: 'Institutes', path: '/institutes-scrapping', Icon: TravelExploreIcon },
           { title: 'Courses', path: '/courses', Icon: SchoolIcon },
           { title: 'Vendors', path: '/vendors', Icon: StoreIcon },
            { title: 'Student Inquiry', path: '/reports/student-Inquiry', Icon: PeopleIcon },
        ],
      },
       {
        category: 'Tasks',
        items: [
            { title: 'Tasks', path: '/tasks', Icon: AssignmentIcon },
             { title: 'Teams Report', path: '/work-history', Icon: HistoryIcon },
        ],
      },
         {
        category: 'Accounting',
        items: [
           { title: 'Student Payments', path: '/students', Icon: PeopleIcon },
         { title: 'Invoices', path: '/invoices', Icon: ReceiptIcon },
        ],
      },
       {
        category: 'Settings',
        items: [
         { title: 'Reminder Rules', path: '/reminders', Icon: NotificationsActiveIcon },
         { title: 'Email Templates', path: '/templates', Icon: EmailIcon },
          { title: 'Agreement Template', path: '/agreement-template', Icon: DescriptionIcon },
           { title: 'Members', path: '/Members', Icon: PeopleIcon },
        ],
      },
      {
        items: [
        ],
      },
      {
        category: 'REPORTS',
        items: [
           { title: 'Employee Work Hours', path: '/EmployeeWorkHours', Icon: AssignmentIcon },
        ],
      },
     
    ],

    'Accounting': [
      {
        category: 'CORE',
        items: [
          { title: 'Accounting Dashboard', path: '/dashboard/accounting', Icon: DashboardIcon },
        ],
      },
      {
        category: 'TASKS',
        items: [
          { title: 'Tasks', path: '/tasks', Icon: AssignmentIcon },
        ],
      },
      {
        category: 'FINANCE',
        items: [
          { title: 'Institute Contracts', path: '/institute-contracts', Icon: AccountBalanceIcon, },
         { title: 'Courses', path: '/courses', Icon: SchoolIcon},
          { title: 'Invoices', path: '/invoices', Icon: ReceiptIcon },
          { title: 'Student Payments', path: '/students', Icon: PeopleIcon },    ],
      },
    ],

    'Admission': [
      {
        category: 'CORE',
        items: [
          { title: 'Admission Dashboard', path: '/dashboard/admission', Icon: DashboardIcon },
        ],
      },
      {
        category: 'MANAGEMENT',
        items: [
          { title: 'Vendors', path: '/vendors', Icon: StoreIcon },
          { title: 'Institutes', path: '/institutes-scrapping', Icon: TravelExploreIcon },
          { title: 'Courses', path: '/courses', Icon: SchoolIcon },
         
        ],
      },
      {
        category: 'REPORTS',
        items: [
              { title: 'Student Inquiry', path: '/reports/student-Inquiry', Icon: PeopleIcon },
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
