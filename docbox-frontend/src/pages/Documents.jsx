import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { 
  CloudUpload, 
  Search as SearchIcon,
  Clear as ClearIcon 
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
  const [documents, setDocuments] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false); // ✅ NEW

  const [selectedDocument, setSelectedDocument] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setDocuments(allDocuments);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase();
    
    const filtered = allDocuments.filter(doc => 
      doc.originalFilename?.toLowerCase().includes(lowerQuery) ||
      doc.category?.name?.toLowerCase().includes(lowerQuery) ||
      doc.notes?.toLowerCase().includes(lowerQuery) ||
      doc.ocrText?.toLowerCase().includes(lowerQuery)
    );
    
    setDocuments(filtered);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDocuments(allDocuments);
    setIsSearching(false);
  };

  const handleViewDocument = (doc) => {
    setSelectedDocument(doc);
    setViewerOpen(true);
  };

  const handleShare = (doc) => {
    setSelectedDocument(doc);
    setShareOpen(true);
  };

  const handleViewQR = async (shareId) => {
    try {
      const blobUrl = await shareService.getQRCode(shareId);
      window.open(blobUrl, '_blank');
    } catch (error) {
      toast.error('Failed to load QR code. Session might be expired.');
    }
  };

  // ✅ NEW: Handle Change Category
  const handleChangeCategory = (doc) => {
    console.log('📂 Change category for:', doc);
    setSelectedDocument(doc);
    setCategoryOpen(true);
  };

  // ✅ NEW: Handle Create New Category (opens with pre-selected doc)
  const handleCreateCategory = (doc) => {
    console.log('📁 Create new category for:', doc);
    setSelectedDocument(doc);
    setCategoryOpen(true);
  };

  // ✅ NEW: Handle Category Change Success
  const handleCategoryChangeSuccess = () => {
    toast.success('Category updated successfully!');
    setCategoryOpen(false);
    setSelectedDocument(null);
    loadDocuments(); // Reload to show updated category
  };

  const handleDeleteClick = (doc) => {
    console.log('🗑️ Delete clicked for:', doc);
    if (!doc || !doc.id) {
      toast.error('Invalid document');
      return;
    }
    setSelectedDocument(doc);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDocument || !selectedDocument.id) {
      toast.error('No document selected');
      setDeleteOpen(false);
      return;
    }

    console.log('🗑️ Deleting document ID:', selectedDocument.id);

    try {
      const result = await documentService.deleteDocument(selectedDocument.id);
      
      if (result.success) {
        toast.success('Document deleted successfully');
        setDeleteOpen(false);
        setSelectedDocument(null);
        loadDocuments();
      } else {
        toast.error(result.message || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteOpen(false);
    setSelectedDocument(null);
  };

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          Documents
        </Typography>
        <Typography color="text.secondary">
          Manage and organize your documents
        </Typography>
      </Box>

      {/* Actions Bar */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          size="large"
          onClick={() => setUploadOpen(true)}
        >
          Upload Document
        </Button>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search documents by name, category, or content..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton onClick={handleClearSearch} size="small">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Search Results Info */}
      {isSearching && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Found {documents.length} document{documents.length !== 1 ? 's' : ''} 
            matching "{searchQuery}"
          </Typography>
        </Box>
      )}

      {/* Documents Grid */}
      <DocumentGrid
        documents={documents}
        loading={loading}
        onView={handleViewDocument}
        onDownload={(doc) =>
          documentService.downloadDocument(doc.id, doc.originalFilename)
        }
        onShare={handleShare}
        onDelete={handleDeleteClick}
        onChangeCategory={handleChangeCategory} // ✅ NEW
        onCreateCategory={handleCreateCategory} // ✅ NEW
      />

      {/* Pagination */}
      {!isSearching && totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, value) => setPage(value - 1)}
          />
        </Box>
      )}

      {/* Upload Dialog */}
      <DocumentUpload
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={loadDocuments}
      />

      {/* Viewer Dialog */}
      <DocumentViewer
        open={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
      />

      {/* Share Dialog */}
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        document={selectedDocument}
        onSuccess={loadDocuments}
        onViewQR={handleViewQR}
      />

      {/* ✅ NEW: Category Selector Dialog */}
      <CategorySelector
        open={categoryOpen}
        onClose={() => {
          setCategoryOpen(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        onSuccess={handleCategoryChangeSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Document?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedDocument ? (
              <>
                Are you sure you want to delete "<strong>{selectedDocument.originalFilename}</strong>"? 
                This action cannot be undone.
              </>
            ) : (
              'No document selected'
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={!selectedDocument || !selectedDocument.id}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Documents;
