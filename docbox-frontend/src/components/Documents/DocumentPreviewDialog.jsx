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

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`;

const DocumentPreviewDialog = ({ open, document, onClose, onDelete, onUpdate, onDownload }) => {
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
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/documents/${document.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load preview');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Preview load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = () => {
    onUpdate(document.id, { isFavorite: !document.isFavorite });
  };

  const handleArchiveToggle = () => {
    onUpdate(document.id, { isArchived: !document.isArchived });
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
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileType);
  };

  if (!document) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InsertDriveFile />
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
        {/* Document Info Bar */}
        <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {document.category && (
              <Chip
                icon={<Folder />}
                label={document.category.name}
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
        <Box sx={{ minHeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {loading ? (
            <CircularProgress />
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
                <img
                  src={previewUrl}
                  alt={document.originalFilename}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '600px',
                    objectFit: 'contain',
                    borderRadius: '4px',
                  }}
                />
              )}
            </>
          ) : (
            <Alert severity="info" sx={{ width: '100%' }}>
              Preview not available for this file type. Please download to view.
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

        {/* Actions */}
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
        <Button onClick={() => onDelete(document)} color="error" startIcon={<Delete />}>
          Delete
        </Button>
        <Button onClick={() => onDownload(document)} variant="contained" startIcon={<Download />}>
          Download
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentPreviewDialog;