import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button,
  Pagination, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, TextField,
  InputAdornment, IconButton, Chip,
} from '@mui/material';
import {
  CloudUpload,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList,
  GridView,
  ViewList,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

import DocumentGrid from '../components/Documents/DocumentGrid';
import DocumentUpload from '../components/Documents/DocumentUpload';
import DocumentViewer from '../components/Documents/DocumentViewer';
import ShareDialog from '../components/Documents/ShareDialog';
import CategorySelector from '../components/CategorySelector';

import documentService from '../services/documentService';
import categoryService from '../services/categoryService';
import shareService from '../services/shareService';

const Documents = () => {
  const [documents, setDocuments]       = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [categories, setCategories]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(0);
  const [totalPages, setTotalPages]     = useState(0);

  const [uploadOpen, setUploadOpen]   = useState(false);
  const [viewerOpen, setViewerOpen]   = useState(false);
  const [shareOpen, setShareOpen]     = useState(false);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [isSearching, setIsSearching]   = useState(false);

  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, [page]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentService.getDocuments(page, 12);
      const docs = response.data?.documents || response.data || [];
      setDocuments(docs);
      setAllDocuments(docs);
      setTotalPages(response.data?.totalPages || 0);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response.data || []);
    } catch { /* silent */ }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setDocuments(allDocuments);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const lq = query.toLowerCase();
    setDocuments(allDocuments.filter(doc =>
      doc.originalFilename?.toLowerCase().includes(lq) ||
      doc.category?.name?.toLowerCase().includes(lq) ||
      doc.notes?.toLowerCase().includes(lq) ||
      doc.ocrText?.toLowerCase().includes(lq)
    ));
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDocuments(allDocuments);
    setIsSearching(false);
  };

  const handleViewDocument      = (doc) => { setSelectedDocument(doc); setViewerOpen(true); };
  const handleShare             = (doc) => { setSelectedDocument(doc); setShareOpen(true); };
  const handleChangeCategory    = (doc) => { setSelectedDocument(doc); setCategoryOpen(true); };
  const handleCreateCategory    = (doc) => { setSelectedDocument(doc); setCategoryOpen(true); };

  const handleCategoryChangeSuccess = () => {
    toast.success('Category updated!');
    setCategoryOpen(false);
    setSelectedDocument(null);
    loadDocuments();
  };

  const handleViewQR = async (shareId) => {
    try {
      const blobUrl = await shareService.getQRCode(shareId);
      window.open(blobUrl, '_blank');
    } catch {
      toast.error('Failed to load QR code. Session might be expired.');
    }
  };

  const handleDeleteClick = (doc) => {
    if (!doc?.id) { toast.error('Invalid document'); return; }
    setSelectedDocument(doc);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDocument?.id) { setDeleteOpen(false); return; }
    try {
      const result = await documentService.deleteDocument(selectedDocument.id);
      if (result.success) {
        toast.success('Document deleted');
        setDeleteOpen(false);
        setSelectedDocument(null);
        loadDocuments();
      } else {
        toast.error(result.message || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete document');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: { xs: '1.75rem', sm: '2rem' },
            fontWeight: 400,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            mb: 0.25,
          }}>
            Documents
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
            {loading ? 'Loading...' : `${allDocuments.length} document${allDocuments.length !== 1 ? 's' : ''} in your vault`}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<CloudUpload sx={{ fontSize: 18 }} />}
          onClick={() => setUploadOpen(true)}
          sx={{
            borderRadius: '10px',
            px: 2.5,
            py: 1.1,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 16px rgba(99,102,241,0.35)',
            },
          }}
        >
          Upload
        </Button>
      </Box>

      {/* ── Search Bar ── */}
      <Box sx={{
        mb: 3,
        p: 1.5,
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
      }}>
        <SearchIcon sx={{ color: '#94A3B8', ml: 1, flexShrink: 0 }} />
        <TextField
          fullWidth
          variant="standard"
          placeholder="Search by name, category, or content…"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            disableUnderline: true,
            style: { fontSize: '0.9375rem' },
          }}
          sx={{ '& .MuiInputBase-root': { background: 'transparent' } }}
        />
        {searchQuery && (
          <IconButton onClick={handleClearSearch} size="small" sx={{ flexShrink: 0 }}>
            <ClearIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
          </IconButton>
        )}
      </Box>

      {/* ── Search Results Banner ── */}
      {isSearching && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`${documents.length} result${documents.length !== 1 ? 's' : ''} for "${searchQuery}"`}
            size="small"
            onDelete={handleClearSearch}
            sx={{ background: 'rgba(99,102,241,0.1)', color: '#4F46E5', fontWeight: 500, border: '1px solid rgba(99,102,241,0.2)' }}
          />
        </Box>
      )}

      {/* ── Document Grid ── */}
      <DocumentGrid
        documents={documents}
        loading={loading}
        onView={handleViewDocument}
        onDownload={(doc) => documentService.downloadDocument(doc.id, doc.originalFilename)}
        onShare={handleShare}
        onDelete={handleDeleteClick}
        onChangeCategory={handleChangeCategory}
        onCreateCategory={handleCreateCategory}
      />

      {/* ── Pagination ── */}
      {!isSearching && totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, v) => setPage(v - 1)}
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: '8px',
                fontWeight: 500,
              },
              '& .Mui-selected': {
                background: '#6366F1 !important',
                color: 'white',
              },
            }}
          />
        </Box>
      )}

      {/* ── Dialogs ── */}
      <DocumentUpload
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={loadDocuments}
      />
      <DocumentViewer
        open={viewerOpen}
        onClose={() => { setViewerOpen(false); setSelectedDocument(null); }}
        document={selectedDocument}
      />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        document={selectedDocument}
        onSuccess={loadDocuments}
        onViewQR={handleViewQR}
      />
      <CategorySelector
        open={categoryOpen}
        onClose={() => { setCategoryOpen(false); setSelectedDocument(null); }}
        document={selectedDocument}
        onSuccess={handleCategoryChangeSuccess}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setSelectedDocument(null); }}
        PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}
      >
        <DialogTitle sx={{ pt: 3, px: 3, fontWeight: 700 }}>Delete Document?</DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <DialogContentText sx={{ color: '#475569', fontSize: '0.9rem' }}>
            {selectedDocument
              ? <>Are you sure you want to permanently delete <strong style={{ color: '#0F172A' }}>"{selectedDocument.originalFilename}"</strong>? This cannot be undone.</>
              : 'No document selected.'
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => { setDeleteOpen(false); setSelectedDocument(null); }}
            sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={!selectedDocument?.id}
            sx={{
              borderRadius: '8px',
              background: '#EF4444',
              '&:hover': { background: '#DC2626', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Documents;