import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const POLL_INTERVAL_MS = 4000;

const Documents = () => {
  const [documents, setDocuments]       = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [categories, setCategories]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(0);
  const [totalPages, setTotalPages]     = useState(0);

  const [uploadOpen, setUploadOpen]     = useState(false);
  const [viewerOpen, setViewerOpen]     = useState(false);
  const [shareOpen, setShareOpen]       = useState(false);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [isSearching, setIsSearching]   = useState(false);
  const [isDeleting, setIsDeleting]     = useState(false);

  const pollTimerRef = useRef(null);

  // ── Load documents ──────────────────────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await documentService.getDocuments(page, 12);
      const docs     = response.data?.documents || response.data || [];
      setDocuments(docs);
      setAllDocuments(docs);
      setTotalPages(response.data?.totalPages || 0);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, [loadDocuments]);

  // ── Auto-poll when any document is PROCESSING ───────────────────────────
  useEffect(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    const hasProcessing = allDocuments.some(d => d.processingStatus === 'PROCESSING');
    if (hasProcessing) {
      pollTimerRef.current = setTimeout(loadDocuments, POLL_INTERVAL_MS);
    }
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, [allDocuments, loadDocuments]);

  // ── Search ──────────────────────────────────────────────────────────────
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
      doc.notes?.toLowerCase().includes(lq)
    ));
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDocuments(allDocuments);
    setIsSearching(false);
  };

  // ── Document actions ────────────────────────────────────────────────────
  const handleViewDocument   = (doc) => { setSelectedDocument(doc); setViewerOpen(true); };
  const handleShare          = (doc) => { setSelectedDocument(doc); setShareOpen(true); };
  const handleChangeCategory = (doc) => { setSelectedDocument(doc); setCategoryOpen(true); };
  const handleCreateCategory = (doc) => { setSelectedDocument(doc); setCategoryOpen(true); };

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
    } catch { toast.error('Failed to load QR code.'); }
  };

  const handleDeleteClick = (doc) => {
    if (!doc?.id) { toast.error('Invalid document'); return; }
    setSelectedDocument(doc);
    setDeleteOpen(true);
  };

  // ── OPTIMISTIC DELETE ───────────────────────────────────────────────────
  // 1. Close dialog + remove card from UI instantly
  // 2. Call API in background
  // 3. Roll back + show error only if API fails
  const handleDeleteConfirm = async () => {
    if (!selectedDocument?.id) { setDeleteOpen(false); return; }

    const docToDelete = selectedDocument;

    // ── Step 1: instant UI update ──
    setDeleteOpen(false);
    setSelectedDocument(null);
    setDocuments(prev => prev.filter(d => d.id !== docToDelete.id));
    setAllDocuments(prev => prev.filter(d => d.id !== docToDelete.id));

    // ── Step 2: background API call ──
    setIsDeleting(true);
    try {
      await documentService.deleteDocument(docToDelete.id);
      toast.success('Document deleted');
    } catch {
      // ── Step 3: roll back on failure ──
      setDocuments(prev => [docToDelete, ...prev]);
      setAllDocuments(prev => [docToDelete, ...prev]);
      toast.error('Failed to delete document — restored');
    } finally {
      setIsDeleting(false);
    }
  };

  const processingCount = allDocuments.filter(d => d.processingStatus === 'PROCESSING').length;

  return (
    <Container maxWidth="xl" sx={{ animation: 'fadeUp 0.35s ease both' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <Box sx={{
        mb: 3, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
      }}>
        <Box>
          <Typography sx={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: { xs: '1.75rem', sm: '2rem' },
            fontWeight: 400, color: '#0F172A',
            letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.25,
          }}>
            Documents
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
              {loading
                ? 'Loading…'
                : `${allDocuments.length} document${allDocuments.length !== 1 ? 's' : ''} in your vault`}
            </Typography>

            {processingCount > 0 && (
              <Chip
                label={`${processingCount} processing`}
                size="small"
                sx={{
                  height: 20, fontSize: '0.68rem', fontWeight: 600,
                  background: 'rgba(99,102,241,0.1)',
                  color: '#4F46E5',
                  border: '1px solid rgba(99,102,241,0.25)',
                }}
              />
            )}
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<CloudUpload sx={{ fontSize: 18 }} />}
          onClick={() => setUploadOpen(true)}
          sx={{
            borderRadius: '10px', px: 2.5, py: 1.1, fontWeight: 600,
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 16px rgba(99,102,241,0.35)',
            },
          }}>
          Upload
        </Button>
      </Box>

      {/* ── Search bar ───────────────────────────────────────────────── */}
      <Box sx={{
        mb: 3, p: 1.5, background: '#FFFFFF', borderRadius: '14px',
        border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1,
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
      }}>
        <SearchIcon sx={{ color: '#94A3B8', ml: 1, flexShrink: 0 }} />
        <TextField
          fullWidth
          variant="standard"
          placeholder="Search by name or category…"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{ disableUnderline: true, style: { fontSize: '0.9375rem' } }}
          sx={{ '& .MuiInputBase-root': { background: 'transparent' } }}
        />
        {searchQuery && (
          <IconButton onClick={handleClearSearch} size="small" sx={{ flexShrink: 0 }}>
            <ClearIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
          </IconButton>
        )}
      </Box>

      {/* ── Search results banner ────────────────────────────────────── */}
      {isSearching && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`${documents.length} result${documents.length !== 1 ? 's' : ''} for "${searchQuery}"`}
            size="small"
            onDelete={handleClearSearch}
            sx={{
              background: 'rgba(99,102,241,0.1)', color: '#4F46E5',
              fontWeight: 500, border: '1px solid rgba(99,102,241,0.2)',
            }}
          />
        </Box>
      )}

      {/* ── Document grid ────────────────────────────────────────────── */}
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

      {/* ── Pagination ───────────────────────────────────────────────── */}
      {!isSearching && totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, v) => setPage(v - 1)}
            sx={{
              '& .MuiPaginationItem-root': { borderRadius: '8px', fontWeight: 500 },
              '& .Mui-selected': { background: '#6366F1 !important', color: 'white' },
            }}
          />
        </Box>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────── */}
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

      {/* ── Delete confirmation ───────────────────────────────────────── */}
      <Dialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setSelectedDocument(null); }}
        PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}>
        <DialogTitle sx={{ pt: 3, px: 3, fontWeight: 700 }}>Delete Document?</DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <DialogContentText sx={{ color: '#475569', fontSize: '0.9rem' }}>
            {selectedDocument
              ? <>Are you sure you want to permanently delete{' '}
                  <strong style={{ color: '#0F172A' }}>"{selectedDocument.originalFilename}"</strong>?
                  This cannot be undone.</>
              : 'No document selected.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => { setDeleteOpen(false); setSelectedDocument(null); }}
            sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={!selectedDocument?.id || isDeleting}
            sx={{
              borderRadius: '8px', background: '#EF4444',
              '&:hover': { background: '#DC2626', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' },
            }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Documents;