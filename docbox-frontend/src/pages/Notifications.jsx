import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button, List, ListItem,
  ListItemAvatar, ListItemText, Avatar, IconButton,
  Tabs, Tab, Badge, CircularProgress, Chip, Menu,
  MenuItem, Paper, Divider,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  DoneAll, DeleteOutline, MoreVert,
  Description, Share, PersonAdd, Warning,
  Info, CheckCircle, CardGiftcard,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

// ─── Icon + Color maps ─────────────────────────────────────────────────────
const TYPE_CONFIG = {
  DOCUMENT_UPLOADED:   { icon: Description,        color: '#10B981', bg: '#ECFDF5' },
  DOCUMENT_UPDATED:    { icon: Description,        color: '#10B981', bg: '#ECFDF5' },
  DOCUMENT_SHARED:     { icon: Share,              color: '#3B82F6', bg: '#EFF6FF' },
  DOCUMENT_EXPIRING:   { icon: Warning,            color: '#F59E0B', bg: '#FFFBEB' },
  FAMILY_MEMBER_ADDED: { icon: PersonAdd,          color: '#6366F1', bg: '#EEF2FF' },
  PERMISSION_GRANTED:  { icon: CheckCircle,        color: '#10B981', bg: '#ECFDF5' },
  SCHEME_DISCOVERY:    { icon: CardGiftcard,       color: '#10B981', bg: '#ECFDF5' },
  DEFAULT:             { icon: Info,               color: '#3B82F6', bg: '#EFF6FF' },
};

const getConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.DEFAULT;

const formatDate = (date) =>
  new Date(date).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

// ─── Notification Row ──────────────────────────────────────────────────────
const NotifRow = ({ notification, onMenuOpen, onClick }) => {
  const { icon: Icon, color, bg } = getConfig(notification.type);
  const unread = !notification.isRead;

  return (
    <ListItem
      onClick={() => onClick(notification)}
      sx={{
        px: 3,
        py: 2,
        cursor: 'pointer',
        background: unread ? `${bg}88` : 'transparent',
        borderLeft: unread ? `3px solid ${color}` : '3px solid transparent',
        transition: 'background 150ms ease',
        '&:hover': { background: unread ? bg : '#F8F9FC' },
        alignItems: 'flex-start',
      }}
      secondaryAction={
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onMenuOpen(e, notification); }}
          sx={{ color: '#94A3B8', mt: 0.5 }}>
          <MoreVert sx={{ fontSize: 18 }} />
        </IconButton>
      }
    >
      <ListItemAvatar sx={{ mt: 0.25 }}>
        <Avatar sx={{ width: 38, height: 38, background: bg, border: `1px solid ${color}30` }}>
          <Icon sx={{ fontSize: 18, color }} />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pr: 3 }}>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: unread ? 700 : 500, color: '#0F172A' }}>
              {notification.title}
            </Typography>
            {unread && (
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
            )}
          </Box>
        }
        secondary={
          <Box sx={{ mt: 0.25 }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
              {notification.message}
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', mt: 0.5 }}>
              {formatDate(notification.createdAt)}
            </Typography>
          </Box>
        }
      />
    </ListItem>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const Notifications = () => {
  const [notifications, setNotifications]         = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [tabValue, setTabValue]                   = useState(0);
  const [anchorEl, setAnchorEl]                   = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    loadNotifications();
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
      } else setNotifications([]);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch { toast.error('Failed to mark as read'); }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification deleted');
      handleMenuClose();
    } catch { toast.error('Failed to delete'); }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    try {
      await api.delete('/notifications/clear-all');
      setNotifications([]);
      toast.success('Cleared');
    } catch { toast.error('Failed'); }
  };

  const handleMenuOpen = (e, n) => { setAnchorEl(e.currentTarget); setSelectedNotification(n); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedNotification(null); };

  const handleNotificationClick = (n) => {
    if (!n.isRead) handleMarkAsRead(n.id);
    if (n.link) window.location.href = n.link;
  };

  const unreadCount  = notifications.filter((n) => !n.isRead).length;
  const schemeCount  = notifications.filter((n) => n.type === 'SCHEME_DISCOVERY' && !n.isRead).length;

  const filtered = notifications.filter((n) => {
    if (tabValue === 1) return !n.isRead;
    if (tabValue === 2) return n.type === 'DOCUMENT_EXPIRING';
    if (tabValue === 3) return n.type === 'DOCUMENT_SHARED';
    if (tabValue === 4) return n.type === 'SCHEME_DISCOVERY';
    return true;
  });

  const TABS = [
    { label: 'All',     count: notifications.length, color: 'primary' },
    { label: 'Unread',  count: unreadCount,           color: 'error' },
    { label: 'Expiry',  count: null },
    { label: 'Shared',  count: null },
    { label: 'Schemes', count: schemeCount,           color: 'success' },
  ];

  return (
    <Container maxWidth="lg" sx={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: { xs: '1.75rem', sm: '2.25rem' },
            fontWeight: 400, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.25,
          }}>
            Notifications
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<DoneAll sx={{ fontSize: 16 }} />}
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            size="small"
            sx={{ borderRadius: '8px', borderColor: '#E2E8F0', color: '#475569', '&:hover': { borderColor: '#6366F1', color: '#6366F1', background: 'rgba(99,102,241,0.05)' } }}
          >
            Mark all read
          </Button>
          <Button
            variant="outlined"
            startIcon={<DeleteOutline sx={{ fontSize: 16 }} />}
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            size="small"
            color="error"
            sx={{ borderRadius: '8px' }}
          >
            Clear all
          </Button>
        </Box>
      </Box>

      {/* Tab Bar */}
      <Paper elevation={0} sx={{ mb: 2.5, borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            '& .MuiTabs-indicator': { background: '#6366F1', borderRadius: 2, height: 2.5 },
            '& .MuiTab-root': {
              fontSize: '0.78rem', fontWeight: 600, textTransform: 'none',
              minHeight: 48, px: 2, color: '#64748B', letterSpacing: '0.02em',
              '&.Mui-selected': { color: '#6366F1' },
            },
          }}
        >
          {TABS.map((tab, i) => (
            <Tab
              key={tab.label}
              label={
                tab.count != null && tab.count > 0
                  ? <Badge badgeContent={tab.count} color={tab.color} sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}>
                      <Box sx={{ pr: 1.5 }}>{tab.label}</Box>
                    </Badge>
                  : tab.label
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Notifications List */}
      {loading && notifications.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: '#6366F1' }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: '#F1F5F9', mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 28, color: '#94A3B8' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>No notifications</Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8', maxWidth: 320, mx: 'auto' }}>
              {tabValue === 1 ? "You're all caught up!" :
               tabValue === 4 ? 'Upload more documents to discover eligible government schemes.' :
               'Nothing to show here yet.'}
            </Typography>
          </Box>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <List disablePadding>
            {filtered.map((notif, index) => (
              <React.Fragment key={notif.id}>
                <NotifRow
                  notification={notif}
                  onMenuOpen={handleMenuOpen}
                  onClick={handleNotificationClick}
                />
                {index < filtered.length - 1 && <Divider sx={{ mx: 3, borderColor: '#F1F5F9' }} />}
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
        PaperProps={{ elevation: 3, sx: { borderRadius: '10px', border: '1px solid #E2E8F0', minWidth: 160 } }}
      >
        {selectedNotification && !selectedNotification.isRead && (
          <MenuItem onClick={() => { handleMarkAsRead(selectedNotification.id); handleMenuClose(); }}
            sx={{ fontSize: '0.875rem', gap: 1.5, borderRadius: '6px', mx: 0.5 }}>
            <DoneAll sx={{ fontSize: 16, color: '#6366F1' }} /> Mark as read
          </MenuItem>
        )}
        <MenuItem onClick={() => handleDelete(selectedNotification?.id)}
          sx={{ fontSize: '0.875rem', gap: 1.5, color: '#EF4444', borderRadius: '6px', mx: 0.5, mb: 0.5 }}>
          <DeleteOutline sx={{ fontSize: 16 }} /> Delete
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default Notifications;