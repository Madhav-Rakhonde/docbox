import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Divider,
  Avatar,
  Badge,
} from '@mui/material';
import {
  Dashboard,
  Description,
  Analytics,
  People,
  Settings,
  CloudOff,
  Notifications,
  Security,
  FolderShared, // ✅ ADDED for Family Documents
  CardGiftcard, // ✅ ADDED for Eligible Schemes
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ drawerWidth, mobileOpen, onClose, isMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Documents', icon: <Description />, path: '/documents' },
    { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
    { text: 'Family', icon: <People />, path: '/family' },
    // ✅ ADDED: Family Documents
    { 
      text: 'Family Documents', 
      icon: <FolderShared />, 
      path: '/family-documents' 
    },
    {
      text: 'Notifications',
      icon: (
        <Badge badgeContent={3} color="error">
          <Notifications />
        </Badge>
      ),
      path: '/notifications',
    },
    // ✅ ADDED: Eligible Schemes
    { 
      text: 'Eligible Schemes', 
      icon: <CardGiftcard />, 
      path: '/schemes' 
    },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
    { text: 'Permissions', icon: <Security />, path: '/permissions' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) onClose();
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Description sx={{ fontSize: 32, color: 'primary.main', mr: 1 }} />
          <Typography variant="h6" fontWeight="bold" color="primary">
            DocBox
          </Typography>
        </Box>
      </Toolbar>

      <Divider />

      {/* User Profile */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Avatar
          sx={{
            width: 60,
            height: 60,
            mx: 'auto',
            mb: 1,
            bgcolor: 'primary.main',
            fontSize: 24,
          }}
        >
          {user?.fullName?.charAt(0)?.toUpperCase()}
        </Avatar>
        <Typography variant="subtitle1" fontWeight={600}>
          {user?.fullName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {user?.email}
        </Typography>
      </Box>

      <Divider />

      {/* Navigation */}
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    location.pathname === item.path
                      ? 'primary.main'
                      : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Offline Indicator */}
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1,
            bgcolor: 'success.light',
            borderRadius: 1,
          }}
        >
          <CloudOff sx={{ mr: 1, fontSize: 20 }} />
          <Typography variant="caption">Offline Mode: Ready</Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      {/* Mobile */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Desktop */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
      )}
    </Box>
  );
};

export default Sidebar;