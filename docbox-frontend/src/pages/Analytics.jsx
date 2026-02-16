import React, { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { Storage, Description, TrendingUp } from '@mui/icons-material';
import { toast } from 'react-toastify';
import StorageChart from '../components/Analytics/StorageChart';
import CategoryChart from '../components/Analytics/CategoryChart';
import analyticsService from '../services/analyticsService';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [storageData, setStorageData] = useState(null);
  const [documentStats, setDocumentStats] = useState(null);
  const [expiryData, setExpiryData] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const [storageRes, docStatsRes, expiryRes] = await Promise.all([
        analyticsService.getStorageInsights().catch(() => null),
        analyticsService.getDocumentStats().catch(() => null),
        analyticsService.getExpiryInsights().catch(() => null),
      ]);

      if (storageRes?.success) {
        // ✅ FIX: Transform storage data properly
        const transformedStorage = {
          ...storageRes.data,
          storageByCategory: storageRes.data.storageByCategory?.map(item => ({
            category: item[0] || 'Others',
            bytes: parseInt(item[1]) || 0
          })) || []
        };
        setStorageData(transformedStorage);
      }

      if (docStatsRes?.success) {
        // ✅ FIX: Transform document stats properly
        const transformedStats = {
          ...docStatsRes.data,
          byFileType: docStatsRes.data.byFileType?.map(item => ({
            fileType: item[0] || 'Unknown',
            count: parseInt(item[1]) || 0
          })) || [],
          topCategories: docStatsRes.data.topCategories?.map(item => ({
            category: item[0] || 'Others',
            count: parseInt(item[1]) || 0
          })) || []
        };
        setDocumentStats(transformedStats);
      }

      if (expiryRes?.success) {
        setExpiryData(expiryRes.data);
      }
    } catch (error) {
      console.error('Analytics error:', error);
      toast.error('Failed to load analytics');
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
          Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Insights and statistics about your documents
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Storage sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {formatBytes(storageData?.totalStorageBytes)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Storage Used
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Description sx={{ fontSize: 40, color: 'secondary.main' }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {documentStats?.byFileType?.reduce((sum, item) => sum + (item.count || 0), 0) || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Documents
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUp sx={{ fontSize: 40, color: 'success.main' }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {documentStats?.averageFileSizeMB?.toFixed(1) || '0'} MB
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg File Size
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <StorageChart
            data={storageData?.storageByCategory || []}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <CategoryChart
            data={documentStats?.byFileType || []}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Expiry Breakdown */}
      {expiryData && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            Document Expiry Status
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.lighter', borderRadius: 1 }}>
                <Typography variant="h4" fontWeight="bold" color="error.main">
                  {expiryData.expired || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expired Documents
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {expiryData.expiringIn7Days || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expiring in 7 Days
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {expiryData.expiringIn30Days || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expiring in 30 Days
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Top Categories */}
      {documentStats?.topCategories && documentStats.topCategories.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="600">
            Top Categories
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Documents</TableCell>
                  <TableCell align="right">Percentage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documentStats.topCategories.slice(0, 5).map((cat, index) => {
                  const total = documentStats.topCategories.reduce((sum, c) => sum + (c.count || 0), 0);
                  const percentage = total > 0 ? ((cat.count / total) * 100).toFixed(1) : 0;
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip label={cat.category} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">{cat.count}</TableCell>
                      <TableCell align="right">{percentage}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
};

export default Analytics;