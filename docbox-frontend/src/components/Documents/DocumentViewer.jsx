import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, Box, Typography, CircularProgress, Alert, Divider,
} from '@mui/material';
import {
  Close, Download, Delete, Star, StarBorder,
  Archive, Unarchive, CalendarToday, InsertDriveFile,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const MetaPill = ({ children, bg = '#F1F5F9', color = '#475569' }) => (
  <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.3, borderRadius: '6px', background: bg }}>
    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color }}>{children}</Typography>
  </Box>
);

const DocumentViewer = ({ open, document, onClose, onDelete, onUpdate }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (open && document) { loadPreview(); }
    else { if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [open, document]);

  const loadPreview = async () => {
    if (!document) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/documents/${document.id}/download`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load document');
      setPreviewUrl(URL.createObjectURL(await response.blob()));
    } catch { toast.error('Failed to load document preview'); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/documents/${document.id}/download`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href  = url;
      link.setAttribute('download', document.originalFilename);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch { toast.error('Download failed'); }
  };

  const handleFavoriteToggle = async () => {
    try { if (onUpdate) { await onUpdate(document.id, { isFavorite: !document.isFavorite }); toast.success(document.isFavorite ? 'Removed from favorites' : 'Added to favorites'); } }
    catch { toast.error('Failed to update favorite status'); }
  };

  const handleArchiveToggle = async () => {
    try { if (onUpdate) { await onUpdate(document.id, { isArchived: !document.isArchived }); toast.success(document.isArchived ? 'Unarchived' : 'Archived'); } }
    catch { toast.error('Failed to update archive status'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try { if (onDelete) { await onDelete(document.id); onClose(); } }
    catch { toast.error('Failed to delete document'); }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const canPreview = () =>
    ['pdf','jpg','jpeg','png','gif','webp','bmp','tiff'].includes(document?.fileType?.toLowerCase());

  const handleClose = () => {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    onClose();
  };

  if (!document) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', p: 0 } }}>

      <DialogTitle sx={{ pt: 2.5, px: 3, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, overflow: 'hidden' }}>
            <Box sx={{ width: 34, height: 34, borderRadius: '9px', background: 'rgba(99,102,241,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <InsertDriveFile sx={{ fontSize: 17, color: '#6366F1' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
              {document.originalFilename}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small"
            sx={{ flexShrink: 0, color: '#94A3B8', '&:hover': { background: '#F1F5F9' } }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 2 }}>
        {/* Info bar */}
        <Box sx={{ mb: 2.5, p: 2, borderRadius: '12px', background: '#F8F9FC', border: '1px solid #E2E8F0',
          display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {document.category && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: '0.85rem' }}>{document.category.icon}</Typography>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
                {document.category.name}
              </Typography>
            </Box>
          )}
          {document.fileType && <MetaPill bg="rgba(99,102,241,0.08)" color="#6366F1">{document.fileType.toUpperCase()}</MetaPill>}
          <MetaPill>{formatFileSize(document.fileSize)}</MetaPill>
          <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', ml: 'auto' }}>
            Uploaded {format(new Date(document.createdAt), 'MMM dd, yyyy HH:mm')}
          </Typography>
          {document.expiryDate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: '100%' }}>
              <CalendarToday sx={{ fontSize: 12, color: '#94A3B8' }} />
              <Typography sx={{ fontSize: '0.72rem', color: '#64748B' }}>
                Expires {format(new Date(document.expiryDate), 'MMM dd, yyyy')}
              </Typography>
              {document.isExpired && <MetaPill bg="#FEF2F2" color="#EF4444">EXPIRED</MetaPill>}
              {document.isExpiringSoon && !document.isExpired && <MetaPill bg="#FFFBEB" color="#F59E0B">EXPIRING SOON</MetaPill>}
            </Box>
          )}
        </Box>

        {/* Preview */}
        <Box sx={{ minHeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center',
          borderRadius: '12px', background: '#F8F9FC', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress sx={{ color: '#6366F1', mb: 1.5 }} />
              <Typography sx={{ fontSize: '0.825rem', color: '#94A3B8' }}>Loading preview…</Typography>
            </Box>
          ) : canPreview() && previewUrl ? (
            document.fileType?.toLowerCase() === 'pdf' ? (
              <iframe src={previewUrl} style={{ width: '100%', height: 600, border: 'none' }}
                title={document.originalFilename} />
            ) : (
              <Box component="img" src={previewUrl} alt={document.originalFilename}
                sx={{ maxWidth: '100%', maxHeight: 600, objectFit: 'contain' }} />
            )
          ) : (
            <Alert severity="info" sx={{ m: 3, borderRadius: '10px' }}>
              Preview not available. Click Download to view the file.
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 2.5 }} />

        {document.notes && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>Notes</Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#0F172A' }}>{document.notes}</Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" onClick={handleFavoriteToggle}
            startIcon={document.isFavorite ? <Star sx={{ fontSize: 15 }} /> : <StarBorder sx={{ fontSize: 15 }} />}
            sx={{ borderRadius: '8px', borderColor: '#E2E8F0', color: '#475569', fontSize: '0.78rem',
              '&:hover': { borderColor: '#F59E0B', color: '#F59E0B' } }}>
            {document.isFavorite ? 'Unfavorite' : 'Favorite'}
          </Button>
          <Button variant="outlined" size="small" onClick={handleArchiveToggle}
            startIcon={document.isArchived ? <Unarchive sx={{ fontSize: 15 }} /> : <Archive sx={{ fontSize: 15 }} />}
            sx={{ borderRadius: '8px', borderColor: '#E2E8F0', color: '#475569', fontSize: '0.78rem',
              '&:hover': { borderColor: '#6366F1', color: '#6366F1' } }}>
            {document.isArchived ? 'Unarchive' : 'Archive'}
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleDelete} color="error" startIcon={<Delete sx={{ fontSize: 15 }} />}
          sx={{ borderRadius: '8px' }}>Delete</Button>
        <Button onClick={handleDownload} variant="contained" startIcon={<Download sx={{ fontSize: 15 }} />}
          sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontWeight: 600 }}>
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentViewer;