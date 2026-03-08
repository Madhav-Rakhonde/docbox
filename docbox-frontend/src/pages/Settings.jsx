import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, TextField, Button,
  Avatar, Grid, Divider, Switch, Alert, LinearProgress,
  Card, CardContent, CircularProgress, InputAdornment,
  Tabs, Tab, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Person, Save, PhotoCamera, Lock, Notifications as NotificationsIcon,
  Storage, Delete, Email, Phone, Security,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionTitle = ({ children }) => (
  <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', mb: 2.5 }}>
    {children}
  </Typography>
);

const StatMini = ({ value, label, color = '#0F172A' }) => (
  <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
      <Typography sx={{ fontSize: '1.35rem', fontWeight: 700, color, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', mt: 0.5 }}>{label}</Typography>
    </CardContent>
  </Card>
);

const NotifRow = ({ checked, onChange, title, subtitle }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    p: { xs: 1.75, sm: 2 }, borderRadius: '12px', border: '1px solid #E2E8F0', mb: 1.5,
    transition: 'background 150ms ease', '&:hover': { background: '#F8F9FC' },
  }}>
    <Box sx={{ pr: 1 }}>
      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>{title}</Typography>
      <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8', mt: 0.25 }}>{subtitle}</Typography>
    </Box>
    <Switch checked={checked} onChange={onChange} color="primary" size="small"
      sx={{ flexShrink: 0,
        '& .Mui-checked .MuiSwitch-thumb': { background: '#6366F1' },
        '& .Mui-checked + .MuiSwitch-track': { background: '#6366F1' } }} />
  </Box>
);

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px',
    '& fieldset': { borderColor: '#E2E8F0' },
    '&:hover fieldset': { borderColor: '#6366F1' },
    '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: '1.5px' } },
};

// ─── Tab panel helper ─────────────────────────────────────────────────────────
const TabPanel = ({ children, value, index }) =>
  value === index ? <Box>{children}</Box> : null;

// ─── Settings nav items ───────────────────────────────────────────────────────
const NAV = [
  { id: 0, label: 'Profile',       icon: Person },
  { id: 1, label: 'Security',      icon: Lock },
  { id: 2, label: 'Notifications', icon: NotificationsIcon },
  { id: 3, label: 'Storage',       icon: Storage },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
const Settings = () => {
  const { user, setUser }   = useAuth();
  const theme               = useTheme();
  const isMobile            = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading]               = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab]           = useState(0);

  const [profileData, setProfileData]   = useState({ fullName: '', email: '', phoneNumber: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true, expiryAlerts: true,
    shareNotifications: true, weeklyReports: false,
  });
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => { loadUserProfile(); loadStorageInfo(); }, []);

  const loadUserProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await api.get('/users/me');
      if (response.data.success) {
        const d = response.data.data;
        setProfileData({ fullName: d.fullName || '', email: d.email || '', phoneNumber: d.phoneNumber || '' });
      }
    } catch {
      if (user) setProfileData({ fullName: user.fullName || '', email: user.email || '', phoneNumber: user.phoneNumber || '' });
    } finally { setLoadingProfile(false); }
  };

  const loadStorageInfo = async () => {
    try {
      const r = await api.get('/users/stats');
      if (r.data.success) setStorageInfo(r.data.data);
    } catch { /* silent */ }
  };

  const handleProfileChange      = (e) => setProfileData({ ...profileData, [e.target.name]: e.target.value });
  const handlePasswordChange     = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  const handleNotificationChange = (name) => (e) => {
    setNotificationSettings({ ...notificationSettings, [name]: e.target.checked });
    toast.success('Notification preference updated');
  };

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      const response = await api.put('/users/me', { fullName: profileData.fullName, phoneNumber: profileData.phoneNumber });
      if (response.data.success) {
        toast.success('Profile updated!');
        if (setUser) setUser({ ...user, fullName: profileData.fullName, phoneNumber: profileData.phoneNumber });
      } else toast.error(response.data.message || 'Failed to update profile');
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to update profile'); }
    finally { setLoading(false); }
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (passwordData.newPassword.length < 8) { toast.error('Minimum 8 characters'); return; }
    if (!passwordData.currentPassword) { toast.error('Please enter your current password'); return; }
    try {
      setLoading(true);
      toast.info('Password change feature will be available soon!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch { toast.error('Failed to change password'); }
    finally { setLoading(false); }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loadingProfile) return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    </Container>
  );

  // ─── Tab content panels ─────────────────────────────────────────────────────

  const ProfilePanel = (
    <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
      <SectionTitle>Profile Information</SectionTitle>

      {/* Avatar card */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3 }, mb: 3.5,
        p: { xs: 2, sm: 2.5 }, borderRadius: '14px',
        background: 'linear-gradient(135deg, #F8F9FC, #EEF2FF)', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <Avatar sx={{ width: { xs: 64, sm: 80 }, height: { xs: 64, sm: 80 }, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366F1, #818CF8)',
          fontWeight: 700, fontSize: { xs: '1.4rem', sm: '1.8rem' },
          boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
          {getInitials(profileData.fullName)}
        </Avatar>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', mb: 0.25 }}>
            {profileData.fullName || 'User'}
          </Typography>
          <Typography sx={{ fontSize: '0.825rem', color: '#64748B', mb: 1.5 }}>
            {profileData.email}
          </Typography>
          <Button variant="outlined" size="small" startIcon={<PhotoCamera sx={{ fontSize: 14 }} />}
            onClick={() => toast.info('Photo upload coming soon!')}
            sx={{ borderRadius: '8px', borderColor: '#C7D2FE', color: '#6366F1', fontSize: '0.78rem',
              '&:hover': { background: 'rgba(99,102,241,0.06)', borderColor: '#6366F1' } }}>
            Change Photo
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Full Name" name="fullName"
            value={profileData.fullName} onChange={handleProfileChange} sx={fieldSx}
            InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Email Address" name="email" type="email"
            value={profileData.email} disabled helperText="Email cannot be changed" sx={fieldSx}
            InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Phone Number" name="phoneNumber"
            value={profileData.phoneNumber} onChange={handleProfileChange}
            placeholder="+919876543210" sx={fieldSx}
            InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<Save sx={{ fontSize: 16 }} />}
          onClick={handleProfileUpdate} disabled={loading}
          sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontWeight: 600,
            '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' } }}>
          {loading ? 'Saving…' : 'Save Changes'}
        </Button>
        <Button variant="outlined" onClick={loadUserProfile}
          sx={{ borderRadius: '10px', borderColor: '#E2E8F0', color: '#475569',
            '&:hover': { borderColor: '#6366F1', color: '#6366F1' } }}>
          Cancel
        </Button>
      </Box>
    </Paper>
  );

  const SecurityPanel = (
    <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
      <SectionTitle>Security Settings</SectionTitle>

      <Alert severity="info" sx={{ mb: 3, borderRadius: '10px', fontSize: '0.875rem' }}>
        Choose a strong password to keep your account secure
      </Alert>

      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <TextField fullWidth label="Current Password" name="currentPassword" type="password"
            value={passwordData.currentPassword} onChange={handlePasswordChange} sx={fieldSx} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="New Password" name="newPassword" type="password"
            value={passwordData.newPassword} onChange={handlePasswordChange}
            helperText="Minimum 8 characters" sx={fieldSx} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Confirm New Password" name="confirmPassword" type="password"
            value={passwordData.confirmPassword} onChange={handlePasswordChange} sx={fieldSx} />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" startIcon={<Lock sx={{ fontSize: 16 }} />}
          onClick={handlePasswordUpdate} disabled={loading}
          sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontWeight: 600 }}>
          Update Password
        </Button>
      </Box>

      <Divider sx={{ my: 4 }} />

      <Box sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #E2E8F0' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
            background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Security sx={{ fontSize: 18, color: '#6366F1' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>
              Two-Factor Authentication
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8', mt: 0.25 }}>
              Add an extra layer of security to your account
            </Typography>
          </Box>
        </Box>
        <Button variant="outlined" onClick={() => toast.info('2FA feature coming soon!')}
          sx={{ borderRadius: '8px', borderColor: '#C7D2FE', color: '#6366F1',
            '&:hover': { background: 'rgba(99,102,241,0.06)', borderColor: '#6366F1' } }}>
          Enable 2FA
        </Button>
      </Box>
    </Paper>
  );

  const NotificationsPanel = (
    <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
      <SectionTitle>Notification Preferences</SectionTitle>
      <NotifRow checked={notificationSettings.emailNotifications}
        onChange={handleNotificationChange('emailNotifications')}
        title="Email Notifications" subtitle="Receive notifications via email" />
      <NotifRow checked={notificationSettings.expiryAlerts}
        onChange={handleNotificationChange('expiryAlerts')}
        title="Document Expiry Alerts" subtitle="Get notified when documents are about to expire" />
      <NotifRow checked={notificationSettings.shareNotifications}
        onChange={handleNotificationChange('shareNotifications')}
        title="Share Notifications" subtitle="Notifications when documents are shared with you" />
      <NotifRow checked={notificationSettings.weeklyReports}
        onChange={handleNotificationChange('weeklyReports')}
        title="Weekly Reports" subtitle="Receive weekly summary of your documents" />
    </Paper>
  );

  const StoragePanel = (
    <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
      <SectionTitle>Storage Management</SectionTitle>

      {storageInfo && (
        <>
          {/* Usage bar */}
          <Box sx={{ p: { xs: 2.5, sm: 3 }, mb: 3, borderRadius: '14px',
            background: 'linear-gradient(135deg, #EEF2FF, #F8F9FC)', border: '1px solid #C7D2FE' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' }, fontWeight: 700,
                  color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {formatBytes(storageInfo.storageUsedBytes)}
                </Typography>
                <Typography sx={{ fontSize: '0.825rem', color: '#64748B', mt: 0.5 }}>
                  of {formatBytes(storageInfo.storageLimitBytes || 5 * 1024 * 1024 * 1024)} total
                </Typography>
              </Box>
              <Box sx={{ px: 1.5, py: 0.5, borderRadius: '8px', background: '#6366F1' }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'white' }}>
                  {(storageInfo.storagePercentage || 0).toFixed(1)}% Used
                </Typography>
              </Box>
            </Box>
            <LinearProgress variant="determinate" value={storageInfo.storagePercentage || 0}
              sx={{ height: 8, borderRadius: 99, bgcolor: 'rgba(99,102,241,0.12)',
                '& .MuiLinearProgress-bar': { borderRadius: 99, background: 'linear-gradient(90deg, #6366F1, #818CF8)' } }} />
          </Box>

          <Grid container spacing={1.5} sx={{ mb: 3.5 }}>
            <Grid item xs={6} sm={3}><StatMini value={storageInfo.totalDocuments || 0}      label="Documents" /></Grid>
            <Grid item xs={6} sm={3}><StatMini value={storageInfo.totalFamilyMembers || 0}  label="Family Members" /></Grid>
            <Grid item xs={6} sm={3}><StatMini value="5 GB"                                 label="Storage Limit" /></Grid>
            <Grid item xs={6} sm={3}><StatMini value="Active"                               label="Account Status" color="#10B981" /></Grid>
          </Grid>
        </>
      )}

      <Button variant="outlined" color="error" startIcon={<Delete sx={{ fontSize: 16 }} />}
        onClick={() => toast.info('Clear cache feature coming soon!')}
        sx={{ borderRadius: '10px', mb: 3 }}>
        Clear Cache
      </Button>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ p: { xs: 2, sm: 3 }, borderRadius: '14px', border: '2px solid #FCA5A5', background: '#FEF2F2' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#EF4444', mb: 0.5 }}>
          Danger Zone
        </Typography>
        <Typography sx={{ fontSize: '0.825rem', color: '#64748B', mb: 2, lineHeight: 1.7 }}>
          Once you delete your account, there is no going back. Please be certain.
        </Typography>
        <Button variant="outlined" color="error" startIcon={<Delete sx={{ fontSize: 15 }} />}
          onClick={() => toast.error('Account deletion must be confirmed via email')}
          sx={{ borderRadius: '8px', borderColor: '#F87171', color: '#EF4444',
            '&:hover': { background: '#FEF2F2', borderColor: '#EF4444' } }}>
          Delete Account
        </Button>
      </Box>
    </Paper>
  );

  const panels = [ProfilePanel, SecurityPanel, NotificationsPanel, StoragePanel];

  return (
    <Container maxWidth="lg" sx={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
        <Typography sx={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: { xs: '1.75rem', sm: '2.25rem' },
          fontWeight: 400, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.25,
        }}>
          Settings
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
          Manage your account settings and preferences
        </Typography>
      </Box>

      {/* ── MOBILE: horizontal scrollable tabs ── */}
      {isMobile && (
        <Box sx={{ mb: 2.5 }}>
          {/* User mini card */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', border: '1px solid #E2E8F0', mb: 2,
            display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 40, height: 40, background: 'linear-gradient(135deg, #6366F1, #818CF8)',
              fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
              {getInitials(profileData.fullName)}
            </Avatar>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profileData.fullName || 'User'}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profileData.email}
              </Typography>
            </Box>
          </Paper>

          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable"
            scrollButtons="auto" allowScrollButtonsMobile
            TabIndicatorProps={{ sx: { height: 3, borderRadius: 99, background: '#6366F1' } }}
            sx={{
              bgcolor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', p: 0.5,
              minHeight: 48,
              '& .MuiTab-root': { minHeight: 40, fontSize: '0.8rem', fontWeight: 600,
                color: '#64748B', borderRadius: '8px', px: 2, py: 0.75,
                '&.Mui-selected': { color: '#6366F1', background: 'rgba(99,102,241,0.06)' } },
            }}>
            {NAV.map((n) => (
              <Tab key={n.id} label={n.label} icon={<n.icon sx={{ fontSize: 15 }} />}
                iconPosition="start" />
            ))}
          </Tabs>
        </Box>
      )}

      {/* ── DESKTOP: sidebar + content grid ── */}
      {!isMobile ? (
        <Grid container spacing={3}>
          {/* Left sidebar nav */}
          <Grid item md={3}>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: '16px', border: '1px solid #E2E8F0',
              position: 'sticky', top: 24 }}>
              {/* User summary */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1 }}>
                <Avatar sx={{ width: 40, height: 40, flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366F1, #818CF8)', fontWeight: 700, fontSize: '0.9rem' }}>
                  {getInitials(profileData.fullName)}
                </Avatar>
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profileData.fullName || 'User'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profileData.email}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 1 }} />
              {NAV.map((n) => {
                const active = activeTab === n.id;
                return (
                  <Box key={n.id} onClick={() => setActiveTab(n.id)} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    px: 2, py: 1.25, borderRadius: '10px', cursor: 'pointer', mb: 0.5,
                    background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
                    border: active ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                    transition: 'all 150ms ease',
                    '&:hover': { background: active ? 'rgba(99,102,241,0.1)' : '#F8F9FC' },
                  }}>
                    <n.icon sx={{ fontSize: 17, color: active ? '#6366F1' : '#94A3B8', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: active ? 700 : 500,
                      color: active ? '#6366F1' : '#475569' }}>
                      {n.label}
                    </Typography>
                  </Box>
                );
              })}
            </Paper>
          </Grid>

          {/* Right content */}
          <Grid item md={9}>
            {panels[activeTab]}
          </Grid>
        </Grid>
      ) : (
        /* Mobile: just the panel */
        <Box>{panels[activeTab]}</Box>
      )}
    </Container>
  );
};

export default Settings;