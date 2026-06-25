import { useEffect, useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { DRAWER_WIDTH } from '../constants/layout';
import { useAuth } from '../hooks/useAuth';
import useCompactSidebar from '../hooks/useCompactSidebar';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCompactSidebar = useCompactSidebar();

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

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        gap: isCompactSidebar ? 0 : 2.5,
      }}
    >
      <CssBaseline />
      <Sidebar
        role={user.role}
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
            p: { xs: 1.25, sm: 1.5, md: 2 },
            overflowX: 'hidden',
            overflowY: 'auto',
            width: '100%',
            minWidth: 0,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
