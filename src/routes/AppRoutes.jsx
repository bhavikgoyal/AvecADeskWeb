import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import RouteFallback from '../components/RouteFallback';
import { RequireAuth, RequireRole } from '../components/ProtectedRoute';
import { RESOURCE_PATHS } from '../config/resourceConfig';
import { useAuth } from '../hooks/useAuth';
import { getDefaultRoute } from '../utils/rbac';

const UserPortal = lazy(() => import('../pages/UserPortal/UserPortal'));
const LoginForm = lazy(() => import('../pages/Login/LoginForm'));
const OtpLoginForm = lazy(() => import('../pages/Login/OtpLoginForm'));
const DashboardLayout = lazy(() => import('../layouts/DashboardLayout'));
const AdminDash = lazy(() => import('../pages/Dashboards/AdminDash'));
const AccDash = lazy(() => import('../pages/Dashboards/AccDash'));
const VendorDash = lazy(() => import('../pages/Dashboards/VendorDash'));
const StudentDash = lazy(() => import('../pages/Dashboards/StudentDash'));
const ResourceListPage = lazy(() => import('../pages/resources/ResourceListPage'));
const NewResourcePage = lazy(() => import('../pages/resources/NewResourcePage'));
const ResourceDetailPage = lazy(() => import('../pages/resources/ResourceDetailPage'));

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
  return (
    <RequireRole path={path}>
      <NewResourcePage basePath={path} />
    </RequireRole>
  );
}

function GuardedResourceDetail({ path }) {
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

          {RESOURCE_PATHS.map((path) => (
            <Route key={`${path}-new`} path={`${path}/new`} element={<GuardedNewResource path={`/${path}`} />} />
          ))}
          {RESOURCE_PATHS.map((path) => (
            <Route key={`${path}-detail`} path={`${path}/:id`} element={<GuardedResourceDetail path={`/${path}`} />} />
          ))}
          {RESOURCE_PATHS.map((path) => (
            <Route key={path} path={path} element={<GuardedResourceList path={`/${path}`} />} />
          ))}

          <Route path="*" element={<RoleRedirect />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? getDefaultRoute(user.role) : '/login'} replace />} />
      </Routes>
    </Suspense>
  );
}
