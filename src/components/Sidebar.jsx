import { useMemo } from 'react';
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import { NavLink } from 'react-router-dom';
import { GET_MENU } from '../config/MenuConfig';
import { MOBILE_DRAWER_WIDTH } from '../constants/layout';
import useCompactSidebar from '../hooks/useCompactSidebar';
import BrandLogo from './BrandLogo';

export default function Sidebar({
  role,
  mobileOpen,
  onDrawerToggle,
  drawerWidth,
  onLogout,
}) {
  const isMobile = useCompactSidebar();
  const menuGroups = useMemo(() => GET_MENU(role), [role]);

  const closeMobileDrawer = () => {
    if (isMobile && mobileOpen) {
      onDrawerToggle();
    }
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: isMobile ? MOBILE_DRAWER_WIDTH : drawerWidth,
        backgroundColor: '#fff',
        color: '#1f325d',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <BrandLogo size="md" />
        {isMobile && (
          <IconButton
            onClick={onDrawerToggle}
            sx={{
              color: '#4f5f82',
              p: 0.5,
              '&:hover': { bgcolor: 'rgba(15, 76, 187, 0.04)' },
            }}
          >
            <CloseIcon sx={{ fontSize: '1.25rem' }} />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: '#e7eaf3' }} />

      {/* Menu */}
      <Box sx={{ px: 1, py: 1, overflowY: 'auto', flexGrow: 1 }}>
        {menuGroups.map((group) => (
          <Box key={group.category} sx={{ mb: 2 }}>
            <Typography
              sx={{
                px: 2,
                mb: 0.5,
                fontSize: 10,
                fontWeight: 700,
                color: '#9da7bf',
                letterSpacing: 0.5,
              }}
            >
              {group.category}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => (
                <ListItemButton
                  key={item.path}
                  component={NavLink}
                  to={item.path}
                  onClick={closeMobileDrawer}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    px: 2,
                    py: 0.75,
                    color: '#4f5f82',
                    bgcolor: 'transparent',
                    '&.active': {
                      color: 'var(--sidebar-active-text)',
                      bgcolor: 'var(--sidebar-active)',
                    },
                    '&:hover': {
                      bgcolor: 'rgba(51, 133, 198, 0.06)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: 'inherit',
                      minWidth: 32,
                      '& .MuiSvgIcon-root': { fontSize: '1rem' },
                    }}
                  >
                    {item.Icon ? <item.Icon fontSize="small" /> : null}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    slotProps={{
                      primary: { sx: { fontSize: '0.8rem', fontWeight: 600 } },
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: '#e7eaf3' }} />

      {/* Logout */}
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <ListItemButton
          onClick={() => {
            closeMobileDrawer();
            onLogout();
          }}
          sx={{
            borderRadius: 2,
            py: 1,
            px: 2,
            color: '#e05252',
            bgcolor: 'rgba(224, 82, 82, 0.04)',
            border: '1px solid rgba(224, 82, 82, 0.08)',
            '&:hover': {
              bgcolor: 'rgba(224, 82, 82, 0.08)',
              borderColor: 'rgba(224, 82, 82, 0.2)',
            },
          }}
        >
          <ListItemIcon
            sx={{
              color: 'inherit',
              minWidth: 32,
              '& .MuiSvgIcon-root': { fontSize: '1.1rem' },
            }}
          >
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            slotProps={{
              primary: { sx: { fontSize: '0.85rem', fontWeight: 700 } },
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: isMobile ? 0 : drawerWidth,
        flexShrink: 0,
      }}
    >
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isMobile ? 'auto' : drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: isMobile ? MOBILE_DRAWER_WIDTH : drawerWidth,
            maxWidth: isMobile ? '85vw' : drawerWidth,
            backgroundColor: '#fff',
            borderRight: isMobile ? 'none' : '1px solid rgba(229, 232, 240, 0.9)',
            boxShadow: isMobile ? '4px 0 24px rgba(31, 50, 93, 0.12)' : 'none',
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}