import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, IconButton, Grid, Chip, Divider,
  Alert, CircularProgress, TextField, MenuItem,
  Card, CardContent,
} from '@mui/material';
import {
  Close, Download, Share, Delete, Edit, OpenInNew,
  Category, Link as LinkIcon, Lock, ContentCopy,
  HourglassEmpty, CheckCircle, ErrorOutline,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api, { endpoints } from '../../services/api';
import { openDocumentInTab } from '../../services/openDocumentInTab';
import shareLinkService from '../../services/shareLinkService';
import categoryService from '../../services/categoryService';

/**
 * DocumentDetails
 * src/components/Documents/DocumentDetails.jsx
 *
 * Full document detail panel: edit, share, delete, view, download.
 * "View" calls openDocumentInTab() — synchronous, tab opens in < 100ms.
 */
const DocumentDetails = ({ open, onClose, document: initialDocument, onUpdate, onDelete }) => {
  const [document,       setDocument]       = useState(initialDocument);
  const [loading,        setLoading]        = useState(false);
  const [editing,        setEditing]        = useState(false);
  const [editedNotes,    setEditedNotes]    = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [categories,     setCategories]     = useState([]);
  const [shareLinks,     setShareLinks]     = useState([]);

  useEffect(() => {
    if (open && initialDocument) {
      setDocument(initialDocument);
      setEditedNotes(initialDocument.notes || '');
      setEditedCategory(initialDocument.category?.id || '');
      loadCategories();
      loadShareLinks(initialDocument.id);
    }
  }, [open, initialDocument]);

  const loadCategories = async () => {
    try {
      const res = await categoryService.getCategories();
      if (res.success) setCategories(res.data || []);
    } catch (e) { console.error('Failed to load categories:', e); }
  };

  const loadShareLinks = async (docId) => {
    try {
      const res = await shareLinkService.getMyShares();
      if (res.success) {
        setShareLinks((res.data || []).filter((l) => l.documentId === docId));
      }
    } catch (e) { console.error('Failed to load share links:', e); }
  };

  // ── View — synchronous, opens tab in < 100ms ─────────────────────────────
  const handleView = () => {
    openDocumentInTab(document, (msg) => toast.error(msg));
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    try {
      setLoading(true);
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
      toast.success('Download started!');
    } catch (e) {
      console.error('Download error:', e);
      toast.error('Failed to download document');
    } finally {
      setLoading(false);
    }
  };

  // ── Save edit ─────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const response = await api.put(
        `${endpoints.documents}/${document.id}`,
        { notes: editedNotes, categoryId: editedCategory }
      );
      const updated = response.data?.data || response.data;
      setDocument(updated);
      setEditing(false);
      toast.success('Document updated!');
      if (onUpdate) onUpdate(updated);
    } catch (e) {
      console.error('Update error:', e);
      toast.error('Failed to update document');
    } finally {
      setLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      setLoading(true);
      await api.delete(`${endpoints.documents}/${document.id}`);
      toast.success('Document deleted!');
      if (onDelete) onDelete(document.id);
      onClose();
    } catch (e) {
      console.error('Delete error:', e);
      toast.error('Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      setLoading(true);
      const res = await shareLinkService.createShareLink({
        documentId: document.id, expiryHours: 72, allowDownload: true,
      });
      if (res.success) {
        toast.success('Share link created!');
        loadShareLinks(document.id);
      }
    } catch (e) {
      console.error('Share error:', e);
      toast.error('Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  const handleDeleteShareLink = async (linkId) => {
    if (!window.confirm('Delete this share link?')) return;
    try {
      await shareLinkService.deleteShareLink(linkId);
      toast.success('Share link deleted!');
      loadShareLinks(document.id);
    } catch { toast.error('Failed to delete share link'); }
  };

  // ── Formatting ────────────────────────────────────────────────────────────
  const formatDate = (ds) => {
    if (!ds) return 'N/A';
    return new Date(ds).toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1_048_576)   return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1_048_576).toFixed(2) + ' MB';
  };

  if (!document) return null;

  const isProcessing = document.processingStatus === 'PROCESSING';
  const isFailed     = document.processingStatus === 'FAILED';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>

      {/* ── Title ────────────────────────────────────────────────────── */}
      <DialogTitle sx={{ borderBottom: '1px solid #F1F5F9', px: 3, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
            Document Details
          </Typography>
          <IconButton onClick={onClose} size="small"
            sx={{ color: '#94A3B8', '&:hover': { background: '#F1F5F9' } }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 3 }}>

        {/* ── Processing / failed banners ──────────────────────────── */}
        {isProcessing && (
          <Alert severity="info" icon={<HourglassEmpty />}
            sx={{ mb: 2.5, borderRadius: '10px', fontSize: '0.825rem' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.825rem' }}>
              🤖 AI is processing this document
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', mt: 0.25 }}>
              Category and expiry date are being detected. Usually takes up to 2 minutes.
            </Typography>
          </Alert>
        )}
        {isFailed && (
          <Alert severity="warning" icon={<ErrorOutline />}
            sx={{ mb: 2.5, borderRadius: '10px', fontSize: '0.825rem' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.825rem' }}>
              ⚠️ Auto-detection failed
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', mt: 0.25 }}>
              Could not read text from this document. Please set the category manually.
            </Typography>
          </Alert>
        )}

        {/* ── Document info ─────────────────────────────────────────── */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>

            {/* Filename */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Filename
              </Typography>
              <Typography sx={{
                fontWeight: 600, fontSize: '0.9rem',
                color: '#0F172A', wordBreak: 'break-all',
              }}>
                {document.originalFilename}
              </Typography>
            </Box>

            {/* Category */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Category
              </Typography>
              {editing ? (
                <TextField select fullWidth size="small"
                  value={editedCategory}
                  onChange={(e) => setEditedCategory(e.target.value)}>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </TextField>
              ) : (
                <Chip
                  label={document.category?.name || 'Others'}
                  icon={<Category sx={{ fontSize: 14 }} />}
                  color="primary" size="small"
                />
              )}
            </Box>

            {/* File size & type */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  File Size
                </Typography>
                <Typography variant="body2">{formatFileSize(document.fileSize)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  File Type
                </Typography>
                <Typography variant="body2">{document.fileType?.toUpperCase()}</Typography>
              </Grid>
            </Grid>

            {/* Dates */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Upload Date
                </Typography>
                <Typography variant="body2">{formatDate(document.createdAt)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Expiry Date
                </Typography>
                <Typography variant="body2">{formatDate(document.expiryDate)}</Typography>
              </Grid>
            </Grid>

            {/* Notes */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Notes
              </Typography>
              {editing ? (
                <TextField fullWidth multiline rows={3} size="small"
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  placeholder="Add notes…" />
              ) : (
                <Typography variant="body2">{document.notes || 'No notes'}</Typography>
              )}
            </Box>
          </Grid>

          {/* ── Status chips ──────────────────────────────────────── */}
          <Grid item xs={12} md={5}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {document.isFavorite && (
                <Chip label="⭐ Favourite" size="small" color="warning" variant="outlined" />
              )}
              {document.isArchived && (
                <Chip label="📦 Archived" size="small" color="default" variant="outlined" />
              )}
              {document.isExpired && (
                <Chip label="❌ Expired" size="small" color="error" />
              )}
              {document.isExpiringSoon && !document.isExpired && (
                <Chip label="⚠️ Expiring Soon" size="small" color="warning" />
              )}
              {isProcessing && (
                <Chip
                  icon={<CircularProgress size={10} sx={{ color: '#6366F1 !important' }} />}
                  label="Processing…" size="small"
                  sx={{
                    background: 'rgba(99,102,241,0.1)', color: '#4F46E5',
                    border: '1px solid rgba(99,102,241,0.25)',
                  }}
                />
              )}
              {document.processingStatus === 'READY' && (
                <Chip
                  icon={<CheckCircle sx={{ fontSize: 14, color: '#10B981 !important' }} />}
                  label="Ready" size="small"
                  sx={{
                    background: 'rgba(16,185,129,0.08)', color: '#059669',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}
                />
              )}
            </Box>
          </Grid>
        </Grid>

        {/* ── Active share links ─────────────────────────────────── */}
        {shareLinks.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 1.5, color: '#0F172A' }}>
              Active Share Links
            </Typography>
            {shareLinks.map((link) => (
              <Card key={link.id} elevation={0}
                sx={{ mb: 1.5, border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LinkIcon sx={{ fontSize: 14, color: '#6366F1', flexShrink: 0 }} />
                    <Typography sx={{
                      flex: 1, fontFamily: 'monospace', fontSize: '0.75rem',
                      color: '#475569', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {link.shareUrl}
                    </Typography>
                    <IconButton size="small" onClick={() => handleCopyLink(link.shareUrl)}>
                      <ContentCopy sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip label={`Expires: ${formatDate(link.expiresAt)}`} size="small" />
                    {link.requiresPassword && (
                      <Chip icon={<Lock sx={{ fontSize: 12 }} />}
                        label="Password protected" size="small" />
                    )}
                    {link.maxViews && (
                      <Chip label={`Views: ${link.viewCount || 0}/${link.maxViews}`}
                        size="small" />
                    )}
                  </Box>
                  <Button size="small" color="error"
                    onClick={() => handleDeleteShareLink(link.id)}>
                    Delete Link
                  </Button>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </DialogContent>

      {/* ── Action bar ───────────────────────────────────────────────── */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #F1F5F9', gap: 1 }}>
        <Button onClick={handleDelete} color="error" startIcon={<Delete />} disabled={loading}>
          Delete
        </Button>
        <Box sx={{ flex: 1 }} />
        {editing ? (
          <>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveEdit} disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}>
              Save
            </Button>
          </>
        ) : (
          <>
            <Button startIcon={<Edit />} onClick={() => setEditing(true)}>
              Edit
            </Button>

            {/* View — opens new tab instantly (synchronous) */}
            <Button
              startIcon={<OpenInNew />}
              onClick={handleView}
              disabled={isProcessing}>
              View
            </Button>

            <Button startIcon={<Download />} onClick={handleDownload} disabled={loading}>
              Download
            </Button>

            <Button variant="contained" startIcon={<Share />}
              onClick={handleShare} disabled={loading || isProcessing}>
              Share
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DocumentDetails;