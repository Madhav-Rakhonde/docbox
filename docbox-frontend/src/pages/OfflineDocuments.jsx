/**
 * OfflineDocuments.jsx
 * Shows documents that have been cached for offline viewing.
 * Add a route: <Route path="/offline-documents" element={<OfflineDocuments />} />
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Grid, Paper,
  Chip, IconButton, CircularProgress, Alert, Button,
  LinearProgress, Tooltip,
} from '@mui/material';
import {
  WifiOff, Download, InsertDriveFile, CloudDone,
  Refresh, CloudDownload, CheckCircle,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import documentService from '../services/documentService';

// ─── useServiceWorker (inline — no separate file needed) ──────────────────
const useServiceWorker = () => {
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [swReady,       setSwReady]       = useState(false);
  const [cacheProgress, setCacheProgress] = useState(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(() => setSwReady(true));

    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    const onMessage = (e) => {
      if (e.data?.type === 'DOCUMENTS_CACHED') setCacheProgress(null);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  const cacheDocuments = useCallback((documents) => {
    if (!swReady || !navigator.serviceWorker.controller) return;
    if (!documents?.length) return;
    setCacheProgress({ total: documents.length });
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_DOCUMENTS', documents });
  }, [swReady]);

  return { isOnline, swReady, cacheDocuments, cacheProgress };
};

// ─── Document Card ────────────────────────────────────────────────────────
const OfflineDocCard = ({ doc, isCached, onCache, onDownload }) => (
  <Paper elevation={0} sx={{
    p: 2.5,
    borderRadius: '14px',
    border: '1px solid',
    borderColor: isCached ? 'rgba(16,185,129,0.3)' : '#E2E8F0',
    background: isCached ? 'rgba(16,185,129,0.04)' : '#FFFFFF',
    transition: 'all 200ms ease',
    position: 'relative',
    overflow: 'hidden',
  }}>
    {isCached && (
      <Box sx={{
        position: 'absolute', top: 10, right: 10,
        width: 8, height: 8, borderRadius: '50%', background: '#10B981',
        boxShadow: '0 0 6px rgba(16,185,129,0.6)',
      }} />
    )}
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
      <Box sx={{
        width: 42, height: 42, borderRadius: '10px', flexShrink: 0,
        background: isCached ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <InsertDriveFile sx={{ fontSize: 20, color: isCached ? '#10B981' : '#6366F1' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: '0.85rem', fontWeight: 600, color: '#0F172A',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={doc.originalFilename}>
          {doc.originalFilename}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
          {doc.category?.name && (
            <Chip label={doc.category.name} size="small"
              sx={{ height: 18, fontSize: '0.65rem', background: '#F1F5F9', color: '#475569' }} />
          )}
          {isCached && (
            <Chip icon={<CheckCircle sx={{ fontSize: '10px !important' }} />}
              label="Available offline" size="small"
              sx={{ height: 18, fontSize: '0.65rem', background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }} />
          )}
        </Box>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
      {!isCached && navigator.onLine && (
        <Tooltip title="Save for offline">
          <IconButton size="small" onClick={() => onCache(doc)}
            sx={{ borderRadius: '8px', border: '1px solid #E2E8F0', color: '#6366F1' }}>
            <CloudDownload sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title={isCached ? 'Download (works offline)' : 'Download (requires internet)'}>
        <span>
          <IconButton size="small" onClick={() => onDownload(doc)} disabled={!isCached && !navigator.onLine}
            sx={{ borderRadius: '8px', border: '1px solid #E2E8F0', color: '#475569' }}>
            <Download sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  </Paper>
);

// ─── Main ─────────────────────────────────────────────────────────────────
const OfflineDocuments = () => {
  const { isOnline, swReady, cacheDocuments, cacheProgress } = useServiceWorker();
  const [documents, setDocuments]     = useState([]);
  const [cachedIds, setCachedIds]     = useState(new Set());
  const [loading, setLoading]         = useState(true);
  const [caching, setCaching]         = useState(false);

  useEffect(() => {
    loadDocuments();
    checkCachedDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentService.getDocuments(0, 200);
      const docs = response.data?.documents || response.data || [];
      setDocuments(docs);
    } catch (err) {
      // If offline, try to show whatever we have
      console.warn('Could not load from network:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check which docs are already in the SW cache
  const checkCachedDocuments = async () => {
    if (!('caches' in window)) return;
    try {
      const cache   = await caches.open('docbox-docs-v1');
      const keys    = await cache.keys();
      const ids     = new Set(
        keys
          .map((req) => {
            const m = req.url.match(/\/api\/documents\/(\d+)\/download/);
            return m ? m[1] : null;
          })
          .filter(Boolean)
      );
      setCachedIds(ids);
    } catch (e) {
      console.warn('Cache check failed:', e);
    }
  };

  const handleCacheAll = () => {
    if (!swReady) { toast.error('Service worker not ready yet'); return; }
    setCaching(true);
    cacheDocuments(documents);
    // Re-check cached IDs after a delay
    setTimeout(() => { checkCachedDocuments(); setCaching(false); }, 3000 + documents.length * 200);
    toast.info(`Caching ${documents.length} documents for offline use…`);
  };

  const handleCacheOne = (doc) => {
    cacheDocuments([doc]);
    setTimeout(checkCachedDocuments, 2000);
    toast.info(`Saving "${doc.originalFilename}" for offline…`);
  };

  const handleDownload = (doc) => {
    documentService.downloadDocument(doc.id, doc.originalFilename);
  };

  const cachedCount = documents.filter((d) => cachedIds.has(String(d.id))).length;

  return (
    <Container maxWidth="lg" sx={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: { xs: '1.75rem', sm: '2.25rem' },
          fontWeight: 400, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.25,
        }}>
          Offline Access
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
          Documents saved to your device — accessible without internet
        </Typography>
      </Box>

      {/* Status banner */}
      <Paper elevation={0} sx={{
        p: 2.5, mb: 3, borderRadius: '14px',
        border: '1px solid',
        borderColor: isOnline ? '#E2E8F0' : 'rgba(99,102,241,0.3)',
        background: isOnline ? '#FFFFFF' : 'rgba(99,102,241,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isOnline
            ? <CloudDone sx={{ color: '#10B981', fontSize: 22 }} />
            : <WifiOff sx={{ color: '#6366F1', fontSize: 22 }} />
          }
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>
              {isOnline ? 'Online' : 'Offline Mode'}
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: '#64748B' }}>
              {cachedCount} of {documents.length} documents cached locally
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" startIcon={<Refresh sx={{ fontSize: 15 }} />}
            onClick={() => { loadDocuments(); checkCachedDocuments(); }}
            disabled={!isOnline}
            sx={{ borderRadius: '8px', border: '1px solid #E2E8F0', color: '#475569', fontSize: '0.78rem' }}>
            Refresh
          </Button>
          <Button size="small" variant="contained"
            startIcon={caching ? <CircularProgress size={13} color="inherit" /> : <CloudDownload sx={{ fontSize: 15 }} />}
            onClick={handleCacheAll}
            disabled={!isOnline || !swReady || caching || documents.length === 0}
            sx={{
              borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' },
            }}>
            {caching ? 'Caching…' : 'Cache All'}
          </Button>
        </Box>
      </Paper>

      {/* Cache progress */}
      {cacheProgress && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress variant="indeterminate" sx={{ borderRadius: 99, height: 4, background: '#E2E8F0',
            '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #6366F1, #10B981)' } }} />
          <Typography sx={{ fontSize: '0.75rem', color: '#64748B', mt: 0.75 }}>
            Caching documents for offline use…
          </Typography>
        </Box>
      )}

      {/* Offline alert */}
      {!isOnline && cachedCount === 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
          You're offline and no documents have been cached yet. Connect to the internet and click "Cache All" to enable offline access.
        </Alert>
      )}

      {/* Document Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#6366F1' }} />
        </Box>
      ) : documents.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <WifiOff sx={{ fontSize: 48, color: '#CBD5E1', mb: 2 }} />
          <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>No documents found</Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>
            {isOnline ? 'Upload documents to enable offline access.' : 'Connect to internet to load your documents.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {documents.map((doc) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <OfflineDocCard
                doc={doc}
                isCached={cachedIds.has(String(doc.id))}
                onCache={handleCacheOne}
                onDownload={handleDownload}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default OfflineDocuments;