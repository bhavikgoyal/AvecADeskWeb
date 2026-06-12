import { useRef, useState } from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

const notifications = [
  { title: 'Payment received', description: 'Student payment confirmed for INV-2041.', time: '5m ago' },
  { title: 'Task assigned', description: 'New commission review task assigned.', time: '20m ago' },
  { title: 'Reminder triggered', description: 'Invoice due reminder sent to vendor.', time: '1h ago' },
];

export default function Topbar({ onDrawerToggle, user }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const notificationBtnRef = useRef(null);
  const notificationOffsetY = isMobile ? 22 : 14;
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const open = Boolean(notificationAnchor);

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          top: 0,
          backgroundColor: '#fff',
          borderBottom: '1px solid rgba(229, 232, 240, 0.9)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          overflow: 'visible',
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            px: { xs: 1, sm: 1.25, md: 1.5 },
            py: { xs: 0.5, md: 0 },
            minHeight: { xs: 'auto', md: 52 },
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { md: 'center' },
            gap: { xs: 1, md: 0 },
            overflow: 'visible',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              gap: 1,
              minHeight: 48,
            }}
          >
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={onDrawerToggle}
              sx={{ display: { md: 'none' }, color: '#1f325d', flexShrink: 0 }}
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ flex: 1 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, position: 'relative' }}>
              <Chip
                label={user?.role}
                size="small"
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  fontWeight: 700,
                  bgcolor: 'var(--primary-soft)',
                  color: 'var(--primary-dark)',
                }}
              />
              <IconButton
                ref={notificationBtnRef}
                aria-label="notifications"
                aria-controls={open ? 'notification-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                sx={{ color: '#1f325d' }}
                onClick={() => setNotificationAnchor(notificationBtnRef.current)}
              >
                <Badge badgeContent={notifications.length} color="success">
                  <NotificationsNoneIcon />
                </Badge>
              </IconButton>
              <Avatar
                alt={user?.name || 'User'}
                src={user?.avatar}
                sx={{
                  width: { xs: 32, sm: 40 },
                  height: { xs: 32, sm: 40 },
                  bgcolor: 'var(--primary)',
                  fontWeight: 700,
                  border: '2px solid var(--primary-soft)',
                }}
              >
                {user?.name ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('') : 'U'}
              </Avatar>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        id="notification-menu"
        anchorEl={notificationAnchor}
        open={open}
        onClose={() => setNotificationAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        disableScrollLock
        slotProps={{
          root: { sx: { zIndex: (theme) => theme.zIndex.modal + 2 } },
          popper: {
            placement: 'bottom-end',
            sx: { zIndex: (theme) => theme.zIndex.modal + 2 },
            modifiers: [
              { name: 'offset', options: { offset: [0, notificationOffsetY] } },
              { name: 'preventOverflow', options: { padding: 12, altAxis: true } },
            ],
          },
          paper: {
            sx: {
              width: { xs: 'min(320px, calc(100vw - 24px))', sm: 340 },
              maxHeight: { xs: 'min(420px, calc(100vh - 120px))', sm: 480 },
              borderRadius: 3,
              boxShadow: '0 12px 40px rgba(31, 50, 93, 0.18)',
              overflow: 'auto',
            },
          },
          list: { sx: { py: 0 } },
        }}
        MenuListProps={{ dense: true, disablePadding: true, autoFocusItem: open }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(229, 232, 240, 0.9)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
        </Box>
        {notifications.map((notification, index) => (
          <Box key={notification.title}>
            <MenuItem
              onClick={() => setNotificationAnchor(null)}
              sx={{ alignItems: 'flex-start', flexDirection: 'column', whiteSpace: 'normal', py: 1.25, px: 2 }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', width: '100%' }}>{notification.title}</Typography>
              <Typography sx={{ color: '#6b7a99', fontSize: '0.8rem', mt: 0.5, width: '100%' }}>
                {notification.description}
              </Typography>
              <Typography sx={{ color: '#9da7bf', fontSize: '0.75rem', mt: 0.5, width: '100%' }}>
                {notification.time}
              </Typography>
            </MenuItem>
            {index < notifications.length - 1 && <Divider sx={{ mx: 2 }} />}
          </Box>
        ))}
      </Menu>
    </>
  );
}
