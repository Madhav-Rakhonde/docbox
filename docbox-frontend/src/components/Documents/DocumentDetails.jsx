import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, IconButton, Grid,
  Divider, Alert, CircularProgress, TextField, MenuItem,
} from '@mui/material';
import {
  Close, Download, Share, Delete, Edit, Visibility,
  CalendarToday, Category, Description, Link as LinkIcon,
  QrCode2, Lock, ContentCopy,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import documentService from '../../services/documentService';
import shareLinkService from '../../services/shareLinkService';
import categoryService from '../../services/categoryService';
import DocumentViewer from './DocumentViewer';

// ─── Metadata row ─────────────────────────────────────────────────────────
const MetaRow = ({ label, value }) => (
  <Box sx={{ mb: 1.75 }}>
    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8',
      textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.35 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: 500 }}>
      {value || 'N/A'}
    </Typography>
  </Box>
);

// ─── Share link card ──────────────────────────────────────────────────────
const ShareLinkCard = ({ link, onCopy, onViewQR, onDelete, formatDate }) => (
  <Box sx={{ p: 2, borderRadius: '12px', border: '1px solid #E2E8F0', mb: 1.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
      <LinkIcon sx={{ fontSize: 14, color: '#6366F1', flexShrink: 0 }} />
      <Typography sx={{ flex: 1, fontSize: '0.75rem', fontFamily: 'monospace',
        color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {link.shareUrl}
      </Typography>
      <IconButton size="small" onClick={() => onCopy(link.shareUrl)}
        sx={{ flexShrink: 0, color: '#6366F1', '&:hover': { background: 'rgba(99,102,241,0.08)' } }}>
        <ContentCopy sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>

    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.25 }}>
      <Box sx={{ px: 1, py: 0.2, borderRadius: '4px', background: '#F1F5F9' }}>
        <Typography sx={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
          Expires {formatDate(link.expiresAt)}
        </Typography>
      </Box>
      {link.requiresPassword && (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.2, borderRadius: '4px', background: '#FEF3C7' }}>
          <Lock sx={{ fontSize: 10, color: '#F59E0B' }} />
          <Typography sx={{ fontSize: '0.7rem', color: '#F59E0B', fontWeight: 600 }}>Password Protected</Typography>
        </Box>
      )}
      {link.maxViews && (
        <Box sx={{ px: 1, py: 0.2, borderRadius: '4px', background: '#ECFDF5' }}>
          <Typography sx={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>
            {link.viewCount}/{link.maxViews} views
          </Typography>
        </Box>
      )}
    </Box>

    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button size="small" startIcon={<QrCode2 sx={{ fontSize: 13 }} />} onClick={() => onViewQR(link)}
        sx={{ borderRadius: '7px', fontSize: '0.75rem', color: '#6366F1',
          '&:hover': { background: 'rgba(99,102,241,0.08)' } }}>
        View QR
      </Button>
      <Button size="small" color="error" onClick={() => onDelete(link.id)}
        sx={{ borderRadius: '7px', fontSize: '0.75rem' }}>
        Delete
      </Button>
    </Box>
  </Box>
);

// ─── Main ─────────────────────────────────────────────────────────────────
const DocumentDetails = ({ open, onClose, document: initialDocument, onUpdate, onDelete }) => {
  const [document, setDocument]           = useState(initialDocument);
  const [loading, setLoading]             = useState(false);
  const [editing, setEditing]             = useState(false);
  const [editedNotes, setEditedNotes]     = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [categories, setCategories]       = useState([]);
  const [shareLinks, setShareLinks]       = useState([]);
  const [qrDialogOpen, setQrDialogOpen]   = useState(false);
  const [qrCodeUrl, setQrCodeUrl]         = useState(null);
  const [viewerOpen, setViewerOpen]       = useState(false);

  useEffect(() => {
    if (open && document) {
      setDocument(document);
      setEditedNotes(document.notes || '');
      setEditedCategory(document.category?.id || '');
      loadCategories();
      loadShareLinks();
    }
  }, [open, document]);

  const loadCategories = async () => {
    try {
      const response = await categoryService.getCategories();
      if (response.success) setCategories(response.data || []);
    } catch { /* silent */ }
  };

  const loadShareLinks = async () => {
    try {
      const response = await shareLinkService.getMyShares();
      if (response.success) {
        setShareLinks((response.data || []).filter((l) => l.documentId === document.id));
      }
    } catch { /* silent */ }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const response = await documentService.downloadDocument(document.id);
      const url  = window.URL.createObjectURL(new Blob([response]));
      const link = window.createElement('a');
      link.href  = url;
      link.setAttribute('download', document.originalFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started!');
    } catch { toast.error('Failed to download document'); }
    finally { setLoading(false); }
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const response = await documentService.updateDocument(document.id, {
        notes: editedNotes, categoryId: editedCategory,
      });
      if (response.success) {
        setDocument(response.data);
        setEditing(false);
        toast.success('Document updated!');
        if (onUpdate) onUpdate(response.data);
      }
    } catch { toast.error('Failed to update document'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        setLoading(true);
        await documentService.deleteDocument(document.id);
        toast.success('Document deleted!');
        if (onDelete) onDelete(document.id);
        onClose();
      } catch { toast.error('Failed to delete document'); }
      finally { setLoading(false); }
    }
  };

  const handleShare = async () => {
    try {
      setLoading(true);
      const response = await shareLinkService.createShareLink({
        documentId: document.id, expiryHours: 72, allowDownload: true,
      });
      if (response.success) { toast.success('Share link created!'); loadShareLinks(); }
    } catch { toast.error('Failed to create share link'); }
    finally { setLoading(false); }
  };

  const handleCopyShareLink = (shareUrl) => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  };

  const handleViewQRCode = async (shareLink) => {
    try {
      setLoading(true);
      const response = await shareLinkService.getQRCode(shareLink.id);
      setQrCodeUrl(URL.createObjectURL(response));
      setQrDialogOpen(true);
    } catch { toast.error('Failed to load QR code'); }
    finally { setLoading(false); }
  };

  const handleDeleteShareLink = async (shareLinkId) => {
    if (window.confirm('Delete this share link?')) {
      try {
        await shareLinkService.deleteShareLink(shareLinkId);
        toast.success('Share link deleted!');
        loadShareLinks();
      } catch { toast.error('Failed to delete share link'); }
    }
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (!document) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 0 } }}>

        <DialogTitle sx={{ pt: 3, px: 3, pb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
              Document Details
            </Typography>
            <IconButton onClick={onClose} size="small"
              sx={{ color: '#94A3B8', '&:hover': { background: '#F1F5F9' } }}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pt: 2.5 }}>
          <Grid container spacing={3}>
            {/* Preview */}
            <Grid item xs={12} md={5}>
              <Box sx={{
                height: 280, borderRadius: '12px', background: '#F8F9FC',
                border: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {document.thumbnailPath ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/documents/${document.id}/thumbnail`}
                    alt="Thumbnail"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '3rem', mb: 1 }}>📄</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8' }}>No Preview</Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Details */}
            <Grid item xs={12} md={7}>
              <MetaRow label="File Name" value={document.originalFilename} />

              <Box sx={{ mb: 1.75 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
                  Category
                </Typography>
                {editing ? (
                  <TextField select fullWidth size="small" value={editedCategory}
                    onChange={(e) => setEditedCategory(e.target.value)}>
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id} sx={{ fontSize: '0.875rem' }}>
                        {cat.icon} {cat.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75,
                    px: 1.25, py: 0.4, borderRadius: '6px', background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.15)' }}>
                    <Category sx={{ fontSize: 13, color: '#6366F1' }} />
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#6366F1' }}>
                      {document.category?.name || 'Others'}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}><MetaRow label="File Size" value={formatFileSize(document.fileSize)} /></Grid>
                <Grid item xs={6}><MetaRow label="File Type" value={document.fileType} /></Grid>
                <Grid item xs={6}><MetaRow label="Document Number" value={document.documentNumber} /></Grid>
                <Grid item xs={6}><MetaRow label="Upload Date" value={formatDate(document.createdAt)} /></Grid>
                <Grid item xs={6}><MetaRow label="Issue Date" value={formatDate(document.issueDate)} /></Grid>
                <Grid item xs={6}><MetaRow label="Expiry Date" value={formatDate(document.expiryDate)} /></Grid>
              </Grid>

              <Box sx={{ mt: 0.25 }}>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
                  Notes
                </Typography>
                {editing ? (
                  <TextField fullWidth multiline rows={3} size="small"
                    value={editedNotes} onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Add notes…" />
                ) : (
                  <Typography sx={{ fontSize: '0.875rem', color: document.notes ? '#0F172A' : '#94A3B8' }}>
                    {document.notes || 'No notes'}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Share Links */}
          {shareLinks.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', mb: 2 }}>
                Active Share Links
              </Typography>
              {shareLinks.map((link) => (
                <ShareLinkCard key={link.id} link={link} formatDate={formatDate}
                  onCopy={handleCopyShareLink} onViewQR={handleViewQRCode}
                  onDelete={handleDeleteShareLink} />
              ))}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={handleDelete} color="error" startIcon={<Delete sx={{ fontSize: 15 }} />}
            sx={{ borderRadius: '8px' }}>
            Delete
          </Button>
          <Box sx={{ flex: 1 }} />
          {editing ? (
            <>
              <Button onClick={() => setEditing(false)}
                sx={{ borderRadius: '8px', color: '#64748B' }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSaveEdit} disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontWeight: 600 }}>
                Save
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setEditing(true)} startIcon={<Edit sx={{ fontSize: 15 }} />}
                sx={{ borderRadius: '8px', color: '#475569', '&:hover': { background: '#F1F5F9' } }}>
                Edit
              </Button>
              <Button onClick={() => setViewerOpen(true)} startIcon={<Visibility sx={{ fontSize: 15 }} />}
                sx={{ borderRadius: '8px', color: '#475569', '&:hover': { background: '#F1F5F9' } }}>
                View
              </Button>
              <Button onClick={handleDownload} startIcon={<Download sx={{ fontSize: 15 }} />}
                sx={{ borderRadius: '8px', color: '#475569', '&:hover': { background: '#F1F5F9' } }}>
                Download
              </Button>
              <Button variant="contained" onClick={handleShare} disabled={loading}
                startIcon={<Share sx={{ fontSize: 15 }} />}
                sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontWeight: 600 }}>
                Share
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="xs"
        PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}>
        <DialogTitle sx={{ pt: 3, px: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>QR Code</Typography>
            <IconButton onClick={() => setQrDialogOpen(false)} size="small"
              sx={{ color: '#94A3B8', '&:hover': { background: '#F1F5F9' } }}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', px: 3, pb: 1 }}>
          {qrCodeUrl ? (
            <Box>
              <Box sx={{ p: 2, borderRadius: '12px', background: '#F8F9FC', border: '1px solid #E2E8F0', display: 'inline-block' }}>
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '100%', maxWidth: 240, height: 'auto', display: 'block' }} />
              </Box>
              <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8', mt: 1.5 }}>
                Scan to access the document
              </Typography>
            </Box>
          ) : (
            <CircularProgress sx={{ color: '#6366F1' }} />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setQrDialogOpen(false)} fullWidth
            sx={{ borderRadius: '10px', borderColor: '#E2E8F0', color: '#475569' }} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Document Viewer */}
      <DocumentViewer open={viewerOpen} onClose={() => setViewerOpen(false)} document={document} />
    </>
  );
};

export default DocumentDetails;