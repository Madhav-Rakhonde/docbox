import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  Badge,
  CircularProgress,
  Chip,
  Menu,
  MenuItem,
  Paper,
  Divider,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  DoneAll,
  DeleteOutline,
  MoreVert,
  Description,
  Share,
  PersonAdd,
  Warning,
  Info,
  CheckCircle,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    loadNotifications();
    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      if (response.data.success) {
        const notifs = response.data.data;
        setNotifications(Array.isArray(notifs) ? notifs : []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Don't show error toast on initial load
      if (notifications.length > 0) {
        toast.error('Failed to load notifications');
      }
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
      toast.success('Notification deleted');
      handleMenuClose();
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) {
      return;
    }

    try {
      await api.delete('/notifications/clear-all');
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  const handleMenuOpen = (event, notification) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedNotification(notification);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedNotification(null);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    // Handle navigation based on notification type
    // if (notification.link) {
    //   navigate(notification.link);
    // }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'DOCUMENT_UPLOADED':
      case 'DOCUMENT_UPDATED':
        return <Description sx={{ color: 'success.main' }} />;
      case 'DOCUMENT_SHARED':
        return <Share sx={{ color: 'info.main' }} />;
      case 'DOCUMENT_EXPIRING':
        return <Warning sx={{ color: 'warning.main' }} />;
      case 'FAMILY_MEMBER_ADDED':
        return <PersonAdd sx={{ color: 'primary.main' }} />;
      case 'PERMISSION_GRANTED':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      default:
        return <Info sx={{ color: 'info.main' }} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'DOCUMENT_EXPIRING':
        return '#fff3cd';
      case 'DOCUMENT_SHARED':
        return '#d1ecf1';
      case 'DOCUMENT_UPLOADED':
        return '#d4edda';
      case 'FAMILY_MEMBER_ADDED':
        return '#cce5ff';
      default:
        return '#ffffff';
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (tabValue === 0) return true; // All
    if (tabValue === 1) return !notif.isRead; // Unread
    if (tabValue === 2) return notif.type === 'DOCUMENT_EXPIRING'; // Expiry Alerts
    if (tabValue === 3) return notif.type === 'DOCUMENT_SHARED'; // Shares
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading && notifications.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            <NotificationsIcon sx={{ fontSize: 40, mr: 2, verticalAlign: 'middle' }} />
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stay updated with your document activity
          </Typography>
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<DoneAll />}
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0}
        >
          Mark All as Read
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteOutline />}
          onClick={handleClearAll}
          disabled={notifications.length === 0}
        >
          Clear All
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab
            label={
              <Badge badgeContent={notifications.length} color="primary">
                ALL
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={unreadCount} color="error">
                UNREAD
              </Badge>
            }
          />
          <Tab label="EXPIRY ALERTS" />
          <Tab label="SHARES" />
        </Tabs>
      </Paper>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Paper>
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tabValue === 1
                ? 'You have no unread notifications'
                : 'You have no notifications at this time'}
            </Typography>
          </Box>
        </Paper>
      ) : (
        <Paper>
          <List>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    bgcolor: notification.isRead ? 'transparent' : getNotificationColor(notification.type),
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    borderLeft: notification.isRead ? 'none' : '4px solid',
                    borderLeftColor: 'primary.main',
                  }}
                  onClick={() => handleNotificationClick(notification)}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={(e) => handleMenuOpen(e, notification)}
                    >
                      <MoreVert />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'background.paper' }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight={notification.isRead ? 400 : 600}>
                          {notification.title}
                        </Typography>
                        {!notification.isRead && (
                          <Chip label="NEW" size="small" color="primary" sx={{ height: 20 }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(notification.createdAt).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {index < filteredNotifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedNotification && !selectedNotification.isRead && (
          <MenuItem
            onClick={() => {
              handleMarkAsRead(selectedNotification.id);
              handleMenuClose();
            }}
          >
            <DoneAll sx={{ mr: 1 }} fontSize="small" />
            Mark as Read
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            handleDelete(selectedNotification.id);
          }}
        >
          <DeleteOutline sx={{ mr: 1 }} fontSize="small" color="error" />
          Delete
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default Notifications;