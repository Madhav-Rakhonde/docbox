import React, { useEffect, useState } from 'react';
import { Container, Grid, Box, Typography, Button, CircularProgress } from '@mui/material';
import {
  Description,
  Storage,
  Warning,
  People,
  CloudUpload,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import StatsCard from '../components/Dashboard/StatsCard';
import RecentDocuments from '../components/Dashboard/RecentDocuments';
import ExpiryAlerts from '../components/Dashboard/ExpiryAlerts';
import analyticsService from '../services/analyticsService';
import documentService from '../services/documentService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [expiryData, setExpiryData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [statsRes, docsRes, expiryRes] = await Promise.all([
        analyticsService.getDashboardStats().catch(() => null),
        documentService.getDocuments(0, 5).catch(() => ({ data: { content: [] } })),
        analyticsService.getExpiryInsights().catch(() => null),
      ]);

      if (statsRes?.success) {
        setStats(statsRes.data);
      }

      if (docsRes?.success) {
        setRecentDocs(docsRes.data.content || []);
      }

      if (expiryRes?.success) {
        setExpiryData(expiryRes.data);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  if (loading) {
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
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back! Here's what's happening with your documents.
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={() => navigate('/documents')}
          size="large"
        >
          Upload Document
        </Button>
        <Button
          variant="outlined"
          startIcon={<AnalyticsIcon />}
          onClick={() => navigate('/analytics')}
        >
          View Analytics
        </Button>
      </Box>

      {/* Stats Cards - 2x2 Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <StatsCard
            title="Total Documents"
            value={stats?.totalDocuments || 0}
            subtitle="All your documents"
            icon={Description}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatsCard
            title="Storage Used"
            value={formatBytes(stats?.storageUsedBytes)}
            subtitle={`${stats?.storagePercentage?.toFixed(1) || 0}% of limit`}
            icon={Storage}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatsCard
            title="Expiring Soon"
            value={stats?.documentsExpiringSoon || 0}
            subtitle="In next 30 days"
            icon={Warning}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <StatsCard
            title="Family Members"
            value={stats?.totalFamilyMembers || 0}
            subtitle="Active members"
            icon={People}
            color="success"
          />
        </Grid>
      </Grid>

      {/* Recent Documents & Alerts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <RecentDocuments documents={recentDocs} loading={false} />
        </Grid>
        <Grid item xs={12} md={6}>
          <ExpiryAlerts
            expiringDocuments={expiryData?.urgentDocuments || []}
            expiredDocuments={expiryData?.expiredDocuments || []}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;