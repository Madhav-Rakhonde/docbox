import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, FormControlLabel, Switch,
  Box, Typography, IconButton, Alert, InputAdornment, CircularProgress,
} from '@mui/material';
import { Close, ContentCopy, Share, Link as LinkIcon, Lock } from '@mui/icons-material';
import { toast } from 'react-toastify';
import shareService from '../../services/shareService';

const InfoRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', gap: 1, py: 0.75 }}>
    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8',
      textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 80, pt: 0.1 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: '0.825rem', color: '#0F172A' }}>{value}</Typography>
  </Box>
);

const ShareDialog = ({ open, onClose, document, onSuccess }) => {
  const [loading, setLoading]   = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [formData, setFormData] = useState({
    expiryHours: '72', password: '', maxViews: '', allowDownload: true,
  });

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({ ...formData, [name]: e.target.type === 'checkbox' ? checked : value });
  };

  const handleCreateShare = async () => {
    if (!document?.id) return;
    try {
      setLoading(true);
      const response = await shareService.createShareLink(document.id, {
        expiryHours: parseInt(formData.expiryHours),
        password:    formData.password || null,
        maxViews:    formData.maxViews ? parseInt(formData.maxViews) : null,
        allowDownload: formData.allowDownload,
      });
      if (response.success) {
        setShareLink(response.data);
        toast.success('Share link created!');
        if (onSuccess) onSuccess();
      } else { toast.error(response.message || 'Failed to create share link'); }
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to create share link'); }
    finally { setLoading(false); }
  };

  const handleCopyLink = () => {
    if (shareLink?.shareUrl) { navigator.clipboard.writeText(shareLink.shareUrl); toast.success('Link copied!'); }
  };

  const handleClose = () => {
    setShareLink(null);
    setFormData({ expiryHours: '72', password: '', maxViews: '', allowDownload: true });
    onClose();
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '10px',
      '& fieldset': { borderColor: '#E2E8F0' },
      '&:hover fieldset': { borderColor: '#6366F1' },
      '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: '1.5px' } },
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}>

      <DialogTitle sx={{ pt: 3, px: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: '9px', background: 'rgba(16,185,129,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Share sx={{ fontSize: 16, color: '#10B981' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
              Share Document
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small"
            sx={{ color: '#94A3B8', '&:hover': { background: '#F1F5F9' } }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 1 }}>
        {!shareLink ? (
          <>
            <Box sx={{ mb: 2.5, p: 1.5, borderRadius: '10px', background: '#F8F9FC', border: '1px solid #E2E8F0' }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8',
                textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>
                Document
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>
                {document?.originalFilename}
              </Typography>
            </Box>

            <TextField select fullWidth label="Link Expiry" name="expiryHours"
              value={formData.expiryHours} onChange={handleChange} margin="dense" sx={fieldSx}>
              <MenuItem value="24">24 Hours</MenuItem>
              <MenuItem value="72">3 Days</MenuItem>
              <MenuItem value="168">1 Week</MenuItem>
              <MenuItem value="720">30 Days</MenuItem>
            </TextField>

            <TextField fullWidth label="Password (Optional)" name="password" type="password"
              value={formData.password} onChange={handleChange} margin="dense"
              helperText="Leave empty for no password protection" sx={fieldSx} />

            <TextField fullWidth label="Max Views (Optional)" name="maxViews" type="number"
              value={formData.maxViews} onChange={handleChange} margin="dense"
              helperText="Leave empty for unlimited views" sx={fieldSx} />

            <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '10px', border: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>Allow Download</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>Recipients can download the document</Typography>
              </Box>
              <Switch checked={formData.allowDownload} onChange={handleChange} name="allowDownload"
                sx={{ '& .Mui-checked .MuiSwitch-thumb': { background: '#6366F1' },
                  '& .Mui-checked + .MuiSwitch-track': { background: '#6366F1' } }} />
            </Box>
          </>
        ) : (
          <>
            <Alert severity="success" sx={{ mb: 2.5, borderRadius: '10px' }}>
              Share link created successfully!
            </Alert>

            <TextField fullWidth label="Share Link" value={shareLink.shareUrl} margin="dense"
              sx={{ ...fieldSx, mb: 2 }}
              InputProps={{
                readOnly: true,
                startAdornment: <InputAdornment position="start"><LinkIcon sx={{ fontSize: 16, color: '#6366F1' }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleCopyLink} size="small"
                      sx={{ color: '#6366F1', '&:hover': { background: 'rgba(99,102,241,0.08)' } }}>
                      <ContentCopy sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }} />

            <Box sx={{ p: 2, borderRadius: '12px', background: '#F8F9FC', border: '1px solid #E2E8F0' }}>
              <InfoRow label="Expires" value={new Date(shareLink.expiresAt).toLocaleString()} />
              {formData.maxViews && <InfoRow label="Max Views" value={formData.maxViews} />}
              <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8', mt: 1 }}>
                Share this link to give others access to the document.
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleClose}
          sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>
          {shareLink ? 'Close' : 'Cancel'}
        </Button>
        {!shareLink && (
          <Button variant="contained" onClick={handleCreateShare} disabled={loading}
            sx={{ borderRadius: '8px', fontWeight: 600,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              '&:hover': { background: 'linear-gradient(135deg, #059669, #047857)' } }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Share Link'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog;