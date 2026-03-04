import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  CloudOff,
  ExitToApp,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import api from '../../services/api'; // ✅ ADDED for API calls

const TopBar = ({ onMenuClick, drawerWidth, isMobile }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0); // ✅ ADDED: Dynamic count

  // ✅ ADDED: Load notification count on mount
  useEffect(() => {
    loadNotificationCount();
    // Refresh count every 30 seconds
    const interval = setInterval(loadNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // ✅ ADDED: Function to load notification count
  const loadNotificationCount = async () => {
    try {
      const response = await api.get('/notifications/unread/count');
      if (response.data.success) {
        setNotificationCount(response.data.data.count || 0);
      }
    } catch (error) {
      console.error('Failed to load notification count:', error);
      // Silently fail - don't show error to user
    }
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    navigate('/settings');
    handleClose();
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
    handleClose();
  };

  // ✅ ADDED: Handle notification click
  const handleNotificationClick = () => {
    navigate('/notifications');
    // Optionally refresh count after navigation
    setTimeout(loadNotificationCount, 500);
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        boxShadow: 1,
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Toolbar>
        {/* Menu button for mobile */}
        {isMobile && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Page title - hide on mobile to save space */}
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
        >
          {/* Will be updated based on current page */}
        </Typography>

        {/* Right side icons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Offline indicator */}
          <Tooltip title="Offline Mode Active">
            <IconButton color="inherit" size={isMobile ? 'small' : 'medium'}>
              <Badge color="success" variant="dot">
                <CloudOff />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Notifications - ✅ FIXED: Added onClick handler and dynamic count */}
          <Tooltip title="Notifications">
            <IconButton 
              color="inherit" 
              size={isMobile ? 'small' : 'medium'}
              onClick={handleNotificationClick} // ✅ ADDED: Navigate to notifications
            >
              <Badge 
                badgeContent={notificationCount} // ✅ CHANGED: Dynamic count
                color="error"
                max={99} // ✅ ADDED: Show 99+ for large numbers
              >
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User menu */}
          <Tooltip title="Account">
            <IconButton
              onClick={handleMenu}
              size={isMobile ? 'small' : 'medium'}
              sx={{ ml: 1 }}
            >
              <Avatar
                sx={{
                  width: isMobile ? 32 : 40,
                  height: isMobile ? 32 : 40,
                  bgcolor: 'primary.main',
                }}
              >
                {user?.fullName?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* User menu dropdown */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleProfile}>
            <Person sx={{ mr: 1 }} /> Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ExitToApp sx={{ mr: 1 }} /> Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;