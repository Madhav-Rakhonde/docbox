import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Button,
  CircularProgress, Divider,
} from '@mui/material';
import { Download, InsertDriveFile, Warning, Folder } from '@mui/icons-material';
import { toast } from 'react-toastify';
import shareService from '../services/shareService';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// ─── Dark outer wrapper ────────────────────────────────────────────────────
const PageShell = ({ children }) => (
  <Box sx={{
    minHeight: '100vh',
    background: '#0F172A',
    backgroundImage: `
      radial-gradient(ellipse 60% 40% at 20% 20%, rgba(99,102,241,0.18) 0%, transparent 60%),
      radial-gradient(ellipse 50% 35% at 80% 80%, rgba(16,185,129,0.1) 0%, transparent 55%)
    `,
    display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6, px: 2,
  }}>
    {children}
  </Box>
);

// ─── Doc Info Row ─────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', gap: 1.5, py: 1.25, borderBottom: '1px solid #F1F5F9' }}>
    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', minWidth: 72, textTransform: 'uppercase', letterSpacing: '0.05em', pt: 0.1 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: '0.875rem', color: '#0F172A' }}>{value}</Typography>
  </Box>
);

// ─── Main ──────────────────────────────────────────────────────────────────
const ShareViewPage = () => {
  const { token }   = useParams();
  const navigate    = useNavigate();

  const [document, setDocument]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
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
    if (token) fetchSharedDoc();
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

  // ── Loading ──
  if (loading) {
    return (
      <PageShell>
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <CircularProgress sx={{ color: '#6366F1', mb: 2 }} size={48} />
          <Typography sx={{ color: '#94A3B8', fontSize: '0.9rem' }}>
            Loading document…
          </Typography>
        </Box>
      </PageShell>
    );
  }

  // ── Error ──
  if (error || !document) {
    return (
      <PageShell>
        <Box sx={{
          background: 'white', borderRadius: '20px', p: 5,
          textAlign: 'center', maxWidth: 380, width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: '20px',
            background: '#FEF2F2', mx: 'auto', mb: 2.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Warning sx={{ fontSize: 32, color: '#EF4444' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#0F172A', mb: 0.75 }}>
            Document Not Available
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#64748B', mb: 3, lineHeight: 1.6 }}>
            {error || 'Document not found or link expired.'}
          </Typography>
          <Button onClick={() => navigate('/')} variant="contained" fullWidth
            sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontWeight: 600 }}>
            Go to Home
          </Button>
        </Box>
      </PageShell>
    );
  }

  // ── Document View ──
  return (
    <PageShell>
      <Box sx={{ width: '100%', maxWidth: 560 }}>
        {/* Branding */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography sx={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, letterSpacing: '0.05em' }}>
            <Box component="span" sx={{ color: '#6366F1' }}>Doc</Box>
            <Box component="span" sx={{ color: '#818CF8' }}>Box</Box>
            {' '}· Secure Document Sharing
          </Typography>
        </Box>

        <Box sx={{
          background: 'white', borderRadius: '20px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          {/* Header strip */}
          <Box sx={{ height: 4, background: 'linear-gradient(90deg, #6366F1, #818CF8, #10B981)' }} />

          <Box sx={{ p: { xs: 3, sm: 4 } }}>
            {/* File header */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 3 }}>
              <Box sx={{
                width: 52, height: 52, borderRadius: '14px',
                background: 'rgba(99,102,241,0.1)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <InsertDriveFile sx={{ fontSize: 26, color: '#6366F1' }} />
              </Box>
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Typography sx={{
                  fontWeight: 700, fontSize: '1rem', color: '#0F172A',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {document.originalFilename}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                  {document.category && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.2, borderRadius: '4px', background: '#F1F5F9' }}>
                      <Folder sx={{ fontSize: 11, color: '#64748B' }} />
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>{document.category}</Typography>
                    </Box>
                  )}
                  {document.fileType && (
                    <Box sx={{ px: 1, py: 0.2, borderRadius: '4px', background: 'rgba(99,102,241,0.08)' }}>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#6366F1', textTransform: 'uppercase' }}>{document.fileType}</Typography>
                    </Box>
                  )}
                  <Box sx={{ px: 1, py: 0.2, borderRadius: '4px', background: '#F1F5F9' }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748B' }}>{formatFileSize(document.fileSize)}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            {/* Info */}
            <Box sx={{ mb: 3 }}>
              <InfoRow label="Type"     value={document.fileType?.toUpperCase() || 'Unknown'} />
              <InfoRow label="Size"     value={formatFileSize(document.fileSize)} />
              {document.category && <InfoRow label="Category" value={document.category} />}
            </Box>

            {/* Download */}
            <Button
              fullWidth variant="contained" size="large"
              onClick={handleDownload} disabled={downloading}
              startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <Download sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: '12px', py: 1.5, fontWeight: 700, fontSize: '0.95rem',
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)', transform: 'translateY(-1px)', boxShadow: '0 6px 18px rgba(99,102,241,0.4)' },
                transition: 'all 200ms ease',
              }}
            >
              {downloading ? 'Downloading…' : 'Download Document'}
            </Button>

            <Typography sx={{ textAlign: 'center', fontSize: '0.75rem', color: '#94A3B8', mt: 2 }}>
              Shared securely via DocBox
            </Typography>
          </Box>
        </Box>
      </Box>
    </PageShell>
  );
};

export default ShareViewPage;