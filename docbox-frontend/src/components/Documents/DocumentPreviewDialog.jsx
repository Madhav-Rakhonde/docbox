import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Close,
  Download,
  Delete,
  Star,
  StarBorder,
  Archive,
  Unarchive,
  Folder,
  CalendarToday,
  InsertDriveFile,
  Refresh,
} from '@mui/icons-material';
import { format } from 'date-fns';

// API_BASE should point to the full API root. The .env value may already include `/api`.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const PREVIEWABLE_TYPES = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

const DocumentPreviewDialog = ({ open, document, onClose, onDelete, onUpdate, onDownload }) => {
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [loading,    setLoading]      = useState(false);
  const [error,      setError]        = useState(null);   // ← NEW: surface errors to user

  // ─── Load preview ────────────────────────────────────────────────────────
  // FIX 1: local `objectUrl` ref avoids the stale-closure bug where the old
  //         cleanup was revoking whatever `previewUrl` happened to be in scope
  //         at cleanup time (could be null or a different document's URL).
  // FIX 2: depend on `document?.id` not the whole object — avoids re-fetching
  //         when only isFavorite / isArchived flips after an onUpdate call.
  const loadPreview = useCallback(async (docId) => {
    let objectUrl = null;
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // Try to parse the error body the backend now sends
        let msg = `Server error (HTTP ${response.status})`;
        try {
          const body = await response.json();
          if (body?.message) msg = body.message;
        } catch {
          // body wasn't JSON — use the status text
          msg = response.statusText || msg;
        }
        throw new Error(msg);
      }

      const blob  = await response.blob();
      objectUrl   = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    } catch (err) {
      console.error('Preview load error:', err);
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }

    // Return cleanup fn so the effect can revoke exactly the URL it created
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  useEffect(() => {
    // Guard: only run when dialog is open and we have a real document id
    if (!open || !document?.id) {
      setPreviewUrl(null);
      setError(null);
      return;
    }

    let cleanupFn = null;

    loadPreview(document.id).then((fn) => {
      cleanupFn = fn;
    });

    // FIX 3: cleanup calls the fn returned by loadPreview — which holds a
    //         reference to the exact objectUrl created during *this* effect run.
    return () => {
      setPreviewUrl(null);
      setError(null);
      if (cleanupFn) cleanupFn();
    };
  }, [open, document?.id, loadPreview]); // ← id only, not whole object

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const handleFavoriteToggle = () => onUpdate(document.id, { isFavorite: !document.isFavorite });
  const handleArchiveToggle  = () => onUpdate(document.id, { isArchived: !document.isArchived });

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k     = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i     = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const canPreview = () =>
    PREVIEWABLE_TYPES.includes(document?.fileType?.toLowerCase());

  const isPdf = () => document?.fileType?.toLowerCase() === 'pdf';

  if (!document) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      {/* ── Title ────────────────────────────────────────────────────────── */}
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <InsertDriveFile color="primary" />
            <Typography variant="h6" noWrap sx={{ maxWidth: 500 }}>
              {document.originalFilename}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* ── Info bar ─────────────────────────────────────────────────── */}
        <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {document.category && (
              <Chip icon={<Folder />} label={document.category.name} size="small" />
            )}
            <Chip label={document.fileType?.toUpperCase()} color="primary" size="small" />
            <Chip label={formatFileSize(document.fileSize)} size="small" />
          </Box>

          <Typography variant="caption" color="text.secondary">
            Uploaded: {format(new Date(document.createdAt), 'MMM dd, yyyy HH:mm')}
          </Typography>

          {document.expiryDate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <CalendarToday fontSize="small" color="action" />
              <Typography variant="caption">
                Expires: {format(new Date(document.expiryDate), 'MMM dd, yyyy')}
              </Typography>
              {document.isExpired && (
                <Chip label="Expired" color="error" size="small" />
              )}
              {document.isExpiringSoon && !document.isExpired && (
                <Chip label="Expiring Soon" color="warning" size="small" />
              )}
            </Box>
          )}
        </Box>

        {/* ── Preview area ─────────────────────────────────────────────── */}
        <Box
          sx={{
            minHeight: 500,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'grey.50',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <CircularProgress />

          ) : error ? (
            // FIX 4: show the actual error message + retry button
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                action={
                  <Tooltip title="Retry">
                    <IconButton
                      size="small"
                      color="inherit"
                      onClick={() => loadPreview(document.id)}
                    >
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                {error}
              </Alert>
              <Typography variant="caption" color="text.secondary">
                You can still download the file using the button below.
              </Typography>
            </Box>

          ) : canPreview() && previewUrl ? (
            isPdf() ? (
              <iframe
                src={previewUrl}
                style={{ width: '100%', height: '600px', border: 'none', borderRadius: 4 }}
                title={document.originalFilename}
              />
            ) : (
              <img
                src={previewUrl}
                alt={document.originalFilename}
                style={{
                  maxWidth: '100%',
                  maxHeight: '600px',
                  objectFit: 'contain',
                  borderRadius: 4,
                }}
              />
            )

          ) : (
            <Alert severity="info" sx={{ width: '100%' }}>
              Preview not available for <strong>{document.fileType?.toUpperCase()}</strong> files.
              Please download to view.
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* ── Notes ────────────────────────────────────────────────────── */}
        {document.notes && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Notes
            </Typography>
            <Typography variant="body2">{document.notes}</Typography>
          </Box>
        )}

        {/* ── Quick actions ────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={document.isFavorite ? <Star /> : <StarBorder />}
            onClick={handleFavoriteToggle}
            size="small"
          >
            {document.isFavorite ? 'Unfavorite' : 'Favorite'}
          </Button>

          <Button
            variant="outlined"
            startIcon={document.isArchived ? <Unarchive /> : <Archive />}
            onClick={handleArchiveToggle}
            size="small"
          >
            {document.isArchived ? 'Unarchive' : 'Archive'}
          </Button>
        </Box>
      </DialogContent>

      {/* ── Footer actions ───────────────────────────────────────────────── */}
      <DialogActions>
        <Button onClick={() => onDelete(document)} color="error" startIcon={<Delete />}>
          Delete
        </Button>
        <Button
          onClick={() => onDownload(document)}
          variant="contained"
          startIcon={<Download />}
        >
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentPreviewDialog;