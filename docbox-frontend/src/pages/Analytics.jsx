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
import api from '../services/api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [storageStats, setStorageStats] = useState(null);
  const [expiryData, setExpiryData] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch storage stats from /documents/stats endpoint
      const statsResponse = await api.get('/documents/stats');
      
      if (statsResponse.data?.success) {
        const data = statsResponse.data.data;
        console.log('Storage Stats:', data);
        setStorageStats(data);
      }

      // Fetch expiring documents
      try {
        const expiryResponse = await api.get('/documents/expiring?days=30');
        if (expiryResponse.data?.success) {
          const expiringDocs = expiryResponse.data.data?.documents || [];
          
          const now = new Date();
          const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          const expired = expiringDocs.filter(doc => new Date(doc.expiryDate) < now).length;
          const expiring7 = expiringDocs.filter(doc => {
            const expiryDate = new Date(doc.expiryDate);
            return expiryDate >= now && expiryDate <= sevenDaysLater;
          }).length;
          const expiring30 = expiringDocs.filter(doc => {
            const expiryDate = new Date(doc.expiryDate);
            return expiryDate > sevenDaysLater && expiryDate <= thirtyDaysLater;
          }).length;
          
          setExpiryData({
            expired,
            expiringIn7Days: expiring7,
            expiringIn30Days: expiring30
          });
        }
      } catch (err) {
        console.log('Expiry data not available');
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

  // Transform storage by category data
  const getStorageByCategory = () => {
    if (!storageStats?.storageByCategory) return [];
    
    return storageStats.storageByCategory.map(item => ({
      category: item.category || 'Others',
      bytes: parseInt(item.bytes) || 0
    }));
  };

  // Transform documents by category data
  const getDocumentsByCategory = () => {
    if (!storageStats?.documentsByCategory) return [];
    
    return storageStats.documentsByCategory.map(item => ({
      category: item.category || 'Others',
      count: parseInt(item.count) || 0
    }));
  };

  // Transform documents by file type data
  const getDocumentsByFileType = () => {
    if (!storageStats?.documentsByFileType) return [];
    
    return storageStats.documentsByFileType.map(item => ({
      fileType: item.fileType || 'Unknown',
      count: parseInt(item.count) || 0
    }));
  };

  const getTotalDocuments = () => {
    if (!storageStats?.documentsByFileType) return 0;
    return storageStats.documentsByFileType.reduce((sum, item) => sum + (parseInt(item.count) || 0), 0);
  };

  const getAverageFileSize = () => {
    const total = getTotalDocuments();
    if (total === 0 || !storageStats?.totalStorageBytes) return 0;
    return (storageStats.totalStorageBytes / (1024 * 1024)) / total;
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
                  {formatBytes(storageStats?.totalStorageBytes)}
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
                  {getTotalDocuments()}
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
                  {getAverageFileSize().toFixed(1)} MB
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
            data={getStorageByCategory()}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <CategoryChart
            data={getDocumentsByCategory()}
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
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
                <Typography variant="h4" fontWeight="bold" color="error.main">
                  {expiryData.expired || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expired Documents
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {expiryData.expiringIn7Days || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expiring in 7 Days
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
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
      {getDocumentsByCategory().length > 0 && (
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
                {getDocumentsByCategory().slice(0, 5).map((cat, index) => {
                  const total = getTotalDocuments();
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