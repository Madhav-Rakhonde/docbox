import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Typography, CircularProgress, Button,
  TextField, InputAdornment, Fab, FormControl,
  InputLabel, Select, MenuItem, IconButton,
  Menu, ListItemIcon, ListItemText, Chip,
} from '@mui/material';
import {
  Add, Search, FilterList, CloudUpload,
  MoreVert, Visibility, Download, Delete,
  Star, StarBorder, Archive, Unarchive, Folder,
  InsertDriveFile, PictureAsPdf, Image as ImageIcon, Description,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import api from '../../services/api';
import DocumentUpload from './DocumentUpload';
import CategorySelector from './CategorySelector';
import DocumentPreviewDialog from './DocumentPreviewDialog';

// ─── File icon ───────────────────────────────────────────────────────────
const getFileIcon = (fileType) => {
  if (!fileType) return <InsertDriveFile sx={{ fontSize: 40, color: '#94A3B8' }} />;
  const t = fileType.toLowerCase();
  if (t === 'pdf') return <PictureAsPdf sx={{ fontSize: 40, color: '#EF4444' }} />;
  if (['jpg','jpeg','png','gif','webp','heic','bmp','tiff'].includes(t))
    return <ImageIcon sx={{ fontSize: 40, color: '#3B82F6' }} />;
  if (['doc','docx'].includes(t))
    return <Description sx={{ fontSize: 40, color: '#6366F1' }} />;
  return <InsertDriveFile sx={{ fontSize: 40, color: '#94A3B8' }} />;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// ─── Main ────────────────────────────────────────────────────────────────
const DocumentList = () => {
  const [documents, setDocuments]           = useState([]);
  const [categories, setCategories]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadOpen, setUploadOpen]         = useState(false);
  const [previewOpen, setPreviewOpen]       = useState(false);
  const [categoryOpen, setCategoryOpen]     = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [menuAnchor, setMenuAnchor]         = useState(null);
  const [menuDocument, setMenuDocument]     = useState(null);

  useEffect(() => { loadDocuments(); loadCategories(); }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documents');
      setDocuments(response.data.data.documents || []);
    } catch { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || []);
    } catch { /* silent */ }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { loadDocuments(); return; }
    try {
      const response = await api.get('/documents/search', { params: { query: searchQuery } });
      setDocuments(response.data.data || []);
    } catch { toast.error('Search failed'); }
  };

  const handleCategoryFilter = async (categoryId) => {
    setSelectedCategory(categoryId);
    if (!categoryId) { loadDocuments(); return; }
    try {
      const response = await api.get(`/documents/category/${categoryId}`);
      setDocuments(response.data.data.documents || []);
    } catch { toast.error('Filter failed'); }
  };

  const handleMenuOpen  = (e, doc) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuDocument(doc); };
  const handleMenuClose = () => { setMenuAnchor(null); setMenuDocument(null); };
  const handleView      = (doc) => { setSelectedDocument(doc); setPreviewOpen(true); handleMenuClose(); };

  const handleDownload = async (doc) => {
    try {
      const response = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href  = url;
      link.setAttribute('download', doc.originalFilename);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
      handleMenuClose();
    } catch { toast.error('Download failed'); }
  };

  const handleDelete = async (doc) => {
    handleMenuClose();
    if (!window.confirm(`Delete "${doc.originalFilename}"?`)) return;
    try {
      await api.delete(`/documents/${doc.id}`);
      toast.success('Document deleted');
      loadDocuments();
    } catch { toast.error('Failed to delete document'); }
  };

  const handleUpdate = async (documentId, updates) => {
    try {
      await api.put(`/documents/${documentId}`, updates);
      toast.success('Document updated');
      loadDocuments();
      handleMenuClose();
    } catch { toast.error('Failed to update document'); }
  };

  const handleFavoriteToggle = (doc) => handleUpdate(doc.id, { isFavorite: !doc.isFavorite });
  const handleArchiveToggle  = (doc) => handleUpdate(doc.id, { isArchived: !doc.isArchived });

  const handleChangeCategory  = (doc) => { setSelectedDocument(doc); setCategoryOpen(true); handleMenuClose(); };
  const handleCategoryChanged = () => { setCategoryOpen(false); setSelectedDocument(null); loadDocuments(); };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: '#0F172A' }}>
          My Documents
        </Typography>
        <Button variant="contained" startIcon={<CloudUpload sx={{ fontSize: 16 }} />}
          onClick={() => setUploadOpen(true)}
          sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            fontWeight: 600, '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' } }}>
          Upload
        </Button>
      </Box>

      {/* Search & Filter */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField placeholder="Search documents…" value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          size="small"
          sx={{
            flexGrow: 1, minWidth: 240,
            '& .MuiOutlinedInput-root': { borderRadius: '10px',
              '& fieldset': { borderColor: '#E2E8F0' },
              '&:hover fieldset': { borderColor: '#6366F1' },
              '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: '1.5px' },
            },
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment>,
          }}
        />

        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel sx={{ fontSize: '0.875rem' }}>Category</InputLabel>
          <Select value={selectedCategory} label="Category"
            onChange={(e) => handleCategoryFilter(e.target.value)}
            sx={{ borderRadius: '10px', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' } }}>
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id} sx={{ fontSize: '0.875rem' }}>
                {cat.icon} {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="outlined" onClick={handleSearch}
          sx={{ borderRadius: '10px', borderColor: '#E2E8F0', color: '#475569',
            '&:hover': { borderColor: '#6366F1', color: '#6366F1' } }}>
          Search
        </Button>
      </Box>

      {/* Document Grid */}
      {documents.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: '#F1F5F9',
            mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Folder sx={{ fontSize: 28, color: '#94A3B8' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>No documents yet</Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>
            Upload your first document to get started!
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {documents.map((doc) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
              <Box sx={{
                borderRadius: '14px', border: '1px solid #E2E8F0', background: 'white',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer',
                position: 'relative', height: '100%',
                transition: 'transform 200ms ease, box-shadow 200ms ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
              }} onClick={() => handleView(doc)}>

                {/* Thumbnail */}
                <Box sx={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#F8F9FC', borderBottom: '1px solid #E2E8F0' }}>
                  {getFileIcon(doc.fileType)}
                </Box>

                {/* Status badges */}
                <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 0.5 }}>
                  {doc.isFavorite  && <Star sx={{ fontSize: 18, color: '#F59E0B' }} />}
                  {doc.isArchived  && <Archive sx={{ fontSize: 18, color: '#94A3B8' }} />}
                </Box>

                {/* Menu */}
                <IconButton size="small" onClick={(e) => handleMenuOpen(e, doc)}
                  sx={{ position: 'absolute', top: 6, right: 6,
                    background: 'white', width: 28, height: 28, border: '1px solid #E2E8F0',
                    color: '#94A3B8', '&:hover': { background: '#F8F9FC', color: '#0F172A' } }}>
                  <MoreVert sx={{ fontSize: 14 }} />
                </IconButton>

                <Box sx={{ p: 2, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.825rem', color: '#0F172A',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.75 }}
                    title={doc.originalFilename}>
                    {doc.originalFilename}
                  </Typography>

                  {doc.category && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                      <Typography sx={{ fontSize: '0.72rem' }}>{doc.category.icon}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#64748B' }}>{doc.category.name}</Typography>
                    </Box>
                  )}

                  <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mb: 0.25 }}>
                    {doc.fileType?.toUpperCase()} · {formatFileSize(doc.fileSize)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                    {format(new Date(doc.createdAt), 'MMM dd, yyyy')}
                  </Typography>

                  {doc.isExpired && (
                    <Box sx={{ mt: 1, px: 1, py: 0.2, borderRadius: '4px', background: '#FEF2F2',
                      display: 'inline-block' }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#EF4444' }}>EXPIRED</Typography>
                    </Box>
                  )}
                  {doc.isExpiringSoon && !doc.isExpired && (
                    <Box sx={{ mt: 1, px: 1, py: 0.2, borderRadius: '4px', background: '#FFFBEB',
                      display: 'inline-block' }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#F59E0B' }}>EXPIRING SOON</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}
        PaperProps={{ sx: { borderRadius: '12px', border: '1px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(15,23,42,0.1)', minWidth: 190 } }}>
        <MenuItem onClick={() => handleView(menuDocument)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><Visibility sx={{ fontSize: 16, color: '#6366F1' }} /></ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload(menuDocument)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><Download sx={{ fontSize: 16, color: '#3B82F6' }} /></ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFavoriteToggle(menuDocument)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon>
            {menuDocument?.isFavorite
              ? <Star sx={{ fontSize: 16, color: '#F59E0B' }} />
              : <StarBorder sx={{ fontSize: 16, color: '#94A3B8' }} />}
          </ListItemIcon>
          <ListItemText>{menuDocument?.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleChangeCategory(menuDocument)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><Folder sx={{ fontSize: 16, color: '#10B981' }} /></ListItemIcon>
          <ListItemText>Change Category</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleArchiveToggle(menuDocument)} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon>
            {menuDocument?.isArchived
              ? <Unarchive sx={{ fontSize: 16, color: '#6366F1' }} />
              : <Archive sx={{ fontSize: 16, color: '#64748B' }} />}
          </ListItemIcon>
          <ListItemText>{menuDocument?.isArchived ? 'Unarchive' : 'Archive'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDelete(menuDocument)} sx={{ fontSize: '0.875rem', color: '#EF4444' }}>
          <ListItemIcon><Delete sx={{ fontSize: 16, color: '#EF4444' }} /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialogs */}
      <DocumentUpload open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={loadDocuments} />
      <DocumentPreviewDialog open={previewOpen} document={selectedDocument}
        onClose={() => { setPreviewOpen(false); setSelectedDocument(null); }}
        onDelete={handleDelete} onUpdate={handleUpdate} onDownload={handleDownload} />
      <CategorySelector open={categoryOpen} document={selectedDocument}
        onClose={() => { setCategoryOpen(false); setSelectedDocument(null); }}
        onSuccess={handleCategoryChanged} />

      {/* FAB */}
      <Fab aria-label="upload" onClick={() => setUploadOpen(true)}
        sx={{ position: 'fixed', bottom: 20, right: 20,
          background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
          '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' },
          boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
        }}>
        <Add sx={{ color: 'white' }} />
      </Fab>
    </Box>
  );
};

export default DocumentList;