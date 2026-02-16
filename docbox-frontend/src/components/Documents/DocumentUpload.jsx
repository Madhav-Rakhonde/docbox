import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  IconButton,
  AlertTitle,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { 
  CloudUpload, 
  Close, 
  InsertDriveFile, 
  AutoAwesome,
  Warning 
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

const DocumentUpload = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [detectedData, setDetectedData] = useState(null);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [forceUpload, setForceUpload] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      console.log('✅ File selected:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
      });
      
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
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.data?.isDuplicate) {
        const existing = response.data.data.existingDocument;
        setDuplicateInfo(existing);
        setShowDuplicateWarning(true);
        
        toast.warning('⚠️ Duplicate file detected!', {
          autoClose: 5000
        });
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
    }
  };

  /**
   * ✅ FIXED: Proper upload with force parameter
   */
  const performActualUpload = async (shouldForce) => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);
      setAnalyzing(true);
      setUploadProgress(10);

      console.log('📤 Starting upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        force: shouldForce,
      });

      const formData = new FormData();
      formData.append('file', file, file.name);
      
      // ✅ Add force parameter if needed
      if (shouldForce) {
        formData.append('force', 'true');
        console.log('🔥 FORCE UPLOAD ENABLED');
      }

      setUploadProgress(30);

      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(Math.min(percentCompleted, 90));
        },
      });

      console.log('✅ Upload response:', response.data);

      setUploadProgress(100);
      setAnalyzing(false);

      if (response.data.success || response.status === 200) {
        const doc = response.data.data?.document || response.data.data || response.data;

        setDetectedData({
          category: doc.category?.name || 'Document uploaded',
          documentNumber: doc.documentNumber,
          issueDate: doc.issueDate,
          expiryDate: doc.expiryDate,
          ocrText: doc.ocrText ? 'Text extracted successfully' : null,
        });

        const message = shouldForce 
          ? `✨ Duplicate uploaded successfully! Category: ${doc.category?.name || 'Document'}`
          : `✨ Document uploaded! ${doc.category?.name ? `Category: ${doc.category.name}` : ''}`;
        
        toast.success(message, { autoClose: 5000 });

        setTimeout(() => {
          if (onSuccess) onSuccess();
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message || 
                          'Upload failed';
      
      if (errorMessage.includes('Duplicate') || errorMessage.includes('duplicate')) {
        toast.error(errorMessage, { autoClose: 8000 });
        setShowDuplicateWarning(true);
        setForceUpload(false);
      } else {
        toast.error(`Upload failed: ${errorMessage}`);
      }
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  /**
   * ✅ Handle upload button click
   */
  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    // ✅ If duplicate detected and user hasn't confirmed yet
    if (showDuplicateWarning && duplicateInfo && !forceUpload) {
      const confirmed = window.confirm(
        `⚠️ Duplicate File Detected!\n\n` +
        `You already uploaded "${duplicateInfo.filename}"\n` +
        `Category: ${duplicateInfo.category}\n` +
        `Date: ${new Date(duplicateInfo.uploadedDate).toLocaleDateString()}\n\n` +
        `Do you still want to upload this file again?`
      );
      
      if (!confirmed) {
        return; // User canceled
      }
      
      // ✅ User confirmed - set flag and upload with force=true
      setForceUpload(true);
      await performActualUpload(true); // Upload immediately with force
    } else {
      // ✅ No duplicate or already confirmed - normal upload
      await performActualUpload(forceUpload);
    }
  };

  const handleClose = () => {
    setFile(null);
    setDetectedData(null);
    setDuplicateInfo(null);
    setShowDuplicateWarning(false);
    setForceUpload(false);
    setUploadProgress(0);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Upload Document</Typography>
            <AutoAwesome color="primary" />
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>AI Magic! ✨</strong> Our system will automatically detect category, extract text, and find dates!
        </Alert>

        {/* ✅ Duplicate Warning */}
        {showDuplicateWarning && duplicateInfo && !forceUpload && (
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
            <AlertTitle>⚠️ Duplicate File Detected!</AlertTitle>
            <Typography variant="body2">
              You already uploaded <strong>"{duplicateInfo.filename}"</strong>
            </Typography>
            <Typography variant="body2">
              Category: <strong>{duplicateInfo.category}</strong>
            </Typography>
            <Typography variant="body2">
              Date: <strong>{new Date(duplicateInfo.uploadedDate).toLocaleDateString()}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, color: 'warning.dark' }}>
              Click "Upload Anyway" to keep both copies.
            </Typography>
          </Alert>
        )}

        {/* Dropzone */}
        <Box
          {...getRootProps()}
          sx={{
            border: 2,
            borderStyle: 'dashed',
            borderColor: isDragActive ? 'primary.main' : 'divider',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
            mb: 3,
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
          }}
        >
          <input {...getInputProps()} />
          <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          {file ? (
            <Box>
              <InsertDriveFile sx={{ fontSize: 40, color: 'success.main' }} />
              <Typography variant="body1" fontWeight="600">
                {file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="body1" gutterBottom>
                Drag & drop a file here, or click to select
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supported: PDF, Images, Word documents (Max 50MB)
              </Typography>
            </Box>
          )}
        </Box>

        {/* AI Analysis Progress */}
        {analyzing && (
          <Alert severity="info" sx={{ mb: 2 }}>
            🤖 AI is analyzing your document...
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              Detecting category, extracting text, finding dates...
            </Typography>
          </Alert>
        )}

        {/* AI Detected Data Display */}
        {detectedData && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              ✅ AI Detection Results:
            </Typography>
            {detectedData.category && (
              <Typography variant="body2">
                📋 Category: <strong>{detectedData.category}</strong>
              </Typography>
            )}
            {detectedData.documentNumber && (
              <Typography variant="body2">
                🔢 Document #: <strong>{detectedData.documentNumber}</strong>
              </Typography>
            )}
            {detectedData.issueDate && (
              <Typography variant="body2">
                📅 Issued: <strong>{detectedData.issueDate}</strong>
              </Typography>
            )}
            {detectedData.expiryDate && (
              <Typography variant="body2">
                ⏰ Expires: <strong>{detectedData.expiryDate}</strong>
              </Typography>
            )}
            {detectedData.ocrText && (
              <Typography variant="body2">
                ✓ Text extracted successfully
              </Typography>
            )}
          </Alert>
        )}

        {/* Upload Progress */}
        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {analyzing ? 'AI Processing...' : 'Uploading...'} {uploadProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 1 }} />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || uploading}
          startIcon={<AutoAwesome />}
          color={showDuplicateWarning && !forceUpload ? 'warning' : 'primary'}
        >
          {uploading 
            ? 'AI Processing...' 
            : (showDuplicateWarning && !forceUpload) 
              ? 'Upload Anyway ⚠️' 
              : 'Upload with AI ✨'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentUpload;
