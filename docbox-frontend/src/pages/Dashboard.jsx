import React, { useEffect, useState, useCallback } from 'react';
import {
  Container, Grid, Box, Typography,
  Paper, Skeleton,
} from '@mui/material';
import {
  Description, Storage, Warning, People,
  CloudUpload, Analytics as AnalyticsIcon,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import RecentDocuments from '../components/Dashboard/RecentDocuments';
import ExpiryAlerts from '../components/Dashboard/ExpiryAlerts';
import analyticsService from '../services/analyticsService';
import documentService from '../services/documentService';

// ─── Metric Card ─────────────────────────────────────────────────────────────
const MetricCard = ({ title, value, subtitle, icon: Icon, accent, loading }) => (
  <Paper
    elevation={0}
    sx={{
      p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider',
      background: '#FFFFFF', position: 'relative', overflow: 'hidden',
      transition: 'transform 200ms ease, box-shadow 200ms ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
    }}
  >
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '16px 16px 0 0' }} />
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <Box>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
          {title}
        </Typography>
        {loading
          ? <Skeleton variant="text" width={80} height={40} />
          : <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: '#0F172A', lineHeight: 1, mb: 0.5, letterSpacing: '-0.03em' }}>{value}</Typography>
        }
        <Typography sx={{ fontSize: '0.8rem', color: '#94A3B8' }}>{subtitle}</Typography>
      </Box>
      <Box sx={{
        width: 48, height: 48, borderRadius: '12px', background: `${accent}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon sx={{ fontSize: 22, color: accent }} />
      </Box>
    </Box>
  </Paper>
);

// ─── Quick Action ─────────────────────────────────────────────────────────────
const QuickAction = ({ icon: Icon, label, description, onClick, accent }) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex', alignItems: 'center', gap: 2, p: 2.5,
      borderRadius: '12px', border: '1px solid #E2E8F0', background: '#FFFFFF',
      cursor: 'pointer', transition: 'all 180ms ease',
      '&:hover': { borderColor: accent, boxShadow: `0 0 0 3px ${accent}18, 0 4px 12px rgba(15,23,42,0.06)`, transform: 'translateY(-1px)' },
    }}
  >
    <Box sx={{ width: 44, height: 44, borderRadius: '10px', background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon sx={{ fontSize: 20, color: accent }} />
    </Box>
    <Box sx={{ flex: 1 }}>
      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#0F172A' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.78rem', color: '#64748B' }}>{description}</Typography>
    </Box>
    <ArrowForward sx={{ fontSize: 16, color: '#CBD5E1' }} />
  </Box>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
};

const formatPercentage = (p) => {
  const num = Number(p);
  return (!p || isNaN(num)) ? '0.00' : num.toFixed(2);
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Extract the document array from ANY known API response shape.
 *
 * Backend always returns:
 *   { success: true, data: { documents: [...], totalElements: N } }
 *
 * documentService returns the axios response body (the ApiResponse object),
 * so documents live at: apiResponse.data.documents
 */
const extractDocuments = (apiResponse) => {
  if (!apiResponse) return [];
  if (Array.isArray(apiResponse?.data?.documents)) return apiResponse.data.documents;
  if (Array.isArray(apiResponse?.data?.content))   return apiResponse.data.content;
  if (Array.isArray(apiResponse?.data))             return apiResponse.data;
  if (Array.isArray(apiResponse?.documents))        return apiResponse.documents;
  if (Array.isArray(apiResponse?.content))          return apiResponse.content;
  if (Array.isArray(apiResponse))                   return apiResponse;
  return [];
};

/**
 * Fetch expiry data directly via documentService endpoints.
 *
 * GET /api/documents/expiring?days=30
 *   → docs where expiryDate BETWEEN today AND today+30
 *   → each doc has isExpired (bool) and isExpiringSoon (bool) set by buildDocumentResponse()
 *
 * GET /api/documents  (getMyDocuments / getDocuments)
 *   → all docs; we filter by isExpired===true or expiryDate < today for expired list
 *
 * NOTE: expired docs do NOT appear in /expiring because the DB query is
 *       findDocumentsExpiringBetween(userId, LocalDate.now(), LocalDate.now().plusDays(days))
 *       which excludes past dates.
 */
const fetchExpiryData = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let urgentDocuments = [];
  let expiredDocuments = [];

  // ── Step 1: expiring within 30 days ────────────────────────────────────
  try {
    const res = await documentService.getExpiringDocuments(30);
    const docs = extractDocuments(res);
    urgentDocuments = docs.filter(doc => {
      if (!doc.expiryDate) return false;
      return new Date(doc.expiryDate) >= today; // only future dates
    });
    console.log('[Dashboard] /expiring?days=30 →', docs.length, 'docs, urgent:', urgentDocuments.length);
  } catch (e) {
    console.warn('[Dashboard] getExpiringDocuments(30) failed:', e?.message);
  }

  // ── Step 2: already-expired docs ───────────────────────────────────────
  // /expiring only returns future dates, so we fetch all docs and filter.
  try {
    // Try paginated first, fall back to getMyDocuments
    let allDocsRes;
    try {
      allDocsRes = await documentService.getDocuments(0, 200);
    } catch {
      allDocsRes = await documentService.getMyDocuments();
    }
    const allDocs = extractDocuments(allDocsRes);
    expiredDocuments = allDocs.filter(doc => {
      if (!doc.expiryDate) return false;
      if (doc.isExpired === true)  return true;
      if (doc.isExpired === false) return false;
      // fallback: compute from date string
      return new Date(doc.expiryDate) < today;
    });
    console.log('[Dashboard] all docs →', allDocs.length, ', expired:', expiredDocuments.length);
  } catch (e) {
    console.warn('[Dashboard] all-docs fetch for expired filter failed:', e?.message);
  }

  return { urgentDocuments, expiredDocuments };
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading,       setLoading]       = useState(true);
  const [expiryLoading, setExpiryLoading] = useState(true);
  const [stats,         setStats]         = useState(null);
  const [recentDocs,    setRecentDocs]    = useState([]);
  const [expiryData,    setExpiryData]    = useState({ urgentDocuments: [], expiredDocuments: [] });

  const loadExpiryData = useCallback(async () => {
    setExpiryLoading(true);
    try {
      const result = await fetchExpiryData();
      setExpiryData(result);
    } finally {
      setExpiryLoading(false);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, docsRes] = await Promise.all([
        analyticsService.getDashboardStats().catch(() => null),
        documentService.getDocuments(0, 5).catch(
          () => documentService.getMyDocuments?.().catch(() => null)
        ),
      ]);

      // stats may be wrapped: { success, data: {...} } or flat
      if (statsRes?.data)    setStats(statsRes.data);
      else if (statsRes)     setStats(statsRes);

      if (docsRes) {
        const docs = extractDocuments(docsRes);
        setRecentDocs(docs.slice(0, 5));
      }
    } catch (error) {
      console.error('[Dashboard] loadDashboardData error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadExpiryData();
  }, [loadDashboardData, loadExpiryData]);

  return (
    <Container maxWidth="lg" sx={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: { xs: '1.75rem', sm: '2.25rem' },
          fontWeight: 400, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.5,
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
            icon: Description, accent: '#6366F1',
          },
          {
            title: 'Storage Used',
            value: formatBytes(stats?.storageUsedBytes),
            subtitle: (() => {
              const used  = stats?.storageUsedBytes;
              const limit = stats?.storageLimitBytes ?? stats?.storageLimit ?? stats?.limitBytes ?? (5 * 1024 * 1024 * 1024);

              const pct = Math.min((used / limit) * 100, 100);
              const pctStr = pct < 0.1 ? '< 0.1%' : pct < 1 ? `${pct.toFixed(2)}%` : `${pct.toFixed(1)}%`;
              return `${pctStr} of ${formatBytes(limit)}`;
            })(),
            icon: Storage, accent: '#3B82F6',
          },
          {
            title: 'Expiring Soon',
            // Synced with ExpiryAlerts — uses live expiryData count
            value: expiryLoading
              ? '…'
              : (expiryData.urgentDocuments.length > 0
                  ? expiryData.urgentDocuments.length
                  : (stats?.documentsExpiringSoon ?? '—')),
            subtitle: 'Within next 30 days',
            icon: Warning, accent: '#F59E0B',
          },
          {
            title: 'Family Members',
            value: stats?.totalFamilyMembers ?? '—',
            subtitle: 'Active collaborators',
            icon: People, accent: '#10B981',
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
            <QuickAction icon={CloudUpload} label="Upload Document" description="Add new files to your vault" onClick={() => navigate('/documents')} accent="#6366F1" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <QuickAction icon={AnalyticsIcon} label="View Analytics" description="Storage & usage insights" onClick={() => navigate('/analytics')} accent="#3B82F6" />
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
            expiringDocuments={expiryData.urgentDocuments}
            expiredDocuments={expiryData.expiredDocuments}
            loading={expiryLoading}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;