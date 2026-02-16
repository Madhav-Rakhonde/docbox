import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Grid,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Card,
  CardContent,
} from '@mui/material';
import {
  Close,
  Download,
  Share,
  Delete,
  Edit,
  Visibility,
  Person,
  CalendarToday,
  Category,
  Description,
  Link as LinkIcon,
  QrCode2,
  Lock,
  ContentCopy,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import documentService from '../../services/documentService';
import shareLinkService from '../../services/shareLinkService';
import categoryService from '../../services/categoryService';
import DocumentViewer from './DocumentViewer';

const DocumentDetails = ({ open, onClose, document: initialDocument, onUpdate, onDelete }) => {
  const [document, setDocument] = useState(initialDocument);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [shareLinks, setShareLinks] = useState([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);

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
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadShareLinks = async () => {
    try {
      const response = await shareLinkService.getMyShares();
      if (response.success) {
        const docLinks = (response.data || []).filter(
          (link) => link.documentId === document.id
        );
        setShareLinks(docLinks);
      }
    } catch (error) {
      console.error('Failed to load share links:', error);
    }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const response = await documentService.downloadDocument(document.id);
      
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = window.createElement('a');
      link.href = url;
      link.setAttribute('download', document.originalFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const response = await documentService.updateDocument(document.id, {
        notes: editedNotes,
        categoryId: editedCategory,
      });

      if (response.success) {
        setDocument(response.data);
        setEditing(false);
        toast.success('Document updated successfully!');
        if (onUpdate) onUpdate(response.data);
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update document');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        setLoading(true);
        await documentService.deleteDocument(document.id);
        toast.success('Document deleted successfully!');
        if (onDelete) onDelete(document.id);
        onClose();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete document');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleShare = async () => {
    try {
      setLoading(true);
      const response = await shareLinkService.createShareLink({
        documentId: document.id,
        expiryHours: 72,
        allowDownload: true,
      });

      if (response.success) {
        toast.success('Share link created!');
        loadShareLinks();
        setShareDialogOpen(true);
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyShareLink = (shareUrl) => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleViewQRCode = async (shareLink) => {
    try {
      setLoading(true);
      const response = await shareLinkService.getQRCode(shareLink.id);
      
      const url = URL.createObjectURL(response);
      setQrCodeUrl(url);
      setQrDialogOpen(true);
    } catch (error) {
      console.error('Failed to load QR code:', error);
      toast.error('Failed to load QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShareLink = async (shareLinkId) => {
    if (window.confirm('Delete this share link?')) {
      try {
        await shareLinkService.deleteShareLink(shareLinkId);
        toast.success('Share link deleted!');
        loadShareLinks();
      } catch (error) {
        console.error('Failed to delete share link:', error);
        toast.error('Failed to delete share link');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Document Details</Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Preview Section */}
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  height: 300,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                {document.thumbnailPath ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/documents/${document.id}/thumbnail`}
                    alt="Thumbnail"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No Preview
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* Details Section */}
            <Grid item xs={12} md={7}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  File Name
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {document.originalFilename}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Category
                </Typography>
                {editing ? (
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={editedCategory}
                    onChange={(e) => setEditedCategory(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Chip
                    label={document.category?.name || 'Others'}
                    icon={<Category />}
                    color="primary"
                    size="small"
                  />
                )}
              </Box>

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
                  <Typography variant="body2">{document.fileType}</Typography>
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Document Number
                  </Typography>
                  <Typography variant="body2">{document.documentNumber || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Upload Date
                  </Typography>
                  <Typography variant="body2">{formatDate(document.createdAt)}</Typography>
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Issue Date
                  </Typography>
                  <Typography variant="body2">{formatDate(document.issueDate)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Expiry Date
                  </Typography>
                  <Typography variant="body2">{formatDate(document.expiryDate)}</Typography>
                </Grid>
              </Grid>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Notes
                </Typography>
                {editing ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Add notes..."
                  />
                ) : (
                  <Typography variant="body2">{document.notes || 'No notes'}</Typography>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Share Links Section */}
          {shareLinks.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>
                Active Share Links
              </Typography>
              <List>
                {shareLinks.map((link) => (
                  <Card key={link.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LinkIcon fontSize="small" />
                        <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace' }}>
                          {link.shareUrl}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyShareLink(link.shareUrl)}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <Chip label={`Expires: ${formatDate(link.expiresAt)}`} size="small" />
                        {link.requiresPassword && (
                          <Chip icon={<Lock />} label="Password Protected" size="small" />
                        )}
                        {link.maxViews && (
                          <Chip
                            label={`Views: ${link.viewCount}/${link.maxViews}`}
                            size="small"
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<QrCode2 />}
                          onClick={() => handleViewQRCode(link)}
                        >
                          View QR
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleDeleteShareLink(link.id)}
                        >
                          Delete
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </List>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDelete} color="error" startIcon={<Delete />}>
            Delete
          </Button>
          <Box sx={{ flex: 1 }} />
          {editing ? (
            <>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSaveEdit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Save
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setEditing(true)} startIcon={<Edit />}>
                Edit
              </Button>
              <Button onClick={() => setViewerOpen(true)} startIcon={<Visibility />}>
                View
              </Button>
              <Button onClick={handleDownload} startIcon={<Download />}>
                Download
              </Button>
              <Button
                variant="contained"
                onClick={handleShare}
                startIcon={<Share />}
                disabled={loading}
              >
                Share
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">QR Code</Typography>
            <IconButton onClick={() => setQrDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          {qrCodeUrl ? (
            <Box>
              <img
                src={qrCodeUrl}
                alt="QR Code"
                style={{ width: '100%', maxWidth: 300, height: 'auto' }}
              />
              <Typography variant="caption" display="block" sx={{ mt: 2 }} color="text.secondary">
                Scan this code to access the document
              </Typography>
            </Box>
          ) : (
            <CircularProgress />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Document Viewer */}
      <DocumentViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        document={document}
      />
    </>
  );
};

export default DocumentDetails;