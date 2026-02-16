import React, { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const DocumentViewer = ({ open, document, onClose, onDelete, onUpdate }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && document) {
      loadPreview();
    } else {
      // Clean up preview URL when dialog closes
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [open, document]);

  const loadPreview = async () => {
    if (!document) return;

    try {
      setLoading(true);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:8080/api/documents/${document.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load document');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Preview load error:', error);
      toast.error('Failed to load document preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/documents/${document.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.originalFilename);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Download started');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Download failed');
    }
  };

  const handleFavoriteToggle = async () => {
    try {
      if (onUpdate) {
        await onUpdate(document.id, { isFavorite: !document.isFavorite });
        toast.success(document.isFavorite ? 'Removed from favorites' : 'Added to favorites');
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      toast.error('Failed to update favorite status');
    }
  };

  const handleArchiveToggle = async () => {
    try {
      if (onUpdate) {
        await onUpdate(document.id, { isArchived: !document.isArchived });
        toast.success(document.isArchived ? 'Unarchived' : 'Archived');
      }
    } catch (err) {
      console.error('Failed to toggle archive:', err);
      toast.error('Failed to update archive status');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      if (onDelete) {
        await onDelete(document.id);
        onClose();
      }
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const canPreview = () => {
    const fileType = document?.fileType?.toLowerCase();
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'].includes(fileType);
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onClose();
  };

  if (!document) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InsertDriveFile />
            <Typography variant="h6" noWrap sx={{ maxWidth: 500 }}>
              {document.originalFilename}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Document Info Bar */}
        <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {document.category && (
              <Chip
                icon={<Folder />}
                label={`${document.category.icon} ${document.category.name}`}
                size="small"
              />
            )}
            <Chip
              label={document.fileType?.toUpperCase()}
              color="primary"
              size="small"
            />
            <Chip
              label={formatFileSize(document.fileSize)}
              size="small"
            />
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

        {/* Document Preview */}
        <Box 
          sx={{ 
            minHeight: 500, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            bgcolor: 'grey.100',
            borderRadius: 1,
            p: 2,
          }}
        >
          {loading ? (
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={60} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading preview...
              </Typography>
            </Box>
          ) : canPreview() && previewUrl ? (
            <>
              {document.fileType?.toLowerCase() === 'pdf' ? (
                <iframe
                  src={previewUrl}
                  style={{
                    width: '100%',
                    height: '600px',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                  title={document.originalFilename}
                />
              ) : (
                <Box
                  component="img"
                  src={previewUrl}
                  alt={document.originalFilename}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '600px',
                    objectFit: 'contain',
                    borderRadius: 1,
                  }}
                />
              )}
            </>
          ) : (
            <Alert severity="info" sx={{ width: '100%' }}>
              Preview not available for this file type. Click Download to view the file.
            </Alert>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Notes */}
        {document.notes && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Notes
            </Typography>
            <Typography variant="body2">{document.notes}</Typography>
          </Box>
        )}

        {/* Action Buttons */}
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

      <DialogActions>
        <Button onClick={handleDelete} color="error" startIcon={<Delete />}>
          Delete
        </Button>
        <Button onClick={handleDownload} variant="contained" startIcon={<Download />}>
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default DocumentViewer;
