import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Alert, Button, Chip,
  AppBar, Toolbar, IconButton, Tooltip,
} from '@mui/material';
import {
  ArrowBack, Download, ZoomIn, ZoomOut,
  ErrorOutline, InsertDriveFile, LockOutlined,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api, { endpoints } from '../services/api';

/**
 * DocumentViewerPage
 * src/pages/DocumentViewerPage.jsx
 *
 * ══════════════════════════════════════════════════════════════
 * ROUTE SETUP — CRITICAL
 * ══════════════════════════════════════════════════════════════
 * This page MUST be placed OUTSIDE PrivateRoute in your router.
 * PrivateRoute wraps AppLayout and redirects to /login when the
 * auth context hasn't fully loaded in the new tab yet.
 *
 * In your App.jsx / router:
 *
 *   import DocumentViewerPage from './pages/DocumentViewerPage';
 *
 *   // ✅ OUTSIDE PrivateRoute — handles own auth
 *   <Route path="/view/:id" element={<DocumentViewerPage />} />
 *
 *   // ❌ NOT inside PrivateRoute like this:
 *   // <Route element={<PrivateRoute />}>
 *   //   <Route path="/view/:id" element={<DocumentViewerPage />} />
 *   // </Route>
 *
 * ══════════════════════════════════════════════════════════════
 * WHY THIS PAGE EXISTS
 * ══════════════════════════════════════════════════════════════
 * openDocumentInTab() calls window.open('/view/:id', '_blank').
 * The new tab opens instantly (< 100ms). This page then fetches
 * and renders the document with a loading spinner.
 *
 * This is faster than the old approach of fetching the blob first
 * (which made the user wait 3–10 seconds before the tab opened).
 *
 * ══════════════════════════════════════════════════════════════
 * AUTH HANDLING
 * ══════════════════════════════════════════════════════════════
 * This page does NOT use AuthContext (which may not have loaded
 * yet in a fresh tab). Instead it reads the JWT directly from
 * localStorage — the same token the rest of the app uses.
 * If no token is found, it shows a "not logged in" screen with
 * a Login button instead of silently redirecting.
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

  const [metadata,   setMetadata]   = useState(null);
  const [objectUrl,  setObjectUrl]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [imageScale, setImageScale] = useState(1);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  const objectUrlRef = useRef(null);

  useEffect(() => {
    // Check token directly from localStorage — do NOT rely on AuthContext
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

  // ── Fetch metadata + file ─────────────────────────────────────────────────
  const loadDocument = async (docId) => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: metadata — gives us filename, fileType, size
      const metaRes = await api.get(`${endpoints.documents}/${docId}`);
      const doc     = metaRes.data?.data || metaRes.data;
      setMetadata(doc);

      // Update browser tab title to the filename
      if (doc?.originalFilename) {
        document.title = doc.originalFilename;
      }

      const ft = doc?.fileType?.toLowerCase();

      if (!PREVIEWABLE.has(ft)) {
        // Cannot preview this type — show download prompt
        setLoading(false);
        return;
      }

      // Step 2: file as blob
      const fileRes   = await api.get(
        `${endpoints.documents}/${docId}/download`,
        { responseType: 'blob' }
      );
      const rawBlob   = fileRes.data;
      const mime      = MIME_MAP[ft] || rawBlob.type || 'application/octet-stream';
      const typedBlob = new Blob([rawBlob], { type: mime });
      const url       = URL.createObjectURL(typedBlob);

      objectUrlRef.current = url;
      setObjectUrl(url);

    } catch (err) {
      const status = err?.response?.status;

      if (status === 401) {
        // Token expired mid-session
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

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!metadata) return;
    try {
      let url      = objectUrl;
      let isFresh  = false;

      if (!url) {
        const res = await api.get(
          `${endpoints.documents}/${id}/download`,
          { responseType: 'blob' }
        );
        url     = URL.createObjectURL(res.data);
        isFresh = true;
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

          {/* Image zoom */}
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
              Loading document…
            </Typography>
          </Box>
        )}

        {/* Error */}
        {!loading && error && (
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 2, p: 4, maxWidth: 480, width: '100%',
          }}>
            <ErrorOutline sx={{ fontSize: 52, color: '#EF4444' }} />
            <Alert severity="error" sx={{ width: '100%', borderRadius: '10px' }}>
              {error}
            </Alert>
            <Button variant="outlined" onClick={() => loadDocument(id)} sx={{
              borderRadius: '8px', color: '#94A3B8', borderColor: '#334155',
              '&:hover': { borderColor: '#6366F1', color: '#A5B4FC' },
            }}>
              Retry
            </Button>
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