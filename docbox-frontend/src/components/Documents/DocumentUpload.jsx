import React, { useState, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, LinearProgress, Alert, IconButton, AlertTitle,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { CloudUpload, Close, InsertDriveFile, AutoAwesome, Warning } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

const DocumentUpload = ({ open, onClose, onSuccess }) => {
  const [file, setFile]                               = useState(null);
  const [uploading, setUploading]                     = useState(false);
  const [analyzing, setAnalyzing]                     = useState(false);
  const [uploadProgress, setUploadProgress]           = useState(0);
  const [detectedData, setDetectedData]               = useState(null);
  const [duplicateInfo, setDuplicateInfo]             = useState(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [forceUpload, setForceUpload]                 = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setDetectedData(null);
      setDuplicateInfo(null);
      setShowDuplicateWarning(false);
      setForceUpload(false);
      await checkForDuplicate(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'image/*': ['.png','.jpg','.jpeg','.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const checkForDuplicate = async (selectedFile) => {
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await api.post('/documents/check-duplicate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.data?.isDuplicate) {
        setDuplicateInfo(response.data.data.existingDocument);
        setShowDuplicateWarning(true);
        toast.warning('⚠️ Duplicate file detected!', { autoClose: 5000 });
      }
    } catch { /* silent */ }
  };

  const performActualUpload = async (shouldForce) => {
    if (!file) { toast.error('Please select a file'); return; }
    try {
      setUploading(true); setAnalyzing(true); setUploadProgress(10);
      const formData = new FormData();
      formData.append('file', file, file.name);
      if (shouldForce) formData.append('force', 'true');
      setUploadProgress(30);
      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          setUploadProgress(Math.min(Math.round(progressEvent.loaded * 100 / progressEvent.total), 90));
        },
      });
      setUploadProgress(100); setAnalyzing(false);
      if (response.data.success || response.status === 200) {
        const doc = response.data.data?.document || response.data.data || response.data;
        setDetectedData({
          category: doc.category?.name || 'Document uploaded',
          documentNumber: doc.documentNumber,
          issueDate: doc.issueDate,
          expiryDate: doc.expiryDate,
          ocrText: doc.ocrText ? 'Text extracted successfully' : null,
        });
        toast.success(shouldForce
          ? `✨ Duplicate uploaded! Category: ${doc.category?.name || 'Document'}`
          : `✨ Document uploaded! ${doc.category?.name ? `Category: ${doc.category.name}` : ''}`,
          { autoClose: 5000 });
        setTimeout(() => { if (onSuccess) onSuccess(); handleClose(); }, 2000);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
      if (errorMessage.includes('Duplicate') || errorMessage.includes('duplicate')) {
        toast.error(errorMessage, { autoClose: 8000 });
        setShowDuplicateWarning(true); setForceUpload(false);
      } else { toast.error(`Upload failed: ${errorMessage}`); }
    } finally { setUploading(false); setAnalyzing(false); }
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Please select a file'); return; }
    if (showDuplicateWarning && duplicateInfo && !forceUpload) {
      const confirmed = window.confirm(
        `⚠️ Duplicate File Detected!\n\nYou already uploaded "${duplicateInfo.filename}"\nCategory: ${duplicateInfo.category}\nDate: ${new Date(duplicateInfo.uploadedDate).toLocaleDateString()}\n\nDo you still want to upload this file again?`
      );
      if (!confirmed) return;
      setForceUpload(true);
      await performActualUpload(true);
    } else {
      await performActualUpload(forceUpload);
    }
  };

  const handleClose = () => {
    setFile(null); setDetectedData(null); setDuplicateInfo(null);
    setShowDuplicateWarning(false); setForceUpload(false); setUploadProgress(0);
    onClose();
  };

  const isDuplWarn = showDuplicateWarning && !forceUpload;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}>

      <DialogTitle sx={{ pt: 3, px: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
              Upload Document
            </Typography>
            <AutoAwesome sx={{ fontSize: 16, color: '#6366F1' }} />
          </Box>
          <IconButton onClick={handleClose} size="small"
            sx={{ color: '#94A3B8', '&:hover': { background: '#F1F5F9' } }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>
        <Alert severity="info" sx={{ mb: 2, borderRadius: '10px', fontSize: '0.825rem' }}>
          <strong>AI Magic! ✨</strong> Our system auto-detects category, extracts text, and finds dates!
        </Alert>

        {isDuplWarn && duplicateInfo && (
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 2, borderRadius: '10px' }}>
            <AlertTitle sx={{ fontSize: '0.875rem' }}>⚠️ Duplicate File Detected!</AlertTitle>
            <Typography sx={{ fontSize: '0.8rem' }}>
              You already uploaded <strong>"{duplicateInfo.filename}"</strong>
            </Typography>
            <Typography sx={{ fontSize: '0.8rem' }}>Category: <strong>{duplicateInfo.category}</strong></Typography>
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
          border: '2px dashed', borderRadius: '14px', p: 4, textAlign: 'center', cursor: 'pointer',
          borderColor: isDragActive ? '#6366F1' : '#E2E8F0',
          background: isDragActive ? 'rgba(99,102,241,0.04)' : '#FAFBFC',
          mb: 2.5, transition: 'all 200ms ease',
          '&:hover': { borderColor: '#6366F1', background: 'rgba(99,102,241,0.03)' },
        }}>
          <input {...getInputProps()} />
          {file ? (
            <Box>
              <Box sx={{ width: 52, height: 52, borderRadius: '14px', background: 'rgba(16,185,129,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
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
              <Box sx={{ width: 52, height: 52, borderRadius: '14px', background: 'rgba(99,102,241,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
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

        {analyzing && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: '10px', fontSize: '0.825rem' }}>
            🤖 AI is analyzing your document…
            <Typography sx={{ fontSize: '0.75rem', mt: 0.25 }}>
              Detecting category, extracting text, finding dates…
            </Typography>
          </Alert>
        )}

        {detectedData && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: '10px', fontSize: '0.825rem' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.825rem', mb: 0.5 }}>
              ✅ AI Detection Results:
            </Typography>
            {detectedData.category      && <Typography sx={{ fontSize: '0.8rem' }}>📋 Category: <strong>{detectedData.category}</strong></Typography>}
            {detectedData.documentNumber && <Typography sx={{ fontSize: '0.8rem' }}>🔢 Document #: <strong>{detectedData.documentNumber}</strong></Typography>}
            {detectedData.issueDate     && <Typography sx={{ fontSize: '0.8rem' }}>📅 Issued: <strong>{detectedData.issueDate}</strong></Typography>}
            {detectedData.expiryDate    && <Typography sx={{ fontSize: '0.8rem' }}>⏰ Expires: <strong>{detectedData.expiryDate}</strong></Typography>}
            {detectedData.ocrText       && <Typography sx={{ fontSize: '0.8rem' }}>✓ Text extracted successfully</Typography>}
          </Alert>
        )}

        {uploading && (
          <Box sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748B', mb: 0.5 }}>
              {analyzing ? 'AI Processing…' : 'Uploading…'} {uploadProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress}
              sx={{ borderRadius: 99, height: 6,
                '& .MuiLinearProgress-bar': { borderRadius: 99, background: 'linear-gradient(90deg, #6366F1, #818CF8)' } }} />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleClose} disabled={uploading}
          sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleUpload} disabled={!file || uploading}
          startIcon={<AutoAwesome sx={{ fontSize: 15 }} />}
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
          }}>
          {uploading
            ? 'AI Processing…'
            : isDuplWarn ? 'Upload Anyway ⚠️' : 'Upload with AI ✨'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentUpload;