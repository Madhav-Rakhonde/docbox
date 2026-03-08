import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Grid, Card, CardContent,
  Avatar, Chip, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, Alert,
  Tabs, Tab, Paper, Divider, Badge,
} from '@mui/material';
import {
  People, Description, Visibility, Download,
  FolderOpen, CalendarToday, Person, FilePresent,
  Warning, Close, ArrowBack,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

// ─── Helpers ────────────────────────────────────────────────────────────────
const isExpiring = (d) => {
  if (!d) return false;
  const days = Math.ceil((new Date(d) - new Date()) / 86400000);
  return days <= 30 && days > 0;
};
const isExpired = (d) => d && new Date(d) < new Date();

const StatMini = ({ value, label, color }) => (
  <Box sx={{ textAlign: 'center', px: 2 }}>
    <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</Typography>
    <Typography sx={{ fontSize: '0.75rem', color: '#64748B', mt: 0.25 }}>{label}</Typography>
  </Box>
);

// ─── Member Card ─────────────────────────────────────────────────────────────
const MemberSelectCard = ({ member, onSelect }) => (
  <Card elevation={0} onClick={() => member.hasLoginAccess && onSelect(member)} sx={{
    borderRadius: '14px', border: '1px solid #E2E8F0',
    cursor: member.hasLoginAccess ? 'pointer' : 'default',
    opacity: member.hasLoginAccess ? 1 : 0.6,
    transition: 'transform 200ms ease, box-shadow 200ms ease',
    '&:hover': member.hasLoginAccess
      ? { transform: 'translateY(-3px)', boxShadow: '0 10px 28px rgba(15,23,42,0.1)', borderColor: '#6366F1' }
      : {},
  }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Avatar sx={{
          width: 48, height: 48, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366F1, #818CF8)',
          fontWeight: 700, fontSize: '1.1rem',
        }}>
          {member.name?.charAt(0).toUpperCase() || <Person />}
        </Avatar>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>{member.name}</Typography>
          <Box sx={{ display: 'inline-flex', mt: 0.25, px: 1, py: 0.2, borderRadius: '4px', background: 'rgba(99,102,241,0.1)' }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#6366F1' }}>
              {member.relationship || 'Family Member'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {member.email && (
        <Typography sx={{ fontSize: '0.78rem', color: '#64748B', mb: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {member.email}
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {member.hasLoginAccess
          ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <FilePresent sx={{ fontSize: 14, color: '#10B981' }} />
              <Typography sx={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 600 }}>
                {member.documentCount || 0} documents
              </Typography>
            </Box>
          : <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>Profile only</Typography>
        }
        {member.hasLoginAccess && (
          <FolderOpen sx={{ fontSize: 16, color: '#6366F1' }} />
        )}
      </Box>
    </CardContent>
  </Card>
);

// ─── Document Card ────────────────────────────────────────────────────────────
const DocCard = ({ document, onView, onDownload }) => {
  const expired  = isExpired(document.expiryDate);
  const expiring = isExpiring(document.expiryDate);
  const borderColor = expired ? '#EF4444' : expiring ? '#F59E0B' : 'transparent';

  return (
    <Card elevation={0} sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      borderRadius: '14px',
      border: `1.5px solid ${(expired || expiring) ? borderColor : '#E2E8F0'}`,
      transition: 'transform 200ms ease, box-shadow 200ms ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
    }}>
      <CardContent sx={{ flex: 1, p: 2.5 }}>
        {/* Status badge */}
        {(expired || expiring) && (
          <Box sx={{
            display: 'inline-flex', px: 1, py: 0.2, borderRadius: '4px', mb: 1.5,
            background: expired ? '#FEF2F2' : '#FFFBEB',
            border: `1px solid ${expired ? '#FECACA' : '#FDE68A'}`,
          }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em',
              color: expired ? '#EF4444' : '#F59E0B', textTransform: 'uppercase' }}>
              {expired ? 'Expired' : 'Expiring Soon'}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(99,102,241,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Description sx={{ fontSize: 18, color: '#6366F1' }} />
          </Box>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {document.originalFilename}
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
              {document.category?.name || 'Uncategorized'}
            </Typography>
          </Box>
        </Box>

        {document.expiryDate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CalendarToday sx={{ fontSize: 12, color: expired ? '#EF4444' : '#94A3B8' }} />
            <Typography sx={{ fontSize: '0.75rem', color: expired ? '#EF4444' : '#64748B' }}>
              Expires {new Date(document.expiryDate).toLocaleDateString()}
            </Typography>
          </Box>
        )}

        <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', mt: 0.5 }}>
          Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
        </Typography>
      </CardContent>

      <Box sx={{ px: 2.5, pb: 2.5, pt: 0, display: 'flex', gap: 1 }}>
        <Button size="small" variant="outlined" startIcon={<Visibility sx={{ fontSize: 14 }} />}
          onClick={() => onView(document)} fullWidth
          sx={{ borderRadius: '8px', fontSize: '0.78rem', borderColor: '#E2E8F0', color: '#475569',
            '&:hover': { borderColor: '#6366F1', color: '#6366F1', background: 'rgba(99,102,241,0.05)' } }}>
          View
        </Button>
        <Button size="small" variant="contained" startIcon={<Download sx={{ fontSize: 14 }} />}
          onClick={() => onDownload(document.id, document.originalFilename)} fullWidth
          sx={{ borderRadius: '8px', fontSize: '0.78rem',
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' } }}>
          Save
        </Button>
      </Box>
    </Card>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const FamilyDocumentsViewer = () => {
  const [familyMembers, setFamilyMembers]       = useState([]);
  const [selectedMember, setSelectedMember]     = useState(null);
  const [documents, setDocuments]               = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [previewOpen, setPreviewOpen]           = useState(false);
  const [tabValue, setTabValue]                 = useState(0);

  useEffect(() => { loadFamilyMembers(); }, []);
  useEffect(() => { if (selectedMember) loadMemberDocuments(selectedMember.id); }, [selectedMember]);

  const loadFamilyMembers = async () => {
    try {
      setLoading(true);
      const r = await api.get('/family/members');
      if (r.data.success) setFamilyMembers(r.data.data || []);
    } catch { toast.error('Failed to load family members'); }
    finally { setLoading(false); }
  };

  const loadMemberDocuments = async (memberId) => {
    try {
      setDocumentsLoading(true);
      const r = await api.get(`/family/members/${memberId}/documents`);
      if (r.data.success) setDocuments(r.data.data || []);
    } catch { toast.error('Failed to load member documents'); setDocuments([]); }
    finally { setDocumentsLoading(false); }
  };

  const handleMemberSelect    = (m) => { setSelectedMember(m); setDocuments([]); setTabValue(0); };
  const handleDocumentView    = (d) => { setSelectedDocument(d); setPreviewOpen(true); };

  const handleDocumentDownload = async (documentId, filename) => {
    try {
      const r = await api.get(`/documents/${documentId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a   = document.createElement('a');
      a.href = url; a.setAttribute('download', filename);
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('Downloaded!');
    } catch { toast.error('Download failed'); }
  };

  const stats = {
    total:    documents.length,
    expiring: documents.filter((d) => isExpiring(d.expiryDate)).length,
    expired:  documents.filter((d) => isExpired(d.expiryDate)).length,
  };

  const filtered = documents.filter((d) => {
    if (tabValue === 1) return isExpiring(d.expiryDate);
    if (tabValue === 2) return isExpired(d.expiryDate);
    return true;
  });

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress sx={{ color: '#6366F1' }} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {selectedMember && (
          <IconButton onClick={() => setSelectedMember(null)} size="small"
            sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', '&:hover': { background: '#F1F5F9' } }}>
            <ArrowBack sx={{ fontSize: 18 }} />
          </IconButton>
        )}
        <Box>
          <Typography sx={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: { xs: '1.75rem', sm: '2.25rem' },
            fontWeight: 400, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.25,
          }}>
            {selectedMember ? selectedMember.name : 'Family Documents'}
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
            {selectedMember
              ? `${selectedMember.relationship || 'Family Member'} · ${stats.total} document${stats.total !== 1 ? 's' : ''}`
              : 'View and manage documents for your family members'}
          </Typography>
        </Box>
      </Box>

      {/* Member Selection */}
      {!selectedMember && (
        familyMembers.length === 0 ? (
          <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: '#F1F5F9', mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <People sx={{ fontSize: 28, color: '#94A3B8' }} />
              </Box>
              <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>No Family Members</Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8', mb: 3 }}>You haven't added any family members yet</Typography>
              <Button variant="contained" href="/family"
                sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
                Add Family Member
              </Button>
            </Box>
          </Paper>
        ) : (
          <Grid container spacing={2.5}>
            {familyMembers.map((m) => (
              <Grid item xs={12} sm={6} md={4} key={m.id}>
                <MemberSelectCard member={m} onSelect={handleMemberSelect} />
              </Grid>
            ))}
          </Grid>
        )
      )}

      {/* Member's Documents */}
      {selectedMember && (
        <>
          {/* Stats row */}
          <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
            <StatMini value={stats.total}    label="Total"          color="#6366F1" />
            <Divider orientation="vertical" flexItem />
            <StatMini value={stats.expiring} label="Expiring Soon"  color="#F59E0B" />
            <Divider orientation="vertical" flexItem />
            <StatMini value={stats.expired}  label="Expired"        color="#EF4444" />
          </Paper>

          {/* Tabs */}
          <Paper elevation={0} sx={{ mb: 2.5, borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}
              sx={{
                px: 1,
                '& .MuiTabs-indicator': { background: '#6366F1', borderRadius: 2, height: 2.5 },
                '& .MuiTab-root': { fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', minHeight: 44,
                  color: '#64748B', '&.Mui-selected': { color: '#6366F1' } },
              }}>
              <Tab label={`All (${stats.total})`} />
              <Tab label={<Badge badgeContent={stats.expiring || null} color="warning">
                <Box sx={{ pr: stats.expiring ? 1.5 : 0 }}>Expiring</Box></Badge>} />
              <Tab label={<Badge badgeContent={stats.expired || null} color="error">
                <Box sx={{ pr: stats.expired ? 1.5 : 0 }}>Expired</Box></Badge>} />
            </Tabs>
          </Paper>

          {documentsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#6366F1' }} />
            </Box>
          ) : filtered.length === 0 ? (
            <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Description sx={{ fontSize: 40, color: '#CBD5E1', mb: 1.5 }} />
                <Typography sx={{ fontWeight: 600, color: '#0F172A', mb: 0.25 }}>No Documents</Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>
                  {tabValue === 0 ? 'This member has no documents yet'
                   : tabValue === 1 ? 'No documents expiring soon'
                   : 'No expired documents'}
                </Typography>
              </Box>
            </Paper>
          ) : (
            <Grid container spacing={2.5}>
              {filtered.map((doc) => (
                <Grid item xs={12} sm={6} md={4} key={doc.id}>
                  <DocCard document={doc} onView={handleDocumentView} onDownload={handleDocumentDownload} />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}>
        {selectedDocument && (
          <>
            <DialogTitle sx={{ px: 3, pt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', pr: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedDocument.originalFilename}
              </Typography>
              <IconButton onClick={() => setPreviewOpen(false)} size="small"
                sx={{ flexShrink: 0, '&:hover': { background: '#F1F5F9' } }}>
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ px: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                {[
                  { label: 'Category',  value: selectedDocument.category?.name || 'N/A' },
                  { label: 'Uploaded',  value: new Date(selectedDocument.uploadedAt).toLocaleString() },
                  selectedDocument.expiryDate && { label: 'Expires', value: new Date(selectedDocument.expiryDate).toLocaleDateString() },
                ].filter(Boolean).map((row) => (
                  <Box key={row.label} sx={{ display: 'flex', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', minWidth: 72 }}>{row.label}</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#0F172A' }}>{row.value}</Typography>
                  </Box>
                ))}
              </Box>
              <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.85rem' }}>
                Document preview is not available. Please download to view the full file.
              </Alert>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
              <Button onClick={() => setPreviewOpen(false)}
                sx={{ borderRadius: '8px', color: '#64748B' }}>Close</Button>
              <Button variant="contained" startIcon={<Download sx={{ fontSize: 15 }} />}
                onClick={() => handleDocumentDownload(selectedDocument.id, selectedDocument.originalFilename)}
                sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
                Download
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default FamilyDocumentsViewer;