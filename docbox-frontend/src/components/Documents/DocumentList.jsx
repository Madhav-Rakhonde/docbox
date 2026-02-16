import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Button,
  TextField,
  InputAdornment,
  Fab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  CloudUpload,
  MoreVert,
  Visibility,
  Download,
  Delete,
  Star,
  StarBorder,
  Archive,
  Unarchive,
  Folder,
  InsertDriveFile,
  PictureAsPdf,
  Image as ImageIcon,
  Description,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import api from '../../services/api';
import DocumentUpload from './DocumentUpload';
import CategorySelector from './CategorySelector';
import DocumentPreviewDialog from './DocumentPreviewDialog';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuDocument, setMenuDocument] = useState(null);

  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documents');
      setDocuments(response.data.data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadDocuments();
      return;
    }

    try {
      const response = await api.get('/documents/search', {
        params: { query: searchQuery }
      });
      setDocuments(response.data.data || []);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    }
  };

  const handleCategoryFilter = async (categoryId) => {
    setSelectedCategory(categoryId);
    
    if (!categoryId) {
      loadDocuments();
      return;
    }

    try {
      const response = await api.get(`/documents/category/${categoryId}`);
      setDocuments(response.data.data.documents || []);
    } catch (error) {
      console.error('Filter failed:', error);
      toast.error('Filter failed');
    }
  };

  const handleMenuOpen = (event, document) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuDocument(document);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuDocument(null);
  };

  const handleView = (document) => {
    setSelectedDocument(document);
    setPreviewOpen(true);
    handleMenuClose();
  };

  const handleDownload = async (document) => {
    try {
      const response = await api.get(`/documents/${document.id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.originalFilename);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Download started');
      handleMenuClose();
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  };

  const handleDelete = async (document) => {
    handleMenuClose();
    
    if (!window.confirm(`Are you sure you want to delete "${document.originalFilename}"?`)) {
      return;
    }

    try {
      await api.delete(`/documents/${document.id}`);
      toast.success('Document deleted successfully');
      loadDocuments();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleUpdate = async (documentId, updates) => {
    try {
      await api.put(`/documents/${documentId}`, updates);
      toast.success('Document updated');
      loadDocuments();
      handleMenuClose();
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to update document');
    }
  };

  const handleFavoriteToggle = (document) => {
    handleUpdate(document.id, { isFavorite: !document.isFavorite });
  };

  const handleArchiveToggle = (document) => {
    handleUpdate(document.id, { isArchived: !document.isArchived });
  };

  const handleChangeCategory = (document) => {
    setSelectedDocument(document);
    setCategoryOpen(true);
    handleMenuClose();
  };

  const handleCategoryChanged = () => {
    setCategoryOpen(false);
    setSelectedDocument(null);
    loadDocuments();
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return <InsertDriveFile sx={{ fontSize: 48, color: 'text.secondary' }} />;

    const type = fileType.toLowerCase();
    
    if (type === 'pdf') {
      return <PictureAsPdf sx={{ fontSize: 48, color: '#d32f2f' }} />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'tiff'].includes(type)) {
      return <ImageIcon sx={{ fontSize: 48, color: '#1976d2' }} />;
    }
    if (['doc', 'docx'].includes(type)) {
      return <Description sx={{ fontSize: 48, color: '#1565c0' }} />;
    }
    
    return <InsertDriveFile sx={{ fontSize: 48, color: 'text.secondary' }} />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="600">
          My Documents
        </Typography>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={() => setUploadOpen(true)}
        >
          Upload
        </Button>
      </Box>

      {/* Search & Filter */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, minWidth: 250 }}
        />

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            label="Category"
            onChange={(e) => handleCategoryFilter(e.target.value)}
            startAdornment={<FilterList sx={{ ml: 1, mr: -0.5 }} />}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="outlined" onClick={handleSearch}>
          Search
        </Button>
      </Box>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <Alert severity="info">
          No documents found. Upload your first document to get started!
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {documents.map((doc) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={doc.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  }
                }}
                onClick={() => handleView(doc)}
              >
                {/* File Icon Display */}
                <Box
                  sx={{
                    height: 160,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                    borderBottom: 1,
                    borderColor: 'divider',
                  }}
                >
                  {getFileIcon(doc.fileType)}
                </Box>

                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  {/* Favorite & Archive Icons */}
                  <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 0.5 }}>
                    {doc.isFavorite && (
                      <Star sx={{ color: 'warning.main', fontSize: 20 }} />
                    )}
                    {doc.isArchived && (
                      <Archive sx={{ color: 'action.active', fontSize: 20 }} />
                    )}
                  </Box>

                  {/* Menu Button */}
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMenuOpen(e, doc)}
                      sx={{ bgcolor: 'background.paper' }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  {/* Document Info */}
                  <Typography 
                    variant="subtitle1" 
                    noWrap 
                    sx={{ fontWeight: 600, mt: 1 }}
                    title={doc.originalFilename}
                  >
                    {doc.originalFilename}
                  </Typography>

                  {/* Category */}
                  {doc.category && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                      <Folder fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {doc.category.icon} {doc.category.name}
                      </Typography>
                    </Box>
                  )}

                  {/* File Size & Type */}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    {doc.fileType?.toUpperCase()} • {formatFileSize(doc.fileSize)}
                  </Typography>

                  {/* Upload Date */}
                  <Typography variant="caption" color="text.secondary" display="block">
                    {format(new Date(doc.createdAt), 'MMM dd, yyyy')}
                  </Typography>

                  {/* Expiry Status */}
                  {doc.isExpired && (
                    <Chip label="Expired" color="error" size="small" sx={{ mt: 1 }} />
                  )}
                  {doc.isExpiringSoon && !doc.isExpired && (
                    <Chip label="Expiring Soon" color="warning" size="small" sx={{ mt: 1 }} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleView(menuDocument)}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleDownload(menuDocument)}>
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleFavoriteToggle(menuDocument)}>
          <ListItemIcon>
            {menuDocument?.isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
          </ListItemIcon>
          <ListItemText>
            {menuDocument?.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          </ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleChangeCategory(menuDocument)}>
          <ListItemIcon>
            <Folder fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change Category</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleArchiveToggle(menuDocument)}>
          <ListItemIcon>
            {menuDocument?.isArchived ? <Unarchive fontSize="small" /> : <Archive fontSize="small" />}
          </ListItemIcon>
          <ListItemText>
            {menuDocument?.isArchived ? 'Unarchive' : 'Archive'}
          </ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleDelete(menuDocument)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Upload Dialog */}
      <DocumentUpload
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={loadDocuments}
      />

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog
        open={previewOpen}
        document={selectedDocument}
        onClose={() => {
          setPreviewOpen(false);
          setSelectedDocument(null);
        }}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        onDownload={handleDownload}
      />

      {/* Category Selector */}
      <CategorySelector
        open={categoryOpen}
        document={selectedDocument}
        onClose={() => {
          setCategoryOpen(false);
          setSelectedDocument(null);
        }}
        onSuccess={handleCategoryChanged}
      />

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="upload"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setUploadOpen(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default DocumentList;