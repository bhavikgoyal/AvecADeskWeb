import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import RouteFallback from '../components/RouteFallback';
import { RequireAuth, RequireRole } from '../components/ProtectedRoute';
import { RESOURCE_PATHS } from '../config/resourceConfig';
import { useAuth } from '../hooks/useAuth';
import { getDefaultRoute } from '../utils/rbac';

const LoginForm = lazy(() => import('../pages/Login/LoginForm'));
const OtpLoginForm = lazy(() => import('../pages/Login/OtpLoginForm'));
const UserPortal = lazy(() => import('../pages/UserPortal/UserPortal'));
const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const AdminDash = lazy(() => import('../pages/Dashboards/AdminDash'));
const AccDash = lazy(() => import('../pages/Dashboards/AccDash'));
const VendorDash = lazy(() => import('../pages/Dashboards/VendorDash'));
const StudentDash = lazy(() => import('../pages/Dashboards/StudentDash'));
const ResourceListPage = lazy(() => import('../pages/resources/ResourceListPage'));
const NewResourcePage = lazy(() => import('../pages/resources/NewResourcePage'));
const NewStudentPage = lazy(() => import('../pages/resources/NewStudentPage'));
const NewInstitutePage = lazy(() => import('../pages/resources/NewInstitutePage'));
const InstituteDetailPage = lazy(() => import('../pages/resources/InstituteDetailPage'));
const NewVendorPage = lazy(() => import('../pages/resources/NewVendorPage'));
const VendorDetailPage = lazy(() => import('../pages/resources/VendorDetailPage'));
const NewEnrolmentPage = lazy(() => import('../pages/resources/NewEnrolmentPage'));
const EnrolmentDetailPage = lazy(() => import('../pages/resources/EnrolmentDetailPage'));
const StudentDetailPage = lazy(() => import('../pages/resources/StudentDetailPage'));
const ResourceDetailPage = lazy(() => import('../pages/resources/ResourceDetailPage'));
const MembersContent = lazy(() => import('../components/Member/MembersContent'));
const MembersCreate = lazy(() => import('../components/Member/MembersCreate'));
const MembersEdit = lazy(() => import('../components/Member/MembersEdit'));
const InstituteScrappingPage = lazy(() => import('../pages/resources/InstituteScrappingPage'));
const WorkHistoryPage = lazy(() => import('../components/workHistory/WorkHistoryPage'));
const WorkHistoryDetailPage = lazy(() => import('../components/workHistory/ViewActivityHistoryPage'));

// const LIST_RESOURCE_PATHS = RESOURCE_PATHS.filter((path) => path !== 'institutes-scrapping');

const LIST_RESOURCE_PATHS = RESOURCE_PATHS.filter((path) =>
  path !== 'institutes-scrapping' &&
  path !== 'work-history'
);

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={getDefaultRoute(user.role)} replace />;
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
        <Route
          path="/login"
          element={user ? <Navigate to={getDefaultRoute(user.role)} replace /> : <LoginForm />}
        />

        <Route path="/user-portal" element={<UserPortal />} />

        <Route path="/phone-verified" element={<OtpLoginForm />} />

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
          <Route path="dashboard/vendor" element={<GuardedDashboard path="/dashboard/vendor" element={<VendorDash />} />} />
          <Route path="dashboard/student" element={<GuardedDashboard path="/dashboard/student" element={<StudentDash />} />} />
          <Route path="work-history" element={<RequireRole path="/work-history"> <WorkHistoryPage /> </RequireRole>} />
          <Route path="work-history/:id" element={<RequireRole path="/work-history"> <WorkHistoryDetailPage /> </RequireRole>
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

          {LIST_RESOURCE_PATHS.map((path) => (
            <Route key={`${path}-new`} path={`${path}/new`} element={<GuardedNewResource path={`/${path}`} />} />
          ))}
          {LIST_RESOURCE_PATHS.map((path) => (
            <Route key={`${path}-detail`} path={`${path}/:id`} element={<GuardedResourceDetail path={`/${path}`} />} />
          ))}
          {LIST_RESOURCE_PATHS.map((path) => (
            <Route key={path} path={path} element={<GuardedResourceList path={`/${path}`} />} />
          ))}

          <Route path="Members" element={<MembersContent />} />
          <Route path="Members/Create" element={<MembersCreate />} />
          <Route path="Members/Edit/:id" element={<MembersEdit />} />
          <Route path="*" element={<RoleRedirect />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? getDefaultRoute(user.role) : '/login'} replace />} />
      </Routes>
    </Suspense>
  );
}
