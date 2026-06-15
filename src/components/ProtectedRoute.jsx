import { Navigate, useLocation } from 'react-router-dom';
import { getAuthToken } from '../api/axiosClient';
import { useAuth } from '../hooks/useAuth';
import { canAccessPath, getDefaultRoute } from '../utils/rbac';

export function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const token = getAuthToken();

  if (!user || !token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export function RequireRole({ path, children }) {
  const { user } = useAuth();

  if (!canAccessPath(user.role, path)) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }

  return children;
}
