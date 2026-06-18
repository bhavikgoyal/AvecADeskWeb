import { useEffect, useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { DRAWER_WIDTH } from '../constants/layout';
import { useAuth } from '../hooks/useAuth';
import { resolveRole } from '../utils/rbac';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('force-scroll');
    document.documentElement.classList.add('force-scroll');
    return () => {
      document.body.classList.remove('force-scroll');
      document.documentElement.classList.remove('force-scroll');
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
if (!user) return null;
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <CssBaseline />
      <Sidebar
        role={resolveRole(user.role)}
        mobileOpen={mobileOpen}
        onDrawerToggle={() => setMobileOpen((prev) => !prev)}
        drawerWidth={DRAWER_WIDTH}
        onLogout={handleLogout}
      />
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
        }}
      >
        <Topbar onDrawerToggle={() => setMobileOpen((prev) => !prev)} user={user} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 1, sm: 1.25, md: 1.5 },
            overflow: 'auto',
            width: '100%',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
