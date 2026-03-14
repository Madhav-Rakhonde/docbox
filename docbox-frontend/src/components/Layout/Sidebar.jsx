import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Box, Typography, Divider, Avatar, Badge, Tooltip,
} from '@mui/material';
import {
  Dashboard, Description, Analytics, People, Settings,
  Notifications, Security, FolderShared, CardGiftcard,
  FiberManualRecord, WifiOff, CloudDone,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { text: 'Dashboard',        icon: Dashboard,     path: '/dashboard' },
      { text: 'Documents',        icon: Description,   path: '/documents' },
      { text: 'Analytics',        icon: Analytics,     path: '/analytics' },
    ],
  },
  {
    label: 'Family',
    items: [
      { text: 'Family',           icon: People,        path: '/family' },
      { text: 'Family Documents', icon: FolderShared,  path: '/family-documents' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { text: 'Eligible Schemes', icon: CardGiftcard,  path: '/schemes' },
      { text: 'Notifications',    icon: Notifications, path: '/notifications', isNotification: true },
    ],
  },
  {
    label: 'Account',
    items: [
      { text: 'Settings',         icon: Settings,      path: '/settings' },
      { text: 'Permissions',      icon: Security,      path: '/permissions' },
    ],
  },
];

const LogoMark = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4"  y="8" width="18" height="22" rx="3" fill="#6366F1" opacity="0.3"/>
    <rect x="7"  y="5" width="18" height="22" rx="3" fill="#6366F1" opacity="0.6"/>
    <rect x="10" y="2" width="18" height="22" rx="3" fill="#6366F1"/>
    <rect x="14" y="8"  width="9" height="1.8" rx="0.9" fill="white" opacity="0.9"/>
    <rect x="14" y="12" width="7" height="1.8" rx="0.9" fill="white" opacity="0.6"/>
    <rect x="14" y="16" width="8" height="1.8" rx="0.9" fill="white" opacity="0.6"/>
  </svg>
);

const Sidebar = ({ drawerWidth, mobileOpen, onClose, isMobile }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();

  const [notificationCount, setNotificationCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // ── Online / offline ────────────────────────────────────────────────────
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

  const handleNavigation = (path) => { navigate(path); if (isMobile) onClose(); };
  const isActive = (path) => location.pathname === path;

  const drawer = (
    <Box sx={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0F172A', color: '#94A3B8', overflow: 'hidden',
    }}>

      {/* ── Brand ── */}
      <Box sx={{
        px: 2.5, py: 2.5,
        display: 'flex', alignItems: 'center', gap: 1.5,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        minHeight: 64,
      }}>
        <LogoMark />
        <Box>
          <Typography sx={{
            fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
            fontSize: '1.125rem', color: '#F8FAFC',
            lineHeight: 1, letterSpacing: '-0.02em',
          }}>
            Doc<span style={{ color: '#818CF8', fontWeight: 400 }}>Box</span>
          </Typography>
          <Typography sx={{
            fontSize: '0.65rem', color: '#475569', mt: 0.2,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Document Manager
          </Typography>
        </Box>
      </Box>

      {/* ── User Profile ── */}
      <Box sx={{ px: 2, py: 2, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          p: 1.5, borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <Avatar sx={{
            width: 36, height: 36, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
            fontSize: '0.9rem', fontWeight: 700,
          }}>
            {user?.fullName?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography sx={{
              fontSize: '0.875rem', fontWeight: 600, color: '#F1F5F9',
              lineHeight: 1.2, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.fullName}
            </Typography>
            <Typography sx={{
              fontSize: '0.72rem', color: '#475569',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Navigation ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5, px: 1 }}>
        {NAV_GROUPS.map((group) => (
          <Box key={group.label} sx={{ mb: 0.5 }}>
            <Typography sx={{
              px: 1.5, py: 0.75,
              fontSize: '0.65rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155',
            }}>
              {group.label}
            </Typography>

            <List disablePadding>
              {group.items.map((item) => {
                const active = isActive(item.path);
                const Icon   = item.icon;
                return (
                  <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
                    <ListItemButton
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        borderRadius: '8px', px: 1.5, py: 1,
                        background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
                        border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                        '&:hover': {
                          background: active
                            ? 'rgba(99,102,241,0.22)'
                            : 'rgba(255,255,255,0.05)',
                        },
                        transition: 'all 150ms ease',
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {item.isNotification && notificationCount > 0 ? (
                          <Badge
                            badgeContent={notificationCount}
                            color="error"
                            max={99}
                            sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}
                          >
                            <Icon sx={{
                              fontSize: 18,
                              color: active ? '#818CF8' : '#475569',
                              transition: 'color 150ms',
                            }} />
                          </Badge>
                        ) : (
                          <Icon sx={{
                            fontSize: 18,
                            color: active ? '#818CF8' : '#475569',
                            transition: 'color 150ms',
                          }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: active ? 600 : 450,
                          color: active ? '#F1F5F9' : '#64748B',
                          fontFamily: "'DM Sans', sans-serif",
                          transition: 'color 150ms',
                        }}
                      />
                      {active && (
                        <Box sx={{
                          width: 4, height: 4, borderRadius: '50%',
                          background: '#818CF8', flexShrink: 0,
                        }} />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* ── Status Footer — real online/offline state ── */}
      <Box sx={{ px: 2, py: 2, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <Tooltip
          title={isOnline ? 'Connected to server' : 'No internet — cached documents available'}
          placement="top"
          arrow
        >
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: 1.5, py: 1, borderRadius: '8px',
            background: isOnline
              ? 'rgba(16,185,129,0.08)'
              : 'rgba(99,102,241,0.1)',
            border: isOnline
              ? '1px solid rgba(16,185,129,0.2)'
              : '1px solid rgba(99,102,241,0.25)',
            transition: 'all 400ms ease',
            cursor: 'default',
          }}>
            {isOnline ? (
              <>
                <FiberManualRecord sx={{
                  fontSize: 8, color: '#10B981',
                  animation: 'pulse-dot 2s infinite',
                }} />
                <Typography sx={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 500 }}>
                  Online
                </Typography>
              </>
            ) : (
              <>
                <WifiOff sx={{ fontSize: 13, color: '#818CF8' }} />
                <Typography sx={{ fontSize: '0.75rem', color: '#818CF8', fontWeight: 500 }}>
                  Offline — cached mode
                </Typography>
              </>
            )}
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );

  const drawerSx = {
    '& .MuiDrawer-paper': {
      width: drawerWidth,
      border: 'none',
      boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
    },
  };

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, ...drawerSx }}
        >
          {drawer}
        </Drawer>
      )}
      {!isMobile && (
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, ...drawerSx }}
        >
          {drawer}
        </Drawer>
      )}
    </Box>
  );
};

export default Sidebar;