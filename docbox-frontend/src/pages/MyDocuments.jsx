import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Grid, Card, CardContent,
  CardActions, IconButton, Chip, CircularProgress,
  TextField, InputAdornment, MenuItem, Select,
  FormControl, InputLabel, Tooltip, Paper,
} from '@mui/material';
import {
  Visibility, Download, Share, Search,
  Description, Lock, Category, Person,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import DocumentViewer from '../components/Documents/DocumentViewer';

// ─── Permission Level Config ───────────────────────────────────────────────
const PERM_CONFIG = {
  VIEW:                  { label: 'View Only',         color: '#64748B', bg: '#F8FAFC' },
  VIEW_DOWNLOAD:         { label: 'View & Download',   color: '#3B82F6', bg: '#EFF6FF' },
  VIEW_DOWNLOAD_SHARE:   { label: 'Can Share',         color: '#6366F1', bg: '#EEF2FF' },
  FULL_ACCESS:           { label: 'Full Access',       color: '#10B981', bg: '#ECFDF5' },
};

const getPermConfig = (level) => PERM_CONFIG[level] || { label: level, color: '#64748B', bg: '#F8FAFC' };

// ─── Stat Card ─────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => (
  <Paper elevation={0} sx={{
    p: 2.5, borderRadius: '14px',
    border: '1px solid #E2E8F0',
    display: 'flex', alignItems: 'center', gap: 2,
    transition: 'transform 200ms ease, box-shadow 200ms ease',
    '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(15,23,42,0.07)' },
  }}>
    <Box sx={{
      width: 44, height: 44, borderRadius: '12px',
      background: `${color}15`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon sx={{ fontSize: 20, color }} />
    </Box>
    <Box>
      <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.78rem', color: '#64748B', mt: 0.25 }}>{label}</Typography>
    </Box>
  </Paper>
);

// ─── Document Card ─────────────────────────────────────────────────────────
const DocCard = ({ doc, onView, onDownload }) => {
  const perm = getPermConfig(doc.permissionLevel);

  return (
    <Card elevation={0} sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      borderRadius: '14px', border: '1px solid #E2E8F0',
      transition: 'transform 200ms ease, box-shadow 200ms ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
    }}>
      <CardContent sx={{ flex: 1, p: 2.5 }}>
        {/* File Icon + Name */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '10px', flexShrink: 0,
            background: 'rgba(99,102,241,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Description sx={{ fontSize: 20, color: '#6366F1' }} />
          </Box>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography sx={{
              fontWeight: 600, fontSize: '0.875rem', color: '#0F172A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} title={doc.originalFilename}>
              {doc.originalFilename}
            </Typography>
            <Box sx={{
              mt: 0.5, display: 'inline-flex', alignItems: 'center',
              px: 1, py: 0.25, borderRadius: '4px',
              background: perm.bg, border: `1px solid ${perm.color}30`,
            }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: perm.color }}>
                {perm.label}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Metadata */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {doc.categoryName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Category sx={{ fontSize: 14, color: '#94A3B8' }} />
              <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                {doc.categoryIcon} {doc.categoryName}
              </Typography>
            </Box>
          )}
          {doc.ownerName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person sx={{ fontSize: 14, color: '#94A3B8' }} />
              <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                Shared by {doc.ownerName}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Capability chips */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 2 }}>
          {doc.canView && (
            <Box sx={{ px: 1, py: 0.25, borderRadius: '4px', background: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Visibility sx={{ fontSize: 11, color: '#64748B' }} />
              <Typography sx={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500 }}>View</Typography>
            </Box>
          )}
          {doc.canDownload && (
            <Box sx={{ px: 1, py: 0.25, borderRadius: '4px', background: '#ECFDF5', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Download sx={{ fontSize: 11, color: '#10B981' }} />
              <Typography sx={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 500 }}>Download</Typography>
            </Box>
          )}
          {doc.canShare && (
            <Box sx={{ px: 1, py: 0.25, borderRadius: '4px', background: '#EEF2FF', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Share sx={{ fontSize: 11, color: '#6366F1' }} />
              <Typography sx={{ fontSize: '0.7rem', color: '#6366F1', fontWeight: 500 }}>Share</Typography>
            </Box>
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ px: 2.5, pb: 2, pt: 0, gap: 0.75 }}>
        <Tooltip title={doc.canView ? 'View' : 'No permission'}>
          <span>
            <IconButton
              size="small"
              onClick={() => onView(doc)}
              disabled={!doc.canView}
              sx={{
                width: 34, height: 34, borderRadius: '8px',
                border: '1px solid #E2E8F0',
                color: doc.canView ? '#6366F1' : '#CBD5E1',
                '&:hover': { background: 'rgba(99,102,241,0.08)', borderColor: '#6366F1' },
                '&:disabled': { opacity: 0.4 },
              }}
            >
              <Visibility sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={doc.canDownload ? 'Download' : 'No permission'}>
          <span>
            <IconButton
              size="small"
              onClick={() => onDownload(doc.id, doc.originalFilename)}
              disabled={!doc.canDownload}
              sx={{
                width: 34, height: 34, borderRadius: '8px',
                border: '1px solid #E2E8F0',
                color: doc.canDownload ? '#10B981' : '#CBD5E1',
                '&:hover': { background: 'rgba(16,185,129,0.08)', borderColor: '#10B981' },
                '&:disabled': { opacity: 0.4 },
              }}
            >
              <Download sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const MyDocuments = () => {
  const [documents, setDocuments]             = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState('');
  const [categoryFilter, setCategoryFilter]   = useState('all');
  const [permissionFilter, setPermissionFilter] = useState('all');
  const [categories, setCategories]           = useState([]);
  const [viewerOpen, setViewerOpen]           = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [stats, setStats]                     = useState({ totalDocuments: 0, canView: 0, canDownload: 0, canShare: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadDocuments(), loadCategories()]);
    } catch { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  };

  const loadDocuments = async () => {
    const response = await api.get('/permissions/my-accessible-documents');
    if (response.data.success) {
      const docs = response.data.data || [];
      setDocuments(docs);
      setStats({
        totalDocuments: docs.length,
        canView:     docs.filter((d) => d.canView).length,
        canDownload: docs.filter((d) => d.canDownload).length,
        canShare:    docs.filter((d) => d.canShare).length,
      });
    }
  };

  const loadCategories = async () => {
    try {
      const r = await api.get('/categories');
      if (r.data.success) setCategories(r.data.data || []);
    } catch { /* silent */ }
  };

  const handleView = (doc) => {
    if (!doc.canView) { toast.error('No permission to view'); return; }
    setViewingDocument(doc);
    setViewerOpen(true);
  };

  const handleDownload = async (documentId, filename) => {
    try {
      const response = await api.get(`/documents/${documentId}/download`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded!');
    } catch { toast.error('Download failed'); }
  };

  const filtered = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = doc.originalFilename?.toLowerCase().includes(q) || doc.documentType?.toLowerCase().includes(q);
    const matchCat    = categoryFilter === 'all' || doc.categoryId === parseInt(categoryFilter);
    let matchPerm     = true;
    if (permissionFilter === 'view')     matchPerm = doc.canView;
    if (permissionFilter === 'download') matchPerm = doc.canDownload;
    if (permissionFilter === 'share')    matchPerm = doc.canShare;
    return matchSearch && matchCat && matchPerm;
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
      <Box sx={{ mb: 3 }}>
        <Typography sx={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: { xs: '1.75rem', sm: '2.25rem' },
          fontWeight: 400, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.25,
        }}>
          My Documents
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
          Documents shared with you by family members
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { icon: Description, label: 'Total Documents', value: stats.totalDocuments, color: '#6366F1' },
          { icon: Visibility,  label: 'Can View',        value: stats.canView,        color: '#3B82F6' },
          { icon: Download,    label: 'Can Download',    value: stats.canDownload,    color: '#10B981' },
          { icon: Share,       label: 'Can Share',       value: stats.canShare,       color: '#F59E0B' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: '14px', border: '1px solid #E2E8F0' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Search documents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} label="Category">
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.icon} {c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Permission</InputLabel>
              <Select value={permissionFilter} onChange={(e) => setPermissionFilter(e.target.value)} label="Permission">
                <MenuItem value="all">All Permissions</MenuItem>
                <MenuItem value="view">Can View</MenuItem>
                <MenuItem value="download">Can Download</MenuItem>
                <MenuItem value="share">Can Share</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Results */}
      {filtered.length === 0 ? (
        <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#F1F5F9', mx: 'auto', mb: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock sx={{ fontSize: 28, color: '#94A3B8' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>No Documents Available</Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>
              No documents have been shared with you yet, or none match your filters.
            </Typography>
          </Box>
        </Paper>
      ) : (
        <>
          <Typography sx={{ fontSize: '0.8rem', color: '#94A3B8', mb: 1.5, fontWeight: 500 }}>
            {filtered.length} document{filtered.length !== 1 ? 's' : ''}
          </Typography>
          <Grid container spacing={2.5}>
            {filtered.map((doc) => (
              <Grid item xs={12} sm={6} md={4} key={doc.id}>
                <DocCard doc={doc} onView={handleView} onDownload={handleDownload} />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <DocumentViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        document={viewingDocument}
      />
    </Container>
  );
};

export default MyDocuments;