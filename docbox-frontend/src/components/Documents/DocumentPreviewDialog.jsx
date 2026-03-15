import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, Box, Typography, Chip,
  CircularProgress, Alert, Divider,
} from '@mui/material';
import {
  Close, Download, Delete, Star, StarBorder,
  Archive, Unarchive, Folder, CalendarToday,
  InsertDriveFile, OpenInNew,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import api, { endpoints } from '../../services/api';
import { openDocumentInTab } from '../../services/openDocumentInTab';

/**
 * DocumentPreviewDialog
 * src/components/Documents/DocumentPreviewDialog.jsx
 *
 * Metadata-only dialog. No iframe, no blob loading on open.
 * Renders instantly.
 *
 * "View Document" calls openDocumentInTab() — synchronous, opens new
 * browser tab in < 100ms with full native PDF / image viewer.
 */

const PREVIEWABLE = new Set([
  'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg',
]);

const DocumentPreviewDialog = ({ open, document, onClose, onDelete, onUpdate }) => {
  const [downloading, setDownloading] = useState(false);

  // ── View — synchronous, opens tab instantly ───────────────────────────────
  const handleView = () => {
    openDocumentInTab(document, (msg) => toast.error(msg));
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await api.get(
        `${endpoints.documents}/${document.id}/download`,
        { responseType: 'blob' }
      );
      const url  = window.URL.createObjectURL(response.data);
      const link = window.document.createElement('a');
      link.href  = url;
      link.setAttribute('download', document.originalFilename);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  // ── Favourite / archive ───────────────────────────────────────────────────
  const handleFavoriteToggle = () =>
    onUpdate?.(document.id, { isFavorite: !document.isFavorite });
  const handleArchiveToggle = () =>
    onUpdate?.(document.id, { isArchived: !document.isArchived });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const canPreview = () => PREVIEWABLE.has(document?.fileType?.toLowerCase());

  if (!document) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>

      {/* ── Title ──────────────────────────────────────────────────── */}
      <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <InsertDriveFile color="primary" sx={{ flexShrink: 0 }} />
            <Typography variant="h6" noWrap
              sx={{ maxWidth: 360, fontSize: '1rem', fontWeight: 700 }}>
              {document.originalFilename}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><Close /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 3 }}>

        {/* ── Metadata ────────────────────────────────────────────── */}
        <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {document.category && (
              <Chip icon={<Folder sx={{ fontSize: 14 }} />}
                label={document.category.name} size="small" />
            )}
            <Chip label={document.fileType?.toUpperCase()} color="primary" size="small" />
            <Chip label={formatFileSize(document.fileSize)} size="small" />
          </Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Uploaded:{' '}
            {document.createdAt &&
              format(new Date(document.createdAt), 'MMM dd, yyyy HH:mm')}
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

        {/* ── View CTA ─────────────────────────────────────────────── */}
        <Box sx={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', py: 4, gap: 1.5,
        }}>
          {canPreview() ? (
            <>
              <Button
                variant="contained"
                size="large"
                startIcon={<OpenInNew />}
                onClick={handleView}
                sx={{
                  borderRadius: '10px', px: 4, fontWeight: 600,
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(99,102,241,0.35)',
                  },
                  transition: 'all 0.2s ease',
                }}>
                View Document
              </Button>
              <Typography variant="caption" color="text.secondary" textAlign="center">
                Opens instantly in a new tab · full zoom &amp; print controls · works on mobile
              </Typography>
            </>
          ) : (
            <Alert severity="info" sx={{ width: '100%' }}>
              Preview not available for{' '}
              <strong>{document.fileType?.toUpperCase()}</strong> files.
              Use the Download button below.
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* ── Notes ───────────────────────────────────────────────── */}
        {document.notes && (
          <Box sx={{ mt: 2, mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Notes
            </Typography>
            <Typography variant="body2">{document.notes}</Typography>
          </Box>
        )}

        {/* ── Quick actions ────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
          <Button variant="outlined" size="small"
            startIcon={document.isFavorite ? <Star /> : <StarBorder />}
            onClick={handleFavoriteToggle}>
            {document.isFavorite ? 'Unfavourite' : 'Favourite'}
          </Button>
          <Button variant="outlined" size="small"
            startIcon={document.isArchived ? <Unarchive /> : <Archive />}
            onClick={handleArchiveToggle}>
            {document.isArchived ? 'Unarchive' : 'Archive'}
          </Button>
        </Box>
      </DialogContent>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={() => onDelete?.(document)} color="error" startIcon={<Delete />}>
          Delete
        </Button>
        <Button
          onClick={handleDownload}
          variant="contained"
          startIcon={
            downloading
              ? <CircularProgress size={16} color="inherit" />
              : <Download />
          }
          disabled={downloading}>
          {downloading ? 'Downloading…' : 'Download'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentPreviewDialog;