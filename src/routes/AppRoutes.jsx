import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import RouteFallback from '../components/RouteFallback';
import { RequireAuth, RequireRole } from '../components/ProtectedRoute';
import { RESOURCE_PATHS } from '../config/resourceConfig';
import { useAuth } from '../hooks/useAuth';
import { getDefaultRoute } from '../utils/rbac';
import { isSeedRecordId } from '../utils/recordId';
import { getAuthToken } from '../api/axiosClient';

const API_DETAIL_PATHS = new Set(['/students', '/institutes', '/vendors', '/courses']);

const LoginForm = lazy(() => import('../pages/Login/LoginForm'));
const OtpLoginForm = lazy(() => import('../pages/Login/OtpLoginForm'));
const RegisterForm = lazy(() => import('../pages/Login/RegisterForm'));
const StudentLoginForm = lazy(() => import('../pages/Login/StudentLoginForm'));
const UserPortal = lazy(() => import('../pages/UserPortal/UserPortal'));
const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const AdminDash = lazy(() => import('../pages/Dashboards/AdminDash'));
const AccDash = lazy(() => import('../pages/Dashboards/AccDash'));
const VendorDash = lazy(() => import('../pages/Dashboards/VendorDash'));
const StudentDash = lazy(() => import('../pages/Dashboards/StudentDash'));
const AdmissionDash = lazy(() => import('../pages/Dashboards/AdmissionDash'));
const ResourceListPage = lazy(() => import('../pages/resources/ResourceListPage'));
const NewResourcePage = lazy(() => import('../pages/resources/NewResourcePage'));
const NewStudentPage = lazy(() => import('../pages/resources/NewStudentPage'));
const NewInstitutePage = lazy(() => import('../pages/resources/NewInstitutePage'));
const InstituteDetailPage = lazy(() => import('../pages/resources/InstituteDetailPage'));
const InstituteCommissionPage = lazy( () => import('../pages/resources/InstituteCommissionPage'));
const NewVendorPage = lazy(() => import('../pages/resources/NewVendorPage'));
const VendorDetailPage = lazy(() => import('../pages/resources/VendorDetailPage'));
const NewEnrolmentPage = lazy(() => import('../pages/resources/NewEnrolmentPage'));
const EnrolmentDetailPage = lazy(() => import('../pages/resources/EnrolmentDetailPage'));
const StudentDetailPage = lazy(() => import('../pages/resources/StudentDetailPage'));
const ResourceDetailPage = lazy(() => import('../pages/resources/ResourceDetailPage'));
const BoardPage = lazy(() => import('../pages/BoardPage'));
const MembersContent = lazy(() => import('../components/Member/MembersContent'));
const MembersCreate = lazy(() => import('../components/Member/MembersCreate'));
const MembersEdit = lazy(() => import('../components/Member/MembersEdit'));
const EmployeeWorkHours = lazy(() => import('../components/EmployeeWorkHours/EmployeeWorkHours'));
const InstituteScrappingPage = lazy(() => import('../pages/resources/InstituteScrappingPage'));
const InstituteScrappingEditPage = lazy(() => import('../pages/resources/InstituteScrappingEditPage'));
const WorkHistoryPage = lazy(() => import('../components/workHistory/WorkHistoryPage'));
const WorkHistoryDetailPage = lazy(() => import('../components/workHistory/ViewActivityHistoryPage'));
const ReceivablesPage = lazy(() => import('../pages/resources/ReceivablesPage'));
const ManageAccountPage = lazy(() => import('../pages/account/ManageAccountPage'));
const PaymentSchedulesPage = lazy(() => import('../pages/resources/PaymentSchedulesPage'));
const StudentApplicationDetailsPage = lazy(() => import('../pages/resources/StudentApplicationDetails'));
const AgreementTemplate = lazy(() => import('../pages/AgreementTemplate/AgreementTemplate'));
const AgreementTemplateForm = lazy(() => import('../pages/AgreementTemplate/AgreementTemplateForm'));
const AgreementTemplateView = lazy(() => import('../pages/AgreementTemplate/AgreementTemplateView'));
const NewCoursePage = lazy(() => import('../pages/resources/NewCoursePage'));
// const CourseDetailPage = lazy(() => import('../pages/resources/CourseDetailPage'));
// const LIST_RESOURCE_PATHS = RESOURCE_PATHS.filter((path) => path !== 'institutes-scrapping');

const LIST_RESOURCE_PATHS = RESOURCE_PATHS.filter((path) =>
  path !== 'institutes-scrapping' &&
  path !== 'work-history'&&
  path !== 'reports/receivables'
  
);

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const defaultRoute = getDefaultRoute(user.role);
  if (defaultRoute === '/login') {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={defaultRoute} replace />;
}

function LoginRoute() {
  const { user, logout } = useAuth();
  const token = getAuthToken();
  const defaultRoute = user?.role ? getDefaultRoute(user.role) : '/login';
  const hasValidSession = Boolean(user && token && user.role && defaultRoute !== '/login');

  useEffect(() => {
    if (user && token && !hasValidSession) {
      logout();
    }
  }, [user, token, hasValidSession, logout]);

  if (hasValidSession) {
    return <Navigate to={defaultRoute} replace />;
  }

  return <LoginForm />;
}
function StudentLoginRoute() {
  const { user, logout } = useAuth();
  const token = getAuthToken();
  const isStudent = user?.role === 'Student';
  const hasValidSession = Boolean(user && token && isStudent);

  useEffect(() => {
    if (user && token && !hasValidSession) {
      logout();
    }
  }, [user, token, hasValidSession, logout]);

  if (hasValidSession) {
    return <Navigate to="/dashboard/student" replace />;
  }

  return <StudentLoginForm />;
}
function GuardedDashboard({ path, element }) {
  return <RequireRole path={path}>{element}</RequireRole>;
}

function GuardedResourceList({ path }) {
  return (
    <RequireRole path={path}>
      <ResourceListPage basePath={path} />
    </RequireRole>
  );
}

function GuardedNewResource({ path }) {
  if (path === '/students') {
    return (
      <RequireRole path={path}>
        <NewStudentPage basePath={path} />
      </RequireRole>
    );
  }

  if (path === '/institutes') {
    return (
      <RequireRole path={path}>
        <NewInstitutePage basePath={path} />
      </RequireRole>
    );
  }

  if (path === '/vendors') {
    return (
      <RequireRole path={path}>
        <NewVendorPage basePath={path} />
      </RequireRole>
    );
  }
  if (path === '/courses') {              
    return (
      <RequireRole path={path}>
        <NewCoursePage basePath={path} />
      </RequireRole>
    );
  }
  if (path === '/status/students') {
    return (
      <RequireRole path={path}>
        <NewEnrolmentPage basePath={path} />
      </RequireRole>
    );
  }

  return (
    <RequireRole path={path}>
      <NewResourcePage basePath={path} />
    </RequireRole>
  );
}

function GuardedResourceDetail({ path }) {
  const { id } = useParams();

  if (API_DETAIL_PATHS.has(path) && isSeedRecordId(id)) {
    return (
      <RequireRole path={path}>
        <ResourceDetailPage basePath={path} />
      </RequireRole>
    );
  }

  if (path === '/students') {
    return (
      <RequireRole path={path}>
        <StudentDetailPage basePath={path} />
      </RequireRole>
    );
  }

  if (path === '/institutes') {
    return (
      <RequireRole path={path}>
        <InstituteDetailPage basePath={path} />
      </RequireRole>
    );
  }

  if (path === '/vendors') {
    return (
      <RequireRole path={path}>
        <VendorDetailPage basePath={path} />
      </RequireRole>
    );
  }

  if (path === '/status/students') {
    return (
      <RequireRole path={path}>
        <EnrolmentDetailPage basePath={path} />
      </RequireRole>
    );
  }
 if (path === '/courses') {            
    return (
      <RequireRole path={path}>
        <NewCoursePage  basePath={path} />
      </RequireRole>
    );
  }
  return (
    <RequireRole path={path}>
      <ResourceDetailPage basePath={path} />
    </RequireRole>
  );
}

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route path="/user-portal" element={<UserPortal />} />

        <Route path="/phone-verified" element={<OtpLoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
       <Route path="/student-login" element={<StudentLoginRoute />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<RoleRedirect />} />

          <Route path="dashboard/admin" element={<GuardedDashboard path="/dashboard/admin" element={<AdminDash />} />} />
          <Route path="dashboard/accounting" element={<GuardedDashboard path="/dashboard/accounting" element={<AccDash />} />} />
          <Route path="dashboard/admission" element={<GuardedDashboard path="/dashboard/admission" element={<AdmissionDash />} />} />
          <Route path="dashboard/vendor" element={<GuardedDashboard path="/dashboard/vendor" element={<VendorDash />} />} />
          <Route path="dashboard/student" element={<GuardedDashboard path="/dashboard/student" element={<StudentDash />} />} />
          <Route path="work-history" element={<RequireRole path="/work-history"> <WorkHistoryPage /> </RequireRole>} />
          <Route path="work-history/:id" element={<RequireRole path="/work-history"> <WorkHistoryDetailPage /> </RequireRole>
          }
          />
          <Route
            path="tasks"
            element={
              <RequireRole path="/tasks">
                <BoardPage />
              </RequireRole>
            }
          />
         <Route
            path="students"
            element={
              <RequireRole path="/students">
                <PaymentSchedulesPage />
              </RequireRole>
            }
          />
          <Route
            path="institutes-scrapping"
            element={
              <RequireRole path="/institutes-scrapping">
                <InstituteScrappingPage />
              </RequireRole>
            }
          />
          <Route
            path="institutes-scrapping/:id"
            element={
              <RequireRole path="/institutes-scrapping">
                <InstituteScrappingEditPage />
              </RequireRole>
            }
          />
          <Route
            path="reports/receivables"
            element={
              <RequireRole path="/reports/receivables">
                <ReceivablesPage />
              </RequireRole>
            }
          />
          <Route
            path="reports/student-Inquiry"
            element={
              <RequireRole path="/reports/student-Inquiry">
                <StudentApplicationDetailsPage />
              </RequireRole>
            }
          />
          <Route  path="institute-commission" element={ 
            <RequireRole path="/institute-commission"> <InstituteCommissionPage /> </RequireRole> }/>
          {LIST_RESOURCE_PATHS.map((path) => (
            <Route key={`${path}-new`} path={`${path}/new`} element={<GuardedNewResource path={`/${path}`} />}
            />
          ))}
          {LIST_RESOURCE_PATHS.map((path) => (
            <Route key={`${path}-detail`} path={`${path}/:id`} element={<GuardedResourceDetail path={`/${path}`} />}
            />
          ))}
          {LIST_RESOURCE_PATHS.map((path) => (
            <Route key={path} path={path} element={<GuardedResourceList path={`/${path}`} />} />
          ))}

          <Route path="Members" element={<MembersContent />} />
          <Route path="Members/Create" element={<MembersCreate />} />
          <Route path="Members/Edit/:id" element={<MembersEdit />} />
          <Route path="account" element={<ManageAccountPage />} />
          <Route path="*" element={<RoleRedirect />} />
          <Route path="EmployeeWorkHours" element={<EmployeeWorkHours />} />
          <Route path="EmployeeWorkHours" element={<EmployeeWorkHours />} />
          <Route path="EmployeeWorkHours" element={<EmployeeWorkHours />} />
          <Route path="agreement-template" element={<AgreementTemplate />} />
          <Route path="agreement-template/new" element={<AgreementTemplateForm />} />
          <Route path="agreement-template/:id/view" element={<AgreementTemplateView />} />
          <Route path="agreement-template/:id/edit" element={<AgreementTemplateForm />} />
          
         
        </Route>

        <Route path="*" element={<Navigate to={user ? getDefaultRoute(user.role) : '/login'} replace />} />
      </Routes>
    </Suspense>
  );
}
