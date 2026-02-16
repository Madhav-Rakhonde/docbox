import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import {
  Lock,
  Download,
  InsertDriveFile,
  Warning,
  Folder,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const SharePage = () => {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [document, setDocument] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (token) {
      checkShareLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const checkShareLink = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/share/${token}`, {
        params: password ? { password } : {},
      });

      if (response.data?.success) {
        const data = response.data.data;

        setDocument({
          id: data.documentId,
          originalFilename: data.originalFilename,
          fileSize: data.fileSize,
          fileType: data.fileType,
          category: { name: data.category },
          createdAt: data.uploadedAt,
        });

        setRequiresPassword(false);
      }
    } catch (err) {
      console.error('Share link error:', err);

      if (err.response?.status === 401) {
        setRequiresPassword(true);
        setError('This document is password protected');
      } else if (err.response?.status === 410) {
        setError('This share link has expired');
      } else if (err.response?.status === 404) {
        setError('Share link not found');
      } else {
        setError(
          err.response?.data?.message ||
            'Failed to access shared document'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Please enter the password');
      return;
    }
    checkShareLink();
  };

  const handleDownload = async () => {
    if (!document) {
      toast.error('Document not available');
      return;
    }

    try {
      setDownloading(true);

      const response = await api.get(`/share/${token}/download`, {
        responseType: 'blob',
        params: password ? { password } : {},
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.originalFilename || 'document');
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

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

  /* ---------------- LOADING ---------------- */
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
          <Typography color="text.secondary">
            Loading shared document...
          </Typography>
        </Box>
      </Container>
    );
  }

  /* ---------------- ERROR ---------------- */
  if (error && !requiresPassword) {
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
              Unable to Access Document
            </Typography>
            <Typography color="text.secondary">{error}</Typography>
          </Paper>
        </Box>
      </Container>
    );
  }

  /* ---------------- PASSWORD ---------------- */
  if (requiresPassword && !document) {
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
          <Paper sx={{ p: 4, width: '100%' }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Lock sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6">Password Protected</Typography>
              <Typography variant="body2" color="text.secondary">
                This document requires a password to access
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handlePasswordSubmit}>
              <TextField
                fullWidth
                type="password"
                label="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 2 }}
                autoFocus
              />
              <Button fullWidth variant="contained" type="submit">
                Access Document
              </Button>
            </form>
          </Paper>
        </Box>
      </Container>
    );
  }

  /* ---------------- DOCUMENT VIEW ---------------- */
  if (document) {
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
                {document.category?.name && (
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
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Document Info */}
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
            {document.category?.name && (
              <Typography variant="body2">
                <strong>Category:</strong> {document.category.name}
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
              This document was shared securely using DocBox
            </Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  return null;
};

export default SharePage;