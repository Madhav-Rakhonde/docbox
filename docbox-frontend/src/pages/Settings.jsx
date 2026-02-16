import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Avatar,
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Person,
  Save,
  PhotoCamera,
  Lock,
  Notifications as NotificationsIcon,
  Storage,
  Delete,
  Email,
  Phone,
  Security,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Settings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    expiryAlerts: true,
    shareNotifications: true,
    weeklyReports: false,
  });
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    loadUserProfile();
    loadStorageInfo();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await api.get('/users/me');
      if (response.data.success) {
        const userData = response.data.data;
        setProfileData({
          fullName: userData.fullName || '',
          email: userData.email || '',
          phoneNumber: userData.phoneNumber || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Fallback to auth context user
      if (user) {
        setProfileData({
          fullName: user.fullName || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
        });
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const response = await api.get('/users/stats');
      if (response.data.success) {
        setStorageInfo(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNotificationChange = (name) => (event) => {
    setNotificationSettings({
      ...notificationSettings,
      [name]: event.target.checked,
    });
    toast.success('Notification preference updated');
  };

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      const response = await api.put('/users/me', {
        fullName: profileData.fullName,
        phoneNumber: profileData.phoneNumber,
      });
      
      if (response.data.success) {
        toast.success('Profile updated successfully!');
        // Update auth context
        if (setUser) {
          setUser({
            ...user,
            fullName: profileData.fullName,
            phoneNumber: profileData.phoneNumber,
          });
        }
      } else {
        toast.error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!passwordData.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    try {
      setLoading(true);
      toast.info('Password change feature will be available soon!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loadingProfile) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account settings and preferences
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Sidebar Navigation */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <List>
              <ListItem
                button
                selected={activeTab === 'profile'}
                onClick={() => setActiveTab('profile')}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemIcon>
                  <Person color={activeTab === 'profile' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Profile" />
              </ListItem>

              <ListItem
                button
                selected={activeTab === 'security'}
                onClick={() => setActiveTab('security')}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemIcon>
                  <Lock color={activeTab === 'security' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Security" />
              </ListItem>

              <ListItem
                button
                selected={activeTab === 'notifications'}
                onClick={() => setActiveTab('notifications')}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemIcon>
                  <NotificationsIcon color={activeTab === 'notifications' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Notifications" />
              </ListItem>

              <ListItem
                button
                selected={activeTab === 'storage'}
                onClick={() => setActiveTab('storage')}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemIcon>
                  <Storage color={activeTab === 'storage' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Storage" />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={9}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Paper sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight="600" sx={{ mb: 3 }}>
                Profile Information
              </Typography>

              {/* Avatar Section */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    fontSize: '2.5rem',
                    bgcolor: 'primary.main',
                    mr: 3,
                  }}
                >
                  {getInitials(profileData.fullName)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    {profileData.fullName || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {profileData.email}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PhotoCamera />}
                    sx={{ mt: 1 }}
                    onClick={() => toast.info('Photo upload coming soon!')}
                  >
                    Change Photo
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Profile Form */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="fullName"
                    value={profileData.fullName}
                    onChange={handleProfileChange}
                    InputProps={{
                      startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                    helperText="Email cannot be changed"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phoneNumber"
                    value={profileData.phoneNumber}
                    onChange={handleProfileChange}
                    placeholder="+919876543210"
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleProfileUpdate}
                  disabled={loading}
                  size="large"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  onClick={loadUserProfile}
                >
                  Cancel
                </Button>
              </Box>
            </Paper>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Paper sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight="600" sx={{ mb: 3 }}>
                Security Settings
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                Choose a strong password to keep your account secure
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    name="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    helperText="Minimum 8 characters"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  startIcon={<Lock />}
                  onClick={handlePasswordUpdate}
                  disabled={loading}
                  size="large"
                >
                  Update Password
                </Button>
              </Box>

              <Divider sx={{ my: 4 }} />

              <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                Two-Factor Authentication
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Add an extra layer of security to your account
              </Typography>
              <Button 
                variant="outlined"
                onClick={() => toast.info('2FA feature coming soon!')}
              >
                Enable 2FA
              </Button>
            </Paper>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Paper sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight="600" sx={{ mb: 3 }}>
                Notification Preferences
              </Typography>

              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onChange={handleNotificationChange('emailNotifications')}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2">Email Notifications</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Receive notifications via email
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.expiryAlerts}
                      onChange={handleNotificationChange('expiryAlerts')}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2">Document Expiry Alerts</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Get notified when documents are about to expire
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.shareNotifications}
                      onChange={handleNotificationChange('shareNotifications')}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2">Share Notifications</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Notifications when documents are shared with you
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationSettings.weeklyReports}
                      onChange={handleNotificationChange('weeklyReports')}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2">Weekly Reports</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Receive weekly summary of your documents
                      </Typography>
                    </Box>
                  }
                  sx={{ display: 'flex', alignItems: 'flex-start' }}
                />
              </Box>
            </Paper>
          )}

          {/* Storage Tab */}
          {activeTab === 'storage' && (
            <Paper sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight="600" sx={{ mb: 3 }}>
                Storage Management
              </Typography>

              {storageInfo && (
                <>
                  <Card sx={{ mb: 3, bgcolor: 'primary.lighter' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h4" fontWeight="bold">
                          {formatBytes(storageInfo.storageUsedBytes)}
                        </Typography>
                        <Chip
                          label={`${storageInfo.storagePercentage?.toFixed(1) || 0}% Used`}
                          color="primary"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        of {formatBytes(storageInfo.storageLimitBytes || 5 * 1024 * 1024 * 1024)} total storage
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={storageInfo.storagePercentage || 0}
                        sx={{ height: 10, borderRadius: 1, mt: 2 }}
                      />
                    </CardContent>
                  </Card>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} md={3}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight="bold">
                            {storageInfo.totalDocuments || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Documents
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight="bold">
                            {storageInfo.totalFamilyMembers || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Family Members
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight="bold">
                            5 GB
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Storage Limit
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight="bold" color="success.main">
                            Active
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Account Status
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </>
              )}

              <Button 
                variant="outlined" 
                color="error" 
                startIcon={<Delete />} 
                size="large"
                onClick={() => toast.info('Clear cache feature coming soon!')}
              >
                Clear Cache
              </Button>

              <Divider sx={{ my: 4 }} />

              <Alert severity="error">
                <Typography variant="subtitle2" gutterBottom>
                  Danger Zone
                </Typography>
                <Typography variant="body2" paragraph>
                  Once you delete your account, there is no going back. Please be certain.
                </Typography>
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<Delete />}
                  onClick={() => toast.error('Account deletion must be confirmed via email')}
                >
                  Delete Account
                </Button>
              </Alert>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default Settings;