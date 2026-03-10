import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, TextField, Button,
  Avatar, Grid, Divider, Switch, FormControlLabel,
  Alert, LinearProgress, Card, CardContent,
  CircularProgress, InputAdornment,
} from '@mui/material';
import {
  Person, Save, PhotoCamera, Lock, Notifications as NotificationsIcon,
  Storage, Delete, Email, Phone, Security,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import analyticsService from '../services/analyticsService';

// ─── Sidebar nav item ───────────────────────────────────────────────────────
const NavItem = ({ icon: Icon, label, id, active, onClick }) => (
  <Box onClick={() => onClick(id)} sx={{
    display: 'flex', alignItems: 'center', gap: 1.5,
    px: 2, py: 1.25, borderRadius: '10px', cursor: 'pointer', mb: 0.5,
    background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
    border: active ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
    transition: 'all 150ms ease',
    '&:hover': { background: active ? 'rgba(99,102,241,0.1)' : '#F8F9FC' },
  }}>
    <Icon sx={{ fontSize: 18, color: active ? '#6366F1' : '#94A3B8' }} />
    <Typography sx={{ fontSize: '0.875rem', fontWeight: active ? 700 : 500, color: active ? '#6366F1' : '#475569' }}>
      {label}
    </Typography>
  </Box>
);

// ─── Section heading ────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', mb: 2.5 }}>
    {children}
  </Typography>
);

// ─── Storage mini stat card ─────────────────────────────────────────────────
const StatMini = ({ value, label, color = '#0F172A' }) => (
  <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
      <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', mt: 0.5 }}>{label}</Typography>
    </CardContent>
  </Card>
);

// ─── Notification toggle row ────────────────────────────────────────────────
const NotifRow = ({ checked, onChange, title, subtitle }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    p: 2, borderRadius: '12px', border: '1px solid #E2E8F0', mb: 1.5,
    transition: 'background 150ms ease',
    '&:hover': { background: '#F8F9FC' },
  }}>
    <Box>
      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>{title}</Typography>
      <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8', mt: 0.25 }}>{subtitle}</Typography>
    </Box>
    <Switch checked={checked} onChange={onChange} color="primary" size="small"
      sx={{ '& .MuiSwitch-thumb': { boxShadow: 'none' },
            '& .Mui-checked .MuiSwitch-thumb': { background: '#6366F1' },
            '& .Mui-checked + .MuiSwitch-track': { background: '#6366F1' } }} />
  </Box>
);

// ─── Main Component ─────────────────────────────────────────────────────────
const Settings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading]           = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab]       = useState('profile');
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

  const formatPercentage = (p) => {
    if (p == null) return '0.00';
    const num = Number(p);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  const computePercentage = (used, limit) => {
    if (!used || !limit) return 0;
    return (used * 100.0) / limit;
  };

  const loadStorageInfo = async () => {
    try {
      // use analytics endpoint directly to avoid any discrepancies with /users/stats
      const r = await analyticsService.getDashboardStats();
      if (r?.success) {
        // pick only the storage-related fields
        const d = r.data || {};
        setStorageInfo({
          storageUsedBytes: d.storageUsedBytes || 0,
          storageLimitBytes: d.storageLimitBytes || (5 * 1024 * 1024 * 1024),
          storagePercentage: d.storagePercentage || computePercentage(d.storageUsedBytes, d.storageLimitBytes),
          totalDocuments: d.totalDocuments || 0,
          totalFamilyMembers: d.totalFamilyMembers || 0,
        });
      }
    } catch {
      // ignore errors
    }
  };

  const handleProfileChange = (e) => setProfileData({ ...profileData, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
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
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally { setLoading(false); }
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

  if (loadingProfile) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress sx={{ color: '#6366F1' }} />
        </Box>
      </Container>
    );
  }

  const NAV = [
    { id: 'profile',       label: 'Profile',       icon: Person },
    { id: 'security',      label: 'Security',      icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: NotificationsIcon },
    { id: 'storage',       label: 'Storage',       icon: Storage },
  ];

  return (
    <Container maxWidth="lg" sx={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
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

      <Grid container spacing={3}>
        {/* Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: '16px', border: '1px solid #E2E8F0', position: 'sticky', top: 24 }}>
            {/* User summary */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1 }}>
              <Avatar sx={{
                width: 40, height: 40, flexShrink: 0,
                background: 'linear-gradient(135deg, #6366F1, #818CF8)',
                fontWeight: 700, fontSize: '0.9rem',
              }}>
                {getInitials(profileData.fullName)}
              </Avatar>
              <Box sx={{ overflow: 'hidden' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profileData.fullName || 'User'}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profileData.email}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 1 }} />
            {NAV.map((n) => (
              <NavItem key={n.id} {...n} active={activeTab === n.id} onClick={setActiveTab} />
            ))}
          </Paper>
        </Grid>

        {/* Main content */}
        <Grid item xs={12} md={9}>

          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <SectionTitle>Profile Information</SectionTitle>

              {/* Avatar section */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3.5,
                p: 2.5, borderRadius: '14px', background: 'linear-gradient(135deg, #F8F9FC, #EEF2FF)' }}>
                <Avatar sx={{
                  width: 80, height: 80, flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366F1, #818CF8)',
                  fontWeight: 700, fontSize: '1.8rem',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                }}>
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
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Full Name" name="fullName"
                    value={profileData.fullName} onChange={handleProfileChange}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Email Address" name="email" type="email"
                    value={profileData.email} disabled helperText="Email cannot be changed"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Phone Number" name="phoneNumber"
                    value={profileData.phoneNumber} onChange={handleProfileChange}
                    placeholder="+919876543210"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }} />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3.5, display: 'flex', gap: 1.5 }}>
                <Button variant="contained" startIcon={<Save sx={{ fontSize: 16 }} />}
                  onClick={handleProfileUpdate} disabled={loading}
                  sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontWeight: 600,
                    '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' } }}>
                  {loading ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button variant="outlined" onClick={loadUserProfile}
                  sx={{ borderRadius: '10px', borderColor: '#E2E8F0', color: '#475569', '&:hover': { borderColor: '#6366F1', color: '#6366F1' } }}>
                  Cancel
                </Button>
              </Box>
            </Paper>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <SectionTitle>Security Settings</SectionTitle>

              <Alert severity="info" sx={{ mb: 3, borderRadius: '10px', fontSize: '0.875rem' }}>
                Choose a strong password to keep your account secure
              </Alert>

              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Current Password" name="currentPassword" type="password"
                    value={passwordData.currentPassword} onChange={handlePasswordChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="New Password" name="newPassword" type="password"
                    value={passwordData.newPassword} onChange={handlePasswordChange}
                    helperText="Minimum 8 characters" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Confirm New Password" name="confirmPassword" type="password"
                    value={passwordData.confirmPassword} onChange={handlePasswordChange} />
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Security sx={{ fontSize: 18, color: '#6366F1' }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>
                      Two-Factor Authentication
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                      Add an extra layer of security to your account
                    </Typography>
                  </Box>
                </Box>
                <Button variant="outlined" onClick={() => toast.info('2FA feature coming soon!')}
                  sx={{ mt: 1.5, borderRadius: '8px', borderColor: '#C7D2FE', color: '#6366F1',
                    '&:hover': { background: 'rgba(99,102,241,0.06)', borderColor: '#6366F1' } }}>
                  Enable 2FA
                </Button>
              </Box>
            </Paper>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <SectionTitle>Notification Preferences</SectionTitle>

              <NotifRow
                checked={notificationSettings.emailNotifications}
                onChange={handleNotificationChange('emailNotifications')}
                title="Email Notifications"
                subtitle="Receive notifications via email"
              />
              <NotifRow
                checked={notificationSettings.expiryAlerts}
                onChange={handleNotificationChange('expiryAlerts')}
                title="Document Expiry Alerts"
                subtitle="Get notified when documents are about to expire"
              />
              <NotifRow
                checked={notificationSettings.shareNotifications}
                onChange={handleNotificationChange('shareNotifications')}
                title="Share Notifications"
                subtitle="Notifications when documents are shared with you"
              />
              <NotifRow
                checked={notificationSettings.weeklyReports}
                onChange={handleNotificationChange('weeklyReports')}
                title="Weekly Reports"
                subtitle="Receive weekly summary of your documents"
              />
            </Paper>
          )}

          {/* ── STORAGE ── */}
          {activeTab === 'storage' && (
            <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <SectionTitle>Storage Management</SectionTitle>

              {storageInfo && (
                <>
                  {/* Usage card */}
                  <Box sx={{
                    p: 3, mb: 3, borderRadius: '14px',
                    background: 'linear-gradient(135deg, #EEF2FF, #F8F9FC)',
                    border: '1px solid #C7D2FE',
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
                      <Box>
                        <Typography sx={{ fontSize: '2.25rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>
                          {formatBytes(storageInfo.storageUsedBytes)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.825rem', color: '#64748B', mt: 0.5 }}>
                          of {formatBytes(storageInfo.storageLimitBytes)} total
                        </Typography>
                      </Box>
                      <Box sx={{ px: 1.5, py: 0.5, borderRadius: '8px', background: '#6366F1' }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'white' }}>
                          {formatPercentage(storageInfo.storagePercentage)}% Used
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress variant="determinate" value={storageInfo.storagePercentage || 0}
                      sx={{ height: 8, borderRadius: 99, bgcolor: 'rgba(99,102,241,0.12)',
                        '& .MuiLinearProgress-bar': { borderRadius: 99, background: 'linear-gradient(90deg, #6366F1, #818CF8)' } }} />
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 3.5 }}>
                    <Grid item xs={6} md={3}><StatMini value={storageInfo.totalDocuments || 0}      label="Documents" /></Grid>
                    <Grid item xs={6} md={3}><StatMini value={storageInfo.totalFamilyMembers || 0}  label="Family Members" /></Grid>
                    <Grid item xs={6} md={3}><StatMini value={formatBytes(storageInfo.storageLimitBytes)} label="Storage Limit" /></Grid>
                    <Grid item xs={6} md={3}><StatMini value="Active" label="Account Status" color="#10B981" /></Grid>
                  </Grid>
                </>
              )}

              <Button variant="outlined" color="error" startIcon={<Delete sx={{ fontSize: 16 }} />}
                onClick={() => toast.info('Clear cache feature coming soon!')}
                sx={{ borderRadius: '10px', mb: 3 }}>
                Clear Cache
              </Button>

              <Divider sx={{ mb: 3 }} />

              {/* Danger zone */}
              <Box sx={{ p: 3, borderRadius: '14px', border: '2px solid #FCA5A5', background: '#FEF2F2' }}>
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
          )}

        </Grid>
      </Grid>
    </Container>
  );
};

export default Settings;