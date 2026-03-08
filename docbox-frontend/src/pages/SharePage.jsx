import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, CircularProgress, Alert } from '@mui/material';
import { Lock, Download, InsertDriveFile, Warning, Folder } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

// ─── Dark full-page shell ──────────────────────────────────────────────────
const PageShell = ({ children }) => (
  <Box sx={{
    minHeight: '100vh', width: '100%', position: 'relative',
    background: '#0F172A',
    backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(129,140,248,0.1) 0%, transparent 50%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    px: 2, py: 6,
  }}>
    {/* Logo */}
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0,
      px: { xs: 2, sm: 4 }, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="8" width="18" height="22" rx="3" fill="#6366F1" opacity="0.3"/>
        <rect x="7" y="5" width="18" height="22" rx="3" fill="#6366F1" opacity="0.6"/>
        <rect x="10" y="2" width="18" height="22" rx="3" fill="#6366F1"/>
        <rect x="14" y="8" width="9" height="1.8" rx="0.9" fill="white" opacity="0.9"/>
        <rect x="14" y="12" width="7" height="1.8" rx="0.9" fill="white" opacity="0.6"/>
        <rect x="14" y="16" width="8" height="1.8" rx="0.9" fill="white" opacity="0.6"/>
      </svg>
      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#F8FAFC', letterSpacing: '-0.02em' }}>
        Doc<span style={{ color: '#818CF8', fontWeight: 400 }}>Box</span>
      </Typography>
    </Box>
    {children}
  </Box>
);

// ─── Floating white card ──────────────────────────────────────────────────
const FloatCard = ({ children, maxWidth = 480, accent = '#6366F1' }) => (
  <Box sx={{ width: '100%', maxWidth, background: 'white',
    borderRadius: { xs: '16px', sm: '20px' }, overflow: 'hidden',
    boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
    <Box sx={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />
    <Box sx={{ p: { xs: 3, sm: 4 } }}>{children}</Box>
  </Box>
);

const MetaPill = ({ children, bg = '#F1F5F9', color = '#475569' }) => (
  <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.3, borderRadius: '6px', background: bg }}>
    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color }}>{children}</Typography>
  </Box>
);

const InfoRow = ({ label, value }) => value ? (
  <Box sx={{ display: 'flex', gap: 2, py: 0.65 }}>
    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8',
      textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 72, pt: 0.1 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: '0.825rem', color: '#0F172A' }}>{value}</Typography>
  </Box>
) : null;

// ─── Main ─────────────────────────────────────────────────────────────────
const SharePage = () => {
  const { token } = useParams();
  const [loading, setLoading]               = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword]             = useState('');
  const [document, setDocument]             = useState(null);
  const [error, setError]                   = useState(null);
  const [downloading, setDownloading]       = useState(false);

  useEffect(() => { if (token) checkShareLink(); }, [token]);

  const checkShareLink = async () => {
    try {
      setLoading(true); setError(null);
      const response = await api.get(`/share/${token}`, { params: password ? { password } : {} });
      if (response.data?.success) {
        const d = response.data.data;
        setDocument({ id: d.documentId, originalFilename: d.originalFilename,
          fileSize: d.fileSize, fileType: d.fileType,
          category: { name: d.category }, createdAt: d.uploadedAt });
        setRequiresPassword(false);
      }
    } catch (err) {
      if      (err.response?.status === 401) { setRequiresPassword(true); setError('This document is password protected'); }
      else if (err.response?.status === 410) setError('This share link has expired');
      else if (err.response?.status === 404) setError('Share link not found');
      else setError(err.response?.data?.message || 'Failed to access shared document');
    } finally { setLoading(false); }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password) { toast.error('Please enter the password'); return; }
    checkShareLink();
  };

  const handleDownload = async () => {
    if (!document) { toast.error('Document not available'); return; }
    try {
      setDownloading(true);
      const response = await api.get(`/share/${token}/download`, {
        responseType: 'blob', params: password ? { password } : {},
      });
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href  = url;
      link.setAttribute('download', document.originalFilename || 'document');
      window.document.body.appendChild(link);
      link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started!');
    } catch { toast.error('Failed to download document'); }
    finally { setDownloading(false); }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': { borderRadius: '10px',
      '& fieldset': { borderColor: '#E2E8F0' },
      '&:hover fieldset': { borderColor: '#6366F1' },
      '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: '1.5px' } },
  };

  /* ── LOADING ── */
  if (loading) return (
    <PageShell>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress sx={{ color: '#6366F1', mb: 2 }} size={44} />
        <Typography sx={{ color: '#64748B', fontSize: '0.875rem' }}>Loading shared document…</Typography>
      </Box>
    </PageShell>
  );

  /* ── ERROR ── */
  if (error && !requiresPassword) return (
    <PageShell>
      <FloatCard accent="#EF4444">
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <Box sx={{ width: 60, height: 60, borderRadius: '50%', background: '#FEF2F2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <Warning sx={{ fontSize: 26, color: '#EF4444' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', mb: 0.75 }}>
            Unable to Access
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.65 }}>{error}</Typography>
          <Button href="/" variant="outlined"
            sx={{ mt: 3, borderRadius: '10px', borderColor: '#E2E8F0', color: '#475569',
              '&:hover': { borderColor: '#6366F1', color: '#6366F1' } }}>
            Go to Home
          </Button>
        </Box>
      </FloatCard>
    </PageShell>
  );

  /* ── PASSWORD ── */
  if (requiresPassword && !document) return (
    <PageShell>
      <FloatCard accent="#6366F1">
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(99,102,241,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <Lock sx={{ fontSize: 26, color: '#6366F1' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', mb: 0.5 }}>
            Password Protected
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#64748B' }}>
            This document requires a password to access
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>{error}</Alert>}

        <Box component="form" onSubmit={handlePasswordSubmit}>
          <TextField fullWidth type="password" label="Enter Password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            autoFocus sx={{ ...inputSx, mb: 2 }} />
          <Button fullWidth type="submit" variant="contained"
            sx={{ borderRadius: '10px', py: 1.25, fontWeight: 700,
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' } }}>
            Access Document
          </Button>
        </Box>
      </FloatCard>
    </PageShell>
  );

  /* ── DOCUMENT ── */
  if (document) return (
    <PageShell>
      <FloatCard maxWidth={540} accent="#6366F1">
        {/* File header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: '14px', flexShrink: 0,
            background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <InsertDriveFile sx={{ fontSize: 26, color: '#6366F1' }} />
          </Box>
          <Box sx={{ overflow: 'hidden', flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.75 }}
              title={document.originalFilename}>
              {document.originalFilename}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
              {document.category?.name && (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <Folder sx={{ fontSize: 11, color: '#94A3B8' }} />
                  <Typography sx={{ fontSize: '0.72rem', color: '#64748B' }}>{document.category.name}</Typography>
                </Box>
              )}
              {document.fileType && <MetaPill bg="rgba(99,102,241,0.08)" color="#6366F1">{document.fileType.toUpperCase()}</MetaPill>}
              <MetaPill>{formatFileSize(document.fileSize)}</MetaPill>
            </Box>
          </Box>
        </Box>

        {/* Info box */}
        <Box sx={{ p: 2, borderRadius: '12px', background: '#F8F9FC', border: '1px solid #E2E8F0', mb: 3 }}>
          <InfoRow label="Type"     value={document.fileType?.toUpperCase()} />
          <InfoRow label="Size"     value={formatFileSize(document.fileSize)} />
          <InfoRow label="Category" value={document.category?.name} />
        </Box>

        {/* Download */}
        <Button fullWidth variant="contained" size="large" onClick={handleDownload}
          disabled={downloading}
          startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <Download />}
          sx={{ borderRadius: '12px', py: 1.5, fontWeight: 700, fontSize: '0.95rem',
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
              boxShadow: '0 6px 20px rgba(99,102,241,0.45)' },
            '&.Mui-disabled': { background: '#E2E8F0' } }}>
          {downloading ? 'Downloading…' : 'Download Document'}
        </Button>

        <Typography sx={{ mt: 2.5, textAlign: 'center', fontSize: '0.72rem', color: '#94A3B8' }}>
          Shared securely via DocBox
        </Typography>
      </FloatCard>
    </PageShell>
  );

  return null;
};

export default SharePage;