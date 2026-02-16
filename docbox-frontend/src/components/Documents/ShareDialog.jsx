import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  IconButton,
  Alert,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Close, ContentCopy } from '@mui/icons-material';
import { toast } from 'react-toastify';
import shareService from '../../services/shareService';

const ShareDialog = ({ open, onClose, document, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [formData, setFormData] = useState({
    expiryHours: '72',
    password: '',
    maxViews: '',
    allowDownload: true,
  });

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: e.target.type === 'checkbox' ? checked : value,
    });
  };

  const handleCreateShare = async () => {
    if (!document?.id) return;

    try {
      setLoading(true);
      const response = await shareService.createShareLink(document.id, {
        expiryHours: parseInt(formData.expiryHours),
        password: formData.password || null,
        maxViews: formData.maxViews ? parseInt(formData.maxViews) : null,
        allowDownload: formData.allowDownload,
      });

      if (response.success) {
        setShareLink(response.data);
        toast.success('Share link created successfully!');
        if (onSuccess) onSuccess();
      } else {
        toast.error(response.message || 'Failed to create share link');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink?.shareUrl) {
      navigator.clipboard.writeText(shareLink.shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleClose = () => {
    setShareLink(null);
    setFormData({
      expiryHours: '72',
      password: '',
      maxViews: '',
      allowDownload: true,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Share Document</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {!shareLink ? (
          <>
            <Typography variant="body2" color="text.secondary" paragraph>
              Create a secure share link for: <strong>{document?.originalFilename}</strong>
            </Typography>

            <TextField
              select
              fullWidth
              label="Link Expiry"
              name="expiryHours"
              value={formData.expiryHours}
              onChange={handleChange}
              margin="normal"
            >
              <MenuItem value="24">24 Hours</MenuItem>
              <MenuItem value="72">3 Days</MenuItem>
              <MenuItem value="168">1 Week</MenuItem>
              <MenuItem value="720">30 Days</MenuItem>
            </TextField>

            <TextField
              fullWidth
              label="Password (Optional)"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              helperText="Leave empty for no password protection"
            />

            <TextField
              fullWidth
              label="Max Views (Optional)"
              name="maxViews"
              type="number"
              value={formData.maxViews}
              onChange={handleChange}
              margin="normal"
              helperText="Leave empty for unlimited views"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.allowDownload}
                  onChange={handleChange}
                  name="allowDownload"
                />
              }
              label="Allow download"
              sx={{ mt: 2 }}
            />
          </>
        ) : (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              Share link created successfully!
            </Alert>

            <TextField
              fullWidth
              label="Share Link"
              value={shareLink.shareUrl}
              margin="normal"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleCopyLink}>
                      <ContentCopy />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" display="block" gutterBottom>
                <strong>Link Token:</strong> {shareLink.linkToken}
              </Typography>
              <Typography variant="caption" display="block" gutterBottom>
                <strong>Expires:</strong> {new Date(shareLink.expiresAt).toLocaleString()}
              </Typography>
              {formData.maxViews && (
                <Typography variant="caption" display="block">
                  <strong>Max Views:</strong> {formData.maxViews}
                </Typography>
              )}
              <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                Share this link with others to give them access to the document.
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose}>
          {shareLink ? 'Close' : 'Cancel'}
        </Button>
        {!shareLink && (
          <Button
            variant="contained"
            onClick={handleCreateShare}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Share Link'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog;