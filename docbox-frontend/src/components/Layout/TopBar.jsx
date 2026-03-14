import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, IconButton, Typography, Menu, MenuItem,
  Avatar, Box, Badge, Tooltip, Divider, ListItemIcon,
} from '@mui/material';
import {
  Menu as MenuIcon, Notifications, CloudDone, WifiOff,
  ExitToApp, KeyboardArrowDown, Settings,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import api from '../../services/api';

const PAGE_TITLES = {
  '/dashboard':        'Dashboard',
  '/documents':        'Documents',
  '/analytics':        'Analytics',
  '/family':           'Family',
  '/family-documents': 'Family Documents',
  '/family-members':   'Family Members',
  '/notifications':    'Notifications',
  '/schemes':          'Eligible Schemes',
  '/eligible-schemes': 'Eligible Schemes',
  '/settings':         'Settings',
  '/permissions':      'Permissions',
  '/my-documents':     'My Documents',
};

const TopBar = ({ onMenuClick, drawerWidth, isMobile }) => {
  const navigate          = useNavigate();
  const location          = useLocation();
  const { user, logout }  = useAuth();

  const [anchorEl,           setAnchorEl]           = useState(null);
  const [notificationCount,  setNotificationCount]  = useState(0);
  const [isOnline,           setIsOnline]            = useState(navigator.onLine);

  const pageTitle = PAGE_TITLES[location.pathname] || 'DocBox';

  // ── Online / offline detection ──────────────────────────────────────────
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ── Notification count ──────────────────────────────────────────────────
  const loadNotificationCount = async () => {
    try {
      const response = await api.get('/notifications/unread/count');
      if (response.data.success) {
        const raw = response.data.data;
        setNotificationCount(typeof raw === 'object' ? (raw?.count ?? 0) : (raw ?? 0));
      }
    } catch { /* silent — may be offline */ }
  };

  useEffect(() => {
    loadNotificationCount();

    const handleUnreadChange = (e) => setNotificationCount(e.detail.count);
    window.addEventListener('notif-unread-changed', handleUnreadChange);

    const interval = setInterval(() => {
      if (navigator.onLine) loadNotificationCount();
    }, 30000);

    return () => {
      window.removeEventListener('notif-unread-changed', handleUnreadChange);
      clearInterval(interval);
    };
  }, []);

  const handleMenu  = (e) => setAnchorEl(e.currentTarget);
  const handleClose = ()  => setAnchorEl(null);

  const handleLogout = async () => {
    try { await logout(); toast.success('Logged out successfully'); navigate('/login'); }
    catch { toast.error('Logout failed'); }
    handleClose();
  };

  const handleNotificationClick = () => {
    navigate('/notifications');
    setTimeout(loadNotificationCount, 800);
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml:    { md: `${drawerWidth}px` },
        background: 'rgba(248,249,252,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 1px 0 #E2E8F0',
        color: '#0F172A',
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 2, sm: 3 }, gap: 1 }}>

        {isMobile && (
          <IconButton
            edge="start"
            onClick={onMenuClick}
            sx={{ color: '#475569', mr: 1, '&:hover': { background: '#F1F5F9' } }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Page Title */}
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.125rem' },
              color: '#0F172A',
              letterSpacing: '-0.01em',
            }}
          >
            {pageTitle}
          </Typography>
        </Box>

        {/* Right-side actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>

          {/* Online / Offline pill — real state */}
          <Tooltip
            title={isOnline ? 'Connected to server' : 'No internet — cached documents available'}
            arrow
          >
            <Box sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center', gap: 0.75,
              px: 1.5, py: 0.75, borderRadius: '99px',
              background: isOnline
                ? 'rgba(16,185,129,0.08)'
                : 'rgba(99,102,241,0.08)',
              border: isOnline
                ? '1px solid rgba(16,185,129,0.2)'
                : '1px solid rgba(99,102,241,0.2)',
              cursor: 'default',
              transition: 'all 400ms ease',
            }}>
              {isOnline ? (
                <>
                  <CloudDone sx={{ fontSize: 14, color: '#10B981' }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#10B981' }}>
                    Online
                  </Typography>
                </>
              ) : (
                <>
                  <WifiOff sx={{ fontSize: 14, color: '#6366F1' }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#6366F1' }}>
                    Offline
                  </Typography>
                </>
              )}
            </Box>
          </Tooltip>

          {/* Notifications bell */}
          <Tooltip title="Notifications" arrow>
            <IconButton
              onClick={handleNotificationClick}
              sx={{ color: '#475569', width: 40, height: 40, '&:hover': { background: '#F1F5F9', color: '#0F172A' } }}
            >
              <Badge
                badgeContent={notificationCount}
                color="error"
                max={99}
                sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16, padding: '0 4px' } }}
              >
                <Notifications sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User menu trigger */}
          <Box
            onClick={handleMenu}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              pl: 1, pr: 1.5, py: 0.75, ml: 0.5,
              borderRadius: '99px', border: '1px solid #E2E8F0',
              background: '#FFFFFF', cursor: 'pointer',
              transition: 'all 150ms ease',
              '&:hover': {
                background: '#F8F9FC',
                borderColor: '#CBD5E1',
                boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
              },
            }}
          >
            <Avatar sx={{
              width: 28, height: 28,
              background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
              fontSize: '0.75rem', fontWeight: 700,
            }}>
              {user?.fullName?.charAt(0).toUpperCase()}
            </Avatar>
            <Typography sx={{
              display: { xs: 'none', sm: 'block' },
              fontSize: '0.875rem', fontWeight: 600, color: '#0F172A',
              maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.fullName?.split(' ')[0]}
            </Typography>
            <KeyboardArrowDown sx={{ fontSize: 16, color: '#94A3B8' }} />
          </Box>
        </Box>

        {/* User Dropdown */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            elevation: 3,
            sx: {
              mt: 1, minWidth: 200, borderRadius: '12px',
              border: '1px solid #E2E8F0', overflow: 'visible',
              '&::before': {
                content: '""', display: 'block', position: 'absolute',
                top: -5, right: 16, width: 10, height: 10,
                background: '#fff',
                borderTop: '1px solid #E2E8F0', borderLeft: '1px solid #E2E8F0',
                transform: 'rotate(45deg)', zIndex: 0,
              },
            },
          }}
        >
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>
              {user?.fullName}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>
              {user?.email}
            </Typography>
          </Box>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            onClick={() => { navigate('/settings'); handleClose(); }}
            sx={{ gap: 1.5, px: 2, py: 1, fontSize: '0.875rem', borderRadius: '6px', mx: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 'unset' }}>
              <Settings sx={{ fontSize: 16, color: '#475569' }} />
            </ListItemIcon>
            Settings
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            onClick={handleLogout}
            sx={{
              gap: 1.5, px: 2, py: 1, fontSize: '0.875rem',
              color: '#EF4444', borderRadius: '6px', mx: 0.5, mb: 0.5,
            }}
          >
            <ListItemIcon sx={{ minWidth: 'unset' }}>
              <ExitToApp sx={{ fontSize: 16, color: '#EF4444' }} />
            </ListItemIcon>
            Log out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;