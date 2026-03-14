import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import api from '../services/api';

// ─── Metric Card ─────────────────────────────────────────────────────────────────────────────
const MetricCard = ({ title, value, subtitle, icon: Icon, accent, loading }) => (
  <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider', background: '#FFFFFF', position: 'relative', overflow: 'hidden', transition: 'transform 200ms ease, box-shadow 200ms ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' } }}>
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '16px 16px 0 0' }} />
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <Box>
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>{title}</Typography>
        {loading ? <Skeleton variant="text" width={80} height={40} /> : <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: '#0F172A', lineHeight: 1, mb: 0.5, letterSpacing: '-0.03em' }}>{value}</Typography>}
        <Typography sx={{ fontSize: '0.8rem', color: '#94A3B8' }}>{subtitle}</Typography>
      </Box>
      <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon sx={{ fontSize: 22, color: accent }} />
      </Box>
    </Box>
  </Paper>
);

// ─── Quick Action ─────────────────────────────────────────────────────────────────────────────
const QuickAction = ({ icon: Icon, label, description, onClick, accent }) => (
  <Box onClick={onClick} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5, borderRadius: '12px', border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer', transition: 'all 180ms ease', '&:hover': { borderColor: accent, boxShadow: `0 0 0 3px ${accent}18, 0 4px 12px rgba(15,23,42,0.06)`, transform: 'translateY(-1px)' } }}>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1)    return `${Math.round(bytes / 1024)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const extractDocuments = (res) => {
  if (!res) return [];
  if (Array.isArray(res?.data?.documents)) return res.data.documents;
  if (Array.isArray(res?.data?.content))   return res.data.content;
  if (Array.isArray(res?.data))            return res.data;
  if (Array.isArray(res?.documents))       return res.documents;
  if (Array.isArray(res?.content))         return res.content;
  if (Array.isArray(res))                  return res;
  return [];
};

const fetchExpiryData = async () => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let urgentDocuments = [], expiredDocuments = [];
  try {
    const docs = extractDocuments(await documentService.getExpiringDocuments(30));
    urgentDocuments = docs.filter(d => d.expiryDate && new Date(d.expiryDate) >= today);
  } catch (e) { console.warn('[Dashboard] getExpiringDocuments failed:', e?.message); }
  try {
    let r; try { r = await documentService.getDocuments(0, 200); } catch { r = await documentService.getMyDocuments?.(); }
    expiredDocuments = extractDocuments(r).filter(d => {
      if (!d.expiryDate) return false;
      if (d.isExpired === true)  return true;
      if (d.isExpired === false) return false;
      return new Date(d.expiryDate) < today;
    });
  } catch (e) { console.warn('[Dashboard] expired docs fetch failed:', e?.message); }
  return { urgentDocuments, expiredDocuments };
};

// ─── Collect every document this user can access ─────────────────────────────
//
//  Uses ONLY confirmed backend endpoints:
//   • GET /api/offline/manifest  → returns ALL docs the current user can access
//     (works for both primary AND sub-accounts — OfflineService handles the logic)
//   • GET /api/documents?page=0&size=1000 → own documents (fallback)
//
//  We do NOT call /permissions/my-accessible-documents or ?userId= params
//  because those endpoints are not stable / not implemented yet.
//
const fetchAllAccessibleDocs = async () => {
  const seen = new Set();
  const all  = [];

  const add = (docs) => {
    for (const d of (docs || [])) {
      if (d?.id && !seen.has(d.id)) { seen.add(d.id); all.push(d); }
    }
  };

  // PRIMARY STRATEGY: /api/offline/manifest
  // OfflineService.getOfflineManifest() already handles both account types:
  //   - Primary account  → finds ALL family documents via findAllDocumentsForPrimaryAccount()
  //   - Sub-account      → finds docs the sub-account user owns via findByUser()
  // This is a single call that covers everything — most efficient approach.
  try {
    const res = await api.get('/offline/manifest');
    if (res.data?.success) {
      const manifestDocs = (res.data.data?.documents || []).map(d => ({
        id:         d.id,
        updatedAt:  d.updatedAt,
        uploadedAt: d.createdAt || d.uploadedAt,
      }));
      add(manifestDocs);
      console.log('[DocBox] Manifest returned', manifestDocs.length, 'accessible docs');
    }
  } catch (e) {
    console.warn('[DocBox] /offline/manifest failed, falling back to own docs:', e?.message);

    // FALLBACK: just own documents if manifest endpoint fails
    try {
      add(extractDocuments(await documentService.getDocuments(0, 1000)));
    } catch { /* total failure — syncOfflineCache will get empty list and only evict */ }
  }

  console.log('[DocBox] Total docs queued for cache sync:', all.length);
  return all;
};

// ─── Sync offline cache ────────────────────────────────────────────────────────────────────────────────────────────
//
//  All critical scenarios handled:
//   ① Doc deleted by owner                → evict from cache
//   ② Permission revoked on sub-account   → evict (not in accessible list anymore)
//   ③ Family member removed               → their docs evicted from primary cache
//   ④ New doc uploaded                    → fetch + cache
//   ⑤ Doc file replaced / updated         → re-fetch (updatedAt changed)
//   ⑥ Doc unchanged                       → skip (zero network request)
//   ⑦ Network error for one file          → skip silently, retry next session
//   ⑧ Browser has no Cache API            → graceful no-op
//
const syncOfflineCache = async (documents) => {
  if (!("caches" in window)) return;
  if (!navigator.onLine)     return;
  if (!documents?.length)    return;

  const CACHE_NAME = 'docbox-docs-v1';

  try {
    const cache = await caches.open(CACHE_NAME);

    // Build expected URL map
    const liveMap = new Map();
    for (const doc of documents) {
      const abs = new URL(`/api/documents/${doc.id}/download`, window.location.origin).href;
      liveMap.set(abs, doc.updatedAt || doc.uploadedAt || null);
    }

    // Evict files that are no longer accessible
    let evicted = 0;
    for (const req of await cache.keys()) {
      if (!req.url.includes('/api/documents/') || !req.url.includes('/download')) continue;
      if (!liveMap.has(req.url)) { await cache.delete(req); evicted++; }
    }

    // Refresh key set after evictions
    const cachedUrls = new Set((await cache.keys()).map(r => r.url));

    // Add new / re-fetch updated
    let added = 0, skipped = 0;
    for (const doc of documents) {
      const rel = `/api/documents/${doc.id}/download`;
      const abs = new URL(rel, window.location.origin).href;

      if (cachedUrls.has(abs)) {
        const existing  = await cache.match(abs);
        const cachedTs  = existing?.headers?.get('x-docbox-cached-at');
        const serverTs  = doc.updatedAt || doc.uploadedAt || null;
        if (cachedTs && serverTs && cachedTs === serverTs) { skipped++; continue; }
      }

      try {
        const resp = await fetch(rel, { credentials: 'include' });
        if (resp.ok) {
          const h = new Headers(resp.headers);
          h.set('x-docbox-cached-at', doc.updatedAt || doc.uploadedAt || '');
          const stamped = new Response(await resp.blob(), { status: resp.status, statusText: resp.statusText, headers: h });
          await cache.put(rel, stamped);
          added++;
        }
      } catch { /* skip this file silently */ }
    }

    console.log(`[DocBox] Sync done — +${added} cached, ~${skipped} fresh, -${evicted} evicted`);
  } catch (err) {
    console.warn('[DocBox] Cache sync error:', err?.message);
  }
};

// ─── Dashboard ──────────────────────────────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const cacheFiredRef = useRef(false);

  const [loading,       setLoading]       = useState(true);
  const [expiryLoading, setExpiryLoading] = useState(true);
  const [stats,         setStats]         = useState(null);
  const [recentDocs,    setRecentDocs]    = useState([]);
  const [expiryData,    setExpiryData]    = useState({ urgentDocuments: [], expiredDocuments: [] });

  const loadExpiryData = useCallback(async () => {
    setExpiryLoading(true);
    try   { setExpiryData(await fetchExpiryData()); }
    finally { setExpiryLoading(false); }
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, docsRes] = await Promise.all([
        analyticsService.getDashboardStats().catch(() => null),
        documentService.getDocuments(0, 5).catch(() => documentService.getMyDocuments?.().catch(() => null)),
      ]);

      if (statsRes?.data) setStats(statsRes.data);
      else if (statsRes)  setStats(statsRes);

      if (docsRes) {
        const docs = extractDocuments(docsRes);
        setRecentDocs(docs.slice(0, 5));

        // Background cache sync — once per session, works for ALL account types
        if (navigator.onLine && !cacheFiredRef.current) {
          cacheFiredRef.current = true;
          fetchAllAccessibleDocs()
            .then(all => syncOfflineCache(all.length > 0 ? all : docs))
            .catch(()  => syncOfflineCache(docs));
        }
      }
    } catch (error) {
      console.error('[Dashboard] loadDashboardData error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
    loadExpiryData();
  }, [loadDashboardData, loadExpiryData]);

  return (
    <Container maxWidth="lg" sx={{ animation: 'fadeUp 0.35s ease both' }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontFamily: "'DM Serif Display', serif", fontSize: { xs: '1.75rem', sm: '2.25rem' }, fontWeight: 400, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.5 }}>
          {greeting()}, {user?.fullName?.split(' ')[0]} 👋
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.9375rem' }}>
          Here's what's happening with your documents today.
        </Typography>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Total Documents', value: stats?.totalDocuments ?? '—', subtitle: 'All stored documents', icon: Description, accent: '#6366F1' },
          { title: 'Storage Used', value: formatBytes(stats?.storageUsedBytes), subtitle: (() => { const used = stats?.storageUsedBytes; const limit = stats?.storageLimitBytes ?? stats?.storageLimit ?? stats?.limitBytes ?? (5*1024*1024*1024); const pct = Math.min((used/limit)*100,100); return `${pct<0.1?'< 0.1%':pct<1?`${pct.toFixed(2)}%`:`${pct.toFixed(1)}%`} of ${formatBytes(limit)}`; })(), icon: Storage, accent: '#3B82F6' },
          { title: 'Expiring Soon', value: expiryLoading ? '…' : (expiryData.urgentDocuments.length > 0 ? expiryData.urgentDocuments.length : (stats?.documentsExpiringSoon ?? '—')), subtitle: 'Within next 30 days', icon: Warning, accent: '#F59E0B' },
          { title: 'Family Members', value: stats?.totalFamilyMembers ?? '—', subtitle: 'Active collaborators', icon: People, accent: '#10B981' },
        ].map((card) => (
          <Grid item xs={12} sm={6} key={card.title}><MetricCard {...card} loading={loading} /></Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1.5 }}>Quick Actions</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><QuickAction icon={CloudUpload}   label="Upload Document" description="Add new files to your vault"   onClick={() => navigate('/documents')} accent="#6366F1" /></Grid>
          <Grid item xs={12} sm={6}><QuickAction icon={AnalyticsIcon} label="View Analytics"  description="Storage & usage insights"      onClick={() => navigate('/analytics')} accent="#3B82F6" /></Grid>
        </Grid>
      </Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}><RecentDocuments documents={recentDocs} loading={loading} /></Grid>
        <Grid item xs={12} md={6}><ExpiryAlerts expiringDocuments={expiryData.urgentDocuments} expiredDocuments={expiryData.expiredDocuments} loading={expiryLoading} /></Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;