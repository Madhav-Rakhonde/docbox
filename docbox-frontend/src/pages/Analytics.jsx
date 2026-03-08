import React, { useEffect, useState } from 'react';
import {
  Container, Grid, Box, Typography, Paper,
  CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';
import { Storage, Description, TrendingUp, BarChart } from '@mui/icons-material';
import { toast } from 'react-toastify';
import StorageChart from '../components/Analytics/StorageChart';
import CategoryChart from '../components/Analytics/CategoryChart';
import api from '../services/api';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatPill = ({ icon: Icon, label, value, color }) => (
  <Paper elevation={0} sx={{
    p: 2.5,
    borderRadius: '14px',
    border: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    background: '#FFFFFF',
    transition: 'transform 200ms ease, box-shadow 200ms ease',
    '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(15,23,42,0.07)' },
  }}>
    <Box sx={{
      width: 48, height: 48,
      borderRadius: '12px',
      background: `${color}15`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon sx={{ fontSize: 22, color }} />
    </Box>
    <Box>
      <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.8rem', color: '#64748B', mt: 0.25 }}>
        {label}
      </Typography>
    </Box>
  </Paper>
);

// ─── Expiry Box ───────────────────────────────────────────────────────────────
const ExpiryBox = ({ value, label, bg, color }) => (
  <Box sx={{ textAlign: 'center', p: 2.5, background: bg, borderRadius: '12px', border: `1px solid ${color}30` }}>
    <Typography sx={{ fontSize: '2rem', fontWeight: 700, color, letterSpacing: '-0.04em', lineHeight: 1 }}>
      {value ?? 0}
    </Typography>
    <Typography sx={{ fontSize: '0.8rem', color: '#64748B', mt: 0.5, fontWeight: 500 }}>
      {label}
    </Typography>
  </Box>
);

// ─── Analytics Page ───────────────────────────────────────────────────────────
const Analytics = () => {
  const [loading, setLoading]       = useState(true);
  const [storageStats, setStorageStats] = useState(null);
  const [expiryData, setExpiryData]   = useState(null);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const statsResponse = await api.get('/documents/stats');
      if (statsResponse.data?.success) {
        setStorageStats(statsResponse.data.data);
      }

      try {
        const expiryResponse = await api.get('/documents/expiring?days=30');
        if (expiryResponse.data?.success) {
          const expiringDocs = expiryResponse.data.data?.documents || [];
          const now = new Date();
          const d7  = new Date(now.getTime() + 7  * 86400000);
          const d30 = new Date(now.getTime() + 30 * 86400000);
          setExpiryData({
            expired:         expiringDocs.filter(d => new Date(d.expiryDate) < now).length,
            expiringIn7Days: expiringDocs.filter(d => { const e = new Date(d.expiryDate); return e >= now && e <= d7; }).length,
            expiringIn30Days: expiringDocs.filter(d => { const e = new Date(d.expiryDate); return e > d7 && e <= d30; }).length,
          });
        }
      } catch { /* Expiry data unavailable */ }
    } catch (error) {
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

  const getStorageByCategory   = () => (storageStats?.storageByCategory || []).map(i => ({ category: i.category || 'Others', bytes: parseInt(i.bytes) || 0 }));
  const getDocumentsByCategory = () => (storageStats?.documentsByCategory || []).map(i => ({ category: i.category || 'Others', count: parseInt(i.count) || 0 }));

  const getTotalDocuments = () =>
    (storageStats?.documentsByFileType || []).reduce((s, i) => s + (parseInt(i.count) || 0), 0);

  const getAverageFileSize = () => {
    const total = getTotalDocuments();
    if (!total || !storageStats?.totalStorageBytes) return 0;
    return (storageStats.totalStorageBytes / (1024 * 1024)) / total;
  };

  // ── Status colors per category rank ──────────────────────────────────────
  const RANK_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: { xs: '1.75rem', sm: '2.25rem' },
          fontWeight: 400,
          color: '#0F172A',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          mb: 0.5,
        }}>
          Analytics
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.9375rem' }}>
          Insights and statistics about your document vault
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <StatPill
            icon={Storage}
            label="Total Storage Used"
            value={formatBytes(storageStats?.totalStorageBytes)}
            color="#6366F1"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatPill
            icon={Description}
            label="Total Documents"
            value={getTotalDocuments()}
            color="#3B82F6"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatPill
            icon={TrendingUp}
            label="Average File Size"
            value={`${getAverageFileSize().toFixed(1)} MB`}
            color="#10B981"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 0, borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>Storage by Category</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8' }}>Distribution across document types</Typography>
            </Box>
            <StorageChart data={getStorageByCategory()} loading={loading} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 0, borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>Documents by Category</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8' }}>Count per document category</Typography>
            </Box>
            <CategoryChart data={getDocumentsByCategory()} loading={loading} />
          </Paper>
        </Grid>
      </Grid>

      {/* Expiry Status */}
      {expiryData && (
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <Box sx={{ width: 4, height: 18, background: '#EF4444', borderRadius: 2 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>
              Document Expiry Status
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <ExpiryBox value={expiryData.expired}         label="Expired Documents"    bg="#FEF2F2" color="#EF4444" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <ExpiryBox value={expiryData.expiringIn7Days}  label="Expiring in 7 Days"   bg="#FFFBEB" color="#F59E0B" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <ExpiryBox value={expiryData.expiringIn30Days} label="Expiring in 30 Days"  bg="#EFF6FF" color="#3B82F6" />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Top Categories Table */}
      {getDocumentsByCategory().length > 0 && (
        <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 1 }}>
            <BarChart sx={{ fontSize: 18, color: '#6366F1' }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>Top Categories</Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Documents</TableCell>
                  <TableCell align="right">Share</TableCell>
                  <TableCell align="right">Progress</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getDocumentsByCategory().slice(0, 5).map((cat, index) => {
                  const total      = getTotalDocuments();
                  const percentage = total > 0 ? (cat.count / total) * 100 : 0;
                  const color      = RANK_COLORS[index] || '#94A3B8';
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#0F172A' }}>
                            {cat.category}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontWeight: 600, color: '#0F172A' }}>{cat.count}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontSize: '0.85rem', color: '#64748B' }}>{percentage.toFixed(1)}%</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                          <Box sx={{
                            width: 80, height: 6,
                            borderRadius: 99,
                            background: '#F1F5F9',
                            overflow: 'hidden',
                          }}>
                            <Box sx={{
                              width: `${percentage}%`,
                              height: '100%',
                              background: color,
                              borderRadius: 99,
                              transition: 'width 600ms ease',
                            }} />
                          </Box>
                        </Box>
                      </TableCell>
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