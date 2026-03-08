import React, { useEffect, useState } from 'react';
import {
  Container, Grid, Box, Typography, Button,
  CircularProgress, Paper, Skeleton,
} from '@mui/material';
import {
  Description, Storage, Warning, People,
  CloudUpload, Analytics as AnalyticsIcon,
  ArrowForward, TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import StatsCard from '../components/Dashboard/StatsCard';
import RecentDocuments from '../components/Dashboard/RecentDocuments';
import ExpiryAlerts from '../components/Dashboard/ExpiryAlerts';
import analyticsService from '../services/analyticsService';
import documentService from '../services/documentService';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const MetricCard = ({ title, value, subtitle, icon: Icon, accent, loading }) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      borderRadius: '16px',
      border: '1px solid',
      borderColor: 'divider',
      background: '#FFFFFF',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 200ms ease, box-shadow 200ms ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
      },
    }}
  >
    {/* Accent top bar */}
    <Box sx={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: 3,
      background: accent,
      borderRadius: '16px 16px 0 0',
    }} />

    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <Box>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
          {title}
        </Typography>
        {loading
          ? <Skeleton variant="text" width={80} height={40} />
          : (
            <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: '#0F172A', lineHeight: 1, mb: 0.5, letterSpacing: '-0.03em' }}>
              {value}
            </Typography>
          )
        }
        <Typography sx={{ fontSize: '0.8rem', color: '#94A3B8' }}>
          {subtitle}
        </Typography>
      </Box>
      <Box sx={{
        width: 48, height: 48,
        borderRadius: '12px',
        background: accent.includes('gradient') ? accent : `${accent}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon sx={{ fontSize: 22, color: accent.includes('#') && !accent.includes('gradient') ? accent : 'white' }} />
      </Box>
    </Box>
  </Paper>
);

// ─── Quick Action Card ────────────────────────────────────────────────────────
const QuickAction = ({ icon: Icon, label, description, onClick, accent }) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      p: 2.5,
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      background: '#FFFFFF',
      cursor: 'pointer',
      transition: 'all 180ms ease',
      '&:hover': {
        borderColor: accent,
        boxShadow: `0 0 0 3px ${accent}18, 0 4px 12px rgba(15,23,42,0.06)`,
        transform: 'translateY(-1px)',
      },
    }}
  >
    <Box sx={{
      width: 44, height: 44,
      borderRadius: '10px',
      background: `${accent}15`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon sx={{ fontSize: 20, color: accent }} />
    </Box>
    <Box sx={{ flex: 1 }}>
      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#0F172A' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.78rem', color: '#64748B' }}>{description}</Typography>
    </Box>
    <ArrowForward sx={{ fontSize: 16, color: '#CBD5E1' }} />
  </Box>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [loading, setLoading]     = useState(true);
  const [stats, setStats]         = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [expiryData, setExpiryData] = useState(null);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, docsRes, expiryRes] = await Promise.all([
        analyticsService.getDashboardStats().catch(() => null),
        documentService.getDocuments(0, 5).catch(() => null),
        analyticsService.getExpiryInsights().catch(() => null),
      ]);

      if (statsRes?.success) setStats(statsRes.data);

      if (docsRes) {
        let docs = [];
        if (docsRes.success && docsRes.data) {
          const d = docsRes.data;
          docs = d.documents || d.content || d.data?.documents || d.data?.content || (Array.isArray(d) ? d : []);
        } else if (docsRes.data) {
          const d = docsRes.data;
          docs = d.documents || d.content || (Array.isArray(d) ? d : []);
        } else if (Array.isArray(docsRes)) {
          docs = docsRes;
        }
        setRecentDocs(Array.isArray(docs) ? docs : []);
      }

      if (expiryRes?.success) setExpiryData(expiryRes.data);
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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Container maxWidth="lg" sx={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* ── Header ── */}
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
          {greeting()}, {user?.fullName?.split(' ')[0]} 👋
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.9375rem' }}>
          Here's what's happening with your documents today.
        </Typography>
      </Box>

      {/* ── Metric Cards ── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          {
            title: 'Total Documents',
            value: stats?.totalDocuments ?? '—',
            subtitle: 'All stored documents',
            icon: Description,
            accent: '#6366F1',
          },
          {
            title: 'Storage Used',
            value: formatBytes(stats?.storageUsedBytes),
            subtitle: `${stats?.storagePercentage?.toFixed(1) ?? 0}% of your limit`,
            icon: Storage,
            accent: '#3B82F6',
          },
          {
            title: 'Expiring Soon',
            value: stats?.documentsExpiringSoon ?? '—',
            subtitle: 'Within next 30 days',
            icon: Warning,
            accent: '#F59E0B',
          },
          {
            title: 'Family Members',
            value: stats?.totalFamilyMembers ?? '—',
            subtitle: 'Active collaborators',
            icon: People,
            accent: '#10B981',
          },
        ].map((card) => (
          <Grid item xs={12} sm={6} key={card.title}>
            <MetricCard {...card} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* ── Quick Actions ── */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1.5 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <QuickAction
              icon={CloudUpload}
              label="Upload Document"
              description="Add new files to your vault"
              onClick={() => navigate('/documents')}
              accent="#6366F1"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <QuickAction
              icon={AnalyticsIcon}
              label="View Analytics"
              description="Storage & usage insights"
              onClick={() => navigate('/analytics')}
              accent="#3B82F6"
            />
          </Grid>
        </Grid>
      </Box>

      {/* ── Recent & Alerts ── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <RecentDocuments documents={recentDocs} loading={loading} />
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