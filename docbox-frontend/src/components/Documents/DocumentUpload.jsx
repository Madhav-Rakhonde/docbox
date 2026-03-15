import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, LinearProgress, Alert, IconButton, AlertTitle,
  CircularProgress,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import {
  CloudUpload, Close, InsertDriveFile, AutoAwesome, Warning,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api, { endpoints } from '../../services/api';

// ── Polling config ────────────────────────────────────────────────────────
// Dialog closes immediately after upload.
// Polling runs silently in the background — no UI needed here.
// First poll fires after 2 minutes; retries every 10s up to 6 times.
const INITIAL_POLL_DELAY_MS = 120_000;  // 2 minutes
const POLL_INTERVAL_MS      =  10_000;  // 10 seconds between retries
const MAX_POLLS             = 6;

const DocumentUpload = ({ open, onClose, onSuccess }) => {
  const [file,                 setFile]                 = useState(null);
  const [uploading,            setUploading]            = useState(false);
  const [uploadProgress,       setUploadProgress]       = useState(0);
  const [duplicateInfo,        setDuplicateInfo]        = useState(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [forceUpload,          setForceUpload]          = useState(false);

  const pollCountRef = useRef(0);
  const pollTimerRef = useRef(null);

  // Clean up polling timer on unmount
  useEffect(() => {
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, []);

  // ── Dropzone ──────────────────────────────────────────────────────────
  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles?.length) return;
    const selected = acceptedFiles[0];
    setFile(selected);
    resetState();
    await checkForDuplicate(selected);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'image/*':            ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf':    ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────
  const resetState = () => {
    setDuplicateInfo(null);
    setShowDuplicateWarning(false);
    setForceUpload(false);
    setUploadProgress(0);
    pollCountRef.current = 0;
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
  };

  const handleClose = () => {
    if (uploading) return; // don't allow close mid-upload
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setFile(null);
    resetState();
    onClose();
  };

  // ── Duplicate check ───────────────────────────────────────────────────
  // Uses: endpoints.documents + '/check-duplicate'
  // The api.js request interceptor automatically removes Content-Type
  // for FormData so no header override needed here.
  const checkForDuplicate = async (selectedFile) => {
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await api.post(
        `${endpoints.documents}/check-duplicate`,
        formData
      );
      if (response.data.data?.isDuplicate) {
        setDuplicateInfo(response.data.data.existingDocument);
        setShowDuplicateWarning(true);
        toast.warning('⚠️ Duplicate file detected!', { autoClose: 5000 });
      }
    } catch { /* silent — best effort */ }
  };

  // ── Background polling ────────────────────────────────────────────────
  // Uses: endpoints.documents + '/{id}/status'
  // Called after upload. Dialog is already closed at this point.
  // When status turns READY/FAILED, calls onSuccess() to refresh the list.
  const startPolling = (documentId) => {
    pollCountRef.current = 0;
    pollTimerRef.current = setTimeout(
      () => runPoll(documentId),
      INITIAL_POLL_DELAY_MS
    );
  };

  const runPoll = async (documentId) => {
    if (pollCountRef.current >= MAX_POLLS) {
      if (onSuccess) onSuccess();
      return;
    }
    pollCountRef.current += 1;

    try {
      const res    = await api.get(`${endpoints.documents}/${documentId}/status`);
      const data   = res.data?.data || {};
      const status = data.processingStatus || 'READY';

      if (status === 'READY') {
        toast.success(`✨ Category detected: ${data.category?.name || 'Others'}`);
        if (onSuccess) onSuccess();

      } else if (status === 'FAILED') {
        toast.warning('⚠️ Auto-detection failed — please set category manually.');
        if (onSuccess) onSuccess();

      } else {
        // Still processing — retry
        pollTimerRef.current = setTimeout(() => runPoll(documentId), POLL_INTERVAL_MS);
      }
    } catch {
      // Network error — retry
      pollTimerRef.current = setTimeout(() => runPoll(documentId), POLL_INTERVAL_MS);
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────
  // Uses: endpoints.upload
  const performActualUpload = async (shouldForce) => {
    if (!file) { toast.error('Please select a file'); return; }

    try {
      setUploading(true);
      setUploadProgress(10);

      const formData = new FormData();
      formData.append('file', file, file.name);
      if (shouldForce) formData.append('force', 'true');

      setUploadProgress(30);

      const response = await api.post(endpoints.upload, formData, {
        onUploadProgress: (e) => {
          setUploadProgress(Math.min(Math.round(e.loaded * 100 / e.total), 90));
        },
      });

      setUploadProgress(100);

      if (response.data.success || response.status === 200) {
        const payload      = response.data.data || response.data;
        const doc          = payload.document   || payload;
        const isProcessing = payload.isProcessing === true;
        const catName      = doc.category?.name || 'Document';

        if (isProcessing) {
          // Close immediately — OCR runs in background
          if (onSuccess) onSuccess();    // refresh list → card shows PROCESSING badge
          startPolling(doc.id);          // first check after 2 min
          toast.info(
            '📄 Document saved! Category will be detected automatically.',
            { autoClose: 5000 }
          );
        } else {
          toast.success(
            shouldForce
              ? `✨ Duplicate uploaded! Category: ${catName}`
              : `✨ Uploaded! Category: ${catName}`,
            { autoClose: 5000 }
          );
          if (onSuccess) onSuccess();
        }

        // Always close the dialog once upload succeeds
        handleClose();
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Upload failed';
      if (msg.toLowerCase().includes('duplicate')) {
        toast.error(msg, { autoClose: 8000 });
        setShowDuplicateWarning(true);
        setForceUpload(false);
      } else {
        toast.error(`Upload failed: ${msg}`);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Please select a file'); return; }

    if (showDuplicateWarning && duplicateInfo && !forceUpload) {
      const confirmed = window.confirm(
        `⚠️ Duplicate File Detected!\n\n` +
        `Already uploaded: "${duplicateInfo.filename}"\n` +
        `Category: ${duplicateInfo.category}\n` +
        `Date: ${new Date(duplicateInfo.uploadedDate).toLocaleDateString()}\n\n` +
        `Upload again anyway?`
      );
      if (!confirmed) return;
      setForceUpload(true);
      await performActualUpload(true);
    } else {
      await performActualUpload(forceUpload);
    }
  };

  const isDuplWarn = showDuplicateWarning && !forceUpload;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}>

      {/* ── Title ──────────────────────────────────────────────────── */}
      <DialogTitle sx={{ pt: 3, px: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
              Upload Document
            </Typography>
            <AutoAwesome sx={{ fontSize: 16, color: '#6366F1' }} />
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={uploading}
            sx={{ color: '#94A3B8', '&:hover': { background: '#F1F5F9' } }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>

        {/* Info */}
        <Alert severity="info" sx={{ mb: 2, borderRadius: '10px', fontSize: '0.825rem' }}>
          <strong>AI Magic! ✨</strong> Auto-detects category and finds expiry dates.
        </Alert>

        {/* Duplicate warning */}
        {isDuplWarn && duplicateInfo && (
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 2, borderRadius: '10px' }}>
            <AlertTitle sx={{ fontSize: '0.875rem' }}>⚠️ Duplicate File Detected!</AlertTitle>
            <Typography sx={{ fontSize: '0.8rem' }}>
              Already uploaded: <strong>"{duplicateInfo.filename}"</strong>
            </Typography>
            <Typography sx={{ fontSize: '0.8rem' }}>
              Category: <strong>{duplicateInfo.category}</strong>
            </Typography>
            <Typography sx={{ fontSize: '0.8rem' }}>
              Date: <strong>{new Date(duplicateInfo.uploadedDate).toLocaleDateString()}</strong>
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', mt: 0.75, fontWeight: 700, color: 'warning.dark' }}>
              Click "Upload Anyway" to keep both copies.
            </Typography>
          </Alert>
        )}

        {/* Dropzone */}
        <Box {...getRootProps()} sx={{
          border: '2px dashed', borderRadius: '14px', p: 4, textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          borderColor: isDragActive ? '#6366F1' : '#E2E8F0',
          background: isDragActive ? 'rgba(99,102,241,0.04)' : '#FAFBFC',
          mb: 2.5, transition: 'all 200ms ease',
          '&:hover': uploading ? {} : {
            borderColor: '#6366F1', background: 'rgba(99,102,241,0.03)',
          },
        }}>
          <input {...getInputProps()} disabled={uploading} />

          {file ? (
            <Box>
              <Box sx={{
                width: 52, height: 52, borderRadius: '14px',
                background: 'rgba(16,185,129,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 1.5,
              }}>
                <InsertDriveFile sx={{ fontSize: 26, color: '#10B981' }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A', mb: 0.25 }}>
                {file.name}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Box>
          ) : (
            <Box>
              <Box sx={{
                width: 52, height: 52, borderRadius: '14px',
                background: 'rgba(99,102,241,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 1.5,
              }}>
                <CloudUpload sx={{ fontSize: 26, color: '#6366F1' }} />
              </Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A', mb: 0.5 }}>
                Drag & drop a file here, or click to select
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                PDF, Images, Word documents · Max 50MB
              </Typography>
            </Box>
          )}
        </Box>

        {/* Progress bar — only shown while uploading */}
        {uploading && (
          <Box sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748B', mb: 0.5 }}>
              Uploading… {uploadProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress}
              sx={{
                borderRadius: 99, height: 6,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 99,
                  background: 'linear-gradient(90deg, #6366F1, #818CF8)',
                },
              }}
            />
          </Box>
        )}

      </DialogContent>

      {/* ── Actions ───────────────────────────────────────────────── */}
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={uploading}
          sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || uploading}
          startIcon={
            uploading
              ? <CircularProgress size={15} color="inherit" />
              : <AutoAwesome sx={{ fontSize: 15 }} />
          }
          sx={{
            borderRadius: '8px', fontWeight: 600,
            background: isDuplWarn
              ? 'linear-gradient(135deg, #F59E0B, #D97706)'
              : 'linear-gradient(135deg, #6366F1, #4F46E5)',
            '&:hover': {
              background: isDuplWarn
                ? 'linear-gradient(135deg, #D97706, #B45309)'
                : 'linear-gradient(135deg, #4F46E5, #4338CA)',
            },
            '&.Mui-disabled': { background: '#E2E8F0' },
          }}>
          {uploading ? 'Uploading…' : isDuplWarn ? 'Upload Anyway ⚠️' : 'Upload with AI ✨'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentUpload;