import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Alert, Button, Chip,
  AppBar, Toolbar, IconButton, Tooltip,
} from '@mui/material';
import {
  ArrowBack, Download, ZoomIn, ZoomOut,
  ErrorOutline, InsertDriveFile, LockOutlined, WifiOff,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api, { endpoints } from '../services/api';
import { loadSecureDoc } from '../utils/secureDocStore';

/**
 * DocumentViewerPage
 * src/pages/DocumentViewerPage.jsx
 *
 * ══════════════════════════════════════════════════════════════
 * ROUTE SETUP — CRITICAL
 * ══════════════════════════════════════════════════════════════
 * This page MUST be placed OUTSIDE PrivateRoute in your router.
 *
 *   // ✅ OUTSIDE PrivateRoute — handles own auth
 *   <Route path="/view/:id" element={<DocumentViewerPage />} />
 *
 * ══════════════════════════════════════════════════════════════
 * OFFLINE SUPPORT
 * ══════════════════════════════════════════════════════════════
 * Online  → fetches metadata + file blob from the API as before.
 *           Also saves the blob to IndexedDB (encrypted) so the
 *           document is available next time offline.
 *
 * Offline → loads metadata from the SW API cache (via api.get,
 *           which the SW serves from docbox-api-v1).
 *           Loads the file blob from IndexedDB (AES-256-GCM
 *           encrypted, keyed from the auth token).
 *           Shows a "Viewing offline copy" banner.
 */

const MIME_MAP = {
  pdf:  'application/pdf',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  gif:  'image/gif',
  webp: 'image/webp',
  bmp:  'image/bmp',
  tiff: 'image/tiff',
  svg:  'image/svg+xml',
};

const IMAGE_TYPES = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg']);
const PREVIEWABLE  = new Set(Object.keys(MIME_MAP));

const DocumentViewerPage = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();

  const [metadata,    setMetadata]    = useState(null);
  const [objectUrl,   setObjectUrl]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [imageScale,  setImageScale]  = useState(1);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [isOffline,   setIsOffline]   = useState(false); // true when serving from cache

  const objectUrlRef = useRef(null);

  useEffect(() => {
    // Read token directly from localStorage — do NOT rely on AuthContext
    // because in a fresh tab the context provider may not have run yet.
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined') {
      setNotLoggedIn(true);
      setLoading(false);
      return;
    }

    if (!id) {
      setError('No document ID found in the URL.');
      setLoading(false);
      return;
    }

    loadDocument(id);

    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load document (online + offline) ─────────────────────────────────────
  const loadDocument = async (docId) => {
    try {
      setLoading(true);
      setError(null);
      setIsOffline(false);

      // ── Step 1: metadata ──────────────────────────────────────────────────
      // Online  → fresh from API, SW caches it automatically (network-first).
      // Offline → SW serves it from docbox-api-v1 cache.
      let doc;
      try {
        const metaRes = await api.get(`${endpoints.documents}/${docId}`);
        doc = metaRes.data?.data || metaRes.data;
      } catch (metaErr) {
        // Metadata fetch failed even with SW cache — we are offline and this
        // specific doc metadata was never cached. Show a clear message.
        if (!navigator.onLine) {
          setError(
            'Metadata for this document is not available offline. ' +
            'Please connect to the internet and open the document once to cache it.'
          );
          return;
        }
        throw metaErr; // re-throw for online errors (403, 404, etc.)
      }

      setMetadata(doc);
      if (doc?.originalFilename) document.title = doc.originalFilename;

      const ft = doc?.fileType?.toLowerCase();
      if (!PREVIEWABLE.has(ft)) {
        // Cannot preview this file type — show download prompt
        setLoading(false);
        return;
      }

      // ── Step 2: file blob ─────────────────────────────────────────────────
      if (navigator.onLine) {
        await loadFromNetwork(docId, ft);
      } else {
        await loadFromIndexedDB(docId);
      }

    } catch (err) {
      const status = err?.response?.status;

      if (status === 401) {
        setNotLoggedIn(true);
        return;
      }

      const msg = status === 403 ? 'You do not have permission to view this document.'
                : status === 404 ? 'Document not found.'
                : err?.response?.data?.message || err?.message || 'Failed to load document.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Online: fetch from API, also save to IndexedDB for future offline use ─
  const loadFromNetwork = async (docId, ft) => {
    const fileRes = await api.get(
      `${endpoints.documents}/${docId}/download`,
      { responseType: 'blob' }
    );

    const rawBlob   = fileRes.data;
    const mime      = MIME_MAP[ft] || rawBlob.type || 'application/octet-stream';
    const typedBlob = new Blob([rawBlob], { type: mime });
    const url       = URL.createObjectURL(typedBlob);

    objectUrlRef.current = url;
    setObjectUrl(url);

    // Save to IndexedDB in the background so it's available offline next time.
    // We do this silently — don't block the viewer or show errors to the user.
    try {
      const { saveSecureDoc } = await import('../utils/secureDocStore');
      const buffer = await typedBlob.arrayBuffer();
      await saveSecureDoc(docId, buffer, mime);
    } catch (saveErr) {
      // Non-critical — viewer still works, just won't be cached offline
      console.warn('[Viewer] Could not save to offline cache:', saveErr.message);
    }
  };

  // ── Offline: decrypt from IndexedDB ───────────────────────────────────────
  const loadFromIndexedDB = async (docId) => {
    const result = await loadSecureDoc(docId);

    if (!result) {
      setError(
        'This document is not available offline. ' +
        'Please connect to the internet and open this document once to cache it.'
      );
      return;
    }

    const blob = new Blob([result.buffer], { type: result.mimeType });
    const url  = URL.createObjectURL(blob);

    objectUrlRef.current = url;
    setObjectUrl(url);
    setIsOffline(true); // show the offline banner
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!metadata) return;
    try {
      let url     = objectUrl;
      let isFresh = false;

      if (!url) {
        if (!navigator.onLine) {
          // Try IndexedDB
          const result = await loadSecureDoc(id);
          if (result) {
            const blob = new Blob([result.buffer], { type: result.mimeType });
            url     = URL.createObjectURL(blob);
            isFresh = true;
          } else {
            toast.error('Document not available offline');
            return;
          }
        } else {
          const res = await api.get(
            `${endpoints.documents}/${id}/download`,
            { responseType: 'blob' }
          );
          url     = URL.createObjectURL(res.data);
          isFresh = true;
        }
      }

      const link = window.document.createElement('a');
      link.href  = url;
      link.setAttribute('download', metadata.originalFilename || 'document');
      window.document.body.appendChild(link);
      link.click();
      link.remove();

      if (isFresh) setTimeout(() => URL.revokeObjectURL(url), 5_000);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  // ── Back ──────────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.close();
  };

  // ── Image zoom ────────────────────────────────────────────────────────────
  const zoomIn  = () => setImageScale((s) => Math.min(+(s + 0.25).toFixed(2), 4));
  const zoomOut = () => setImageScale((s) => Math.max(+(s - 0.25).toFixed(2), 0.25));

  const ft      = metadata?.fileType?.toLowerCase();
  const isImage = IMAGE_TYPES.has(ft);
  const isPdf   = ft === 'pdf';

  const fmtSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024)      return bytes + ' B';
    if (bytes < 1_048_576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1_048_576).toFixed(2) + ' MB';
  };

  // ══════════════════════════════════════════════════════════════
  // NOT LOGGED IN SCREEN
  // ══════════════════════════════════════════════════════════════
  if (notLoggedIn) {
    return (
      <Box sx={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        bgcolor: '#111827', gap: 3, p: 4,
      }}>
        <LockOutlined sx={{ fontSize: 64, color: '#475569' }} />
        <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>
          Login required
        </Typography>
        <Typography sx={{ color: '#64748B', textAlign: 'center', maxWidth: 360 }}>
          Your session has expired or you are not logged in.
          Please log in and try opening the document again.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/login')}
          sx={{
            borderRadius: '10px', px: 4, fontWeight: 600,
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' },
          }}>
          Go to Login
        </Button>
      </Box>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // MAIN VIEWER
  // ══════════════════════════════════════════════════════════════
  return (
    <Box sx={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      bgcolor: '#111827', overflow: 'hidden',
    }}>

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <AppBar position="static" elevation={0} sx={{
        background: '#0F172A',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <Toolbar sx={{ minHeight: '52px !important', px: { xs: 1, sm: 2 }, gap: 0.5 }}>

          {/* Back / close */}
          <Tooltip title="Close viewer">
            <IconButton onClick={handleBack} size="small" sx={{
              color: '#94A3B8', flexShrink: 0,
              '&:hover': { color: 'white', background: 'rgba(255,255,255,0.08)' },
            }}>
              <ArrowBack fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* File icon */}
          <InsertDriveFile sx={{
            color: '#475569', fontSize: 18, ml: 0.5, flexShrink: 0,
          }} />

          {/* Filename */}
          <Typography sx={{
            color: 'white', fontWeight: 600, fontSize: '0.85rem',
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', mx: 0.5,
          }}>
            {metadata?.originalFilename || (loading ? 'Loading…' : 'Document')}
          </Typography>

          {/* Offline badge */}
          {isOffline && (
            <Chip
              icon={<WifiOff sx={{ fontSize: '13px !important', color: '#F59E0B !important' }} />}
              label="Offline copy"
              size="small"
              sx={{
                bgcolor: 'rgba(245,158,11,0.15)',
                color: '#F59E0B',
                fontSize: '0.68rem',
                height: 20,
                flexShrink: 0,
                border: '1px solid rgba(245,158,11,0.3)',
              }}
            />
          )}

          {/* File type chip */}
          {metadata?.fileType && (
            <Chip label={metadata.fileType.toUpperCase()} size="small" sx={{
              bgcolor: 'rgba(99,102,241,0.2)', color: '#A5B4FC',
              fontSize: '0.68rem', height: 20, flexShrink: 0,
              display: { xs: 'none', sm: 'flex' },
            }} />
          )}

          {/* File size chip */}
          {metadata?.fileSize && (
            <Chip label={fmtSize(metadata.fileSize)} size="small" sx={{
              bgcolor: 'rgba(255,255,255,0.07)', color: '#64748B',
              fontSize: '0.68rem', height: 20, flexShrink: 0,
              display: { xs: 'none', md: 'flex' },
            }} />
          )}

          {/* Image zoom controls */}
          {isImage && objectUrl && (
            <>
              <Tooltip title="Zoom out">
                <span>
                  <IconButton onClick={zoomOut} size="small"
                    disabled={imageScale <= 0.25} sx={{
                      color: imageScale <= 0.25 ? '#334155' : '#94A3B8', flexShrink: 0,
                      '&:hover': { color: 'white', background: 'rgba(255,255,255,0.08)' },
                    }}>
                    <ZoomOut fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Typography sx={{
                color: '#64748B', fontSize: '0.72rem',
                minWidth: 38, textAlign: 'center', flexShrink: 0,
              }}>
                {Math.round(imageScale * 100)}%
              </Typography>
              <Tooltip title="Zoom in">
                <span>
                  <IconButton onClick={zoomIn} size="small"
                    disabled={imageScale >= 4} sx={{
                      color: imageScale >= 4 ? '#334155' : '#94A3B8', flexShrink: 0,
                      '&:hover': { color: 'white', background: 'rgba(255,255,255,0.08)' },
                    }}>
                    <ZoomIn fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}

          {/* Download */}
          <Button onClick={handleDownload} size="small"
            startIcon={<Download sx={{ fontSize: '15px !important' }} />}
            sx={{
              color: 'white', flexShrink: 0, ml: 0.5,
              background: 'rgba(99,102,241,0.18)',
              borderRadius: '8px', px: { xs: 1, sm: 1.5 },
              fontSize: '0.78rem', fontWeight: 600,
              '&:hover': { background: 'rgba(99,102,241,0.35)' },
            }}>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Download
            </Box>
          </Button>
        </Toolbar>
      </AppBar>

      {/* ── Offline banner ────────────────────────────────────────── */}
      {isOffline && (
        <Box sx={{
          bgcolor: 'rgba(245,158,11,0.1)',
          borderBottom: '1px solid rgba(245,158,11,0.2)',
          px: 2, py: 0.75,
          display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0,
        }}>
          <WifiOff sx={{ fontSize: 14, color: '#F59E0B' }} />
          <Typography sx={{ color: '#F59E0B', fontSize: '0.78rem' }}>
            You are offline — viewing a cached copy of this document.
          </Typography>
        </Box>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      <Box sx={{
        flex: 1, overflow: 'hidden', position: 'relative',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
      }}>

        {/* Loading */}
        {loading && (
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 2,
          }}>
            <CircularProgress size={52} sx={{ color: '#6366F1' }} />
            <Typography sx={{ color: '#475569', fontSize: '0.875rem' }}>
              {navigator.onLine ? 'Loading document…' : 'Loading offline copy…'}
            </Typography>
          </Box>
        )}

        {/* Error */}
        {!loading && error && (
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 2, p: 4, maxWidth: 480, width: '100%',
          }}>
            {!navigator.onLine
              ? <WifiOff sx={{ fontSize: 52, color: '#F59E0B' }} />
              : <ErrorOutline sx={{ fontSize: 52, color: '#EF4444' }} />
            }
            <Alert
              severity={!navigator.onLine ? 'warning' : 'error'}
              sx={{ width: '100%', borderRadius: '10px' }}
            >
              {error}
            </Alert>
            {navigator.onLine && (
              <Button variant="outlined" onClick={() => loadDocument(id)} sx={{
                borderRadius: '8px', color: '#94A3B8', borderColor: '#334155',
                '&:hover': { borderColor: '#6366F1', color: '#A5B4FC' },
              }}>
                Retry
              </Button>
            )}
          </Box>
        )}

        {/* PDF — native browser viewer via <embed> */}
        {!loading && !error && isPdf && objectUrl && (
          <Box component="embed"
            src={objectUrl}
            type="application/pdf"
            sx={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              border: 'none', display: 'block',
            }}
          />
        )}

        {/* Image */}
        {!loading && !error && isImage && objectUrl && (
          <Box sx={{
            width: '100%', height: '100%', overflow: 'auto',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            p: 3,
          }}>
            <Box component="img"
              src={objectUrl}
              alt={metadata?.originalFilename}
              sx={{
                transform: `scale(${imageScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease',
                maxWidth: '100%',
                borderRadius: '8px',
                boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                userSelect: 'none',
              }}
            />
          </Box>
        )}

        {/* Cannot preview */}
        {!loading && !error && metadata && !PREVIEWABLE.has(ft) && (
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 2.5, p: 4,
          }}>
            <InsertDriveFile sx={{ fontSize: 72, color: '#334155' }} />
            <Typography sx={{
              color: '#64748B', fontSize: '0.9rem', textAlign: 'center',
            }}>
              <Box component="span" sx={{ color: 'white', fontWeight: 700 }}>
                {ft?.toUpperCase()}
              </Box>
              {' '}files cannot be previewed in the browser.
            </Typography>
            <Button variant="contained" startIcon={<Download />}
              onClick={handleDownload} sx={{
                borderRadius: '10px', fontWeight: 600, px: 3,
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' },
              }}>
              Download File
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DocumentViewerPage;