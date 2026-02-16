import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  Download,
  InsertDriveFile,
  Warning,
  Folder,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import shareService from '../services/shareService';

const ShareViewPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchSharedDoc = async () => {
      try {
        setLoading(true);
        const data = await shareService.getSharedDocument(token);
        setDocument(data);
      } catch (err) {
        console.error('Error loading shared document:', err);
        setError(err.response?.data?.message || 'Link expired or invalid');
        toast.error('Failed to load shared document');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSharedDoc();
    }
  }, [token]);

  const handleDownload = async () => {
    if (!document) return;

    try {
      setDownloading(true);
      window.open(`http://localhost:8080/api/share/${token}/download`, '_blank');
      toast.success('Download started!');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download document');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // ========== LOADING ==========
  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <CircularProgress size={60} />
          <Typography color="text.secondary">Loading Document...</Typography>
        </Box>
      </Container>
    );
  }

  // ========== ERROR ==========
  if (error || !document) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
          }}
        >
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
            <Warning sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Document Not Available
            </Typography>
            <Typography color="text.secondary" paragraph>
              {error || 'Document not found or link expired.'}
            </Typography>
            <Button variant="contained" onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  // ========== DOCUMENT VIEW ==========
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
          <InsertDriveFile sx={{ fontSize: 60, color: 'primary.main', mr: 2 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" gutterBottom>
              {document.originalFilename}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {document.category && (
                <Chip icon={<Folder />} label={document.category} size="small" />
              )}
              <Chip
                label={document.fileType?.toUpperCase()}
                color="primary"
                size="small"
              />
              <Chip label={formatFileSize(document.fileSize)} size="small" />
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Document Details */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Document Information
          </Typography>

          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Type:</strong> {document.fileType?.toUpperCase()}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Size:</strong> {formatFileSize(document.fileSize)}
          </Typography>
          {document.category && (
            <Typography variant="body2">
              <strong>Category:</strong> {document.category}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Download Button */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={
            downloading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Download />
            )
          }
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Downloading...' : 'Download Document'}
        </Button>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Shared securely via DocBox
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default ShareViewPage;