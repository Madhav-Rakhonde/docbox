import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Visibility,
  Download,
  Share,
  Search,
  FilterList,
  Description,
  Lock,
  LockOpen,
  Category,
  Person,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import DocumentViewer from '../components/Documents/DocumentViewer';

const MyDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [permissionFilter, setPermissionFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    canView: 0,
    canDownload: 0,
    canShare: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDocuments(),
        loadCategories(),
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      // Get documents I have permission to access
      const response = await api.get('/permissions/my-accessible-documents');
      
      if (response.data.success) {
        const docs = response.data.data || [];
        setDocuments(docs);
        
        // Calculate stats
        const stats = {
          totalDocuments: docs.length,
          canView: docs.filter(d => d.canView).length,
          canDownload: docs.filter(d => d.canDownload).length,
          canShare: docs.filter(d => d.canShare).length,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      throw error;
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleView = async (document) => {
    if (!document.canView) {
      toast.error('You do not have permission to view this document');
      return;
    }

    setViewingDocument(document);
    setViewerOpen(true);
  };

  const handleDownload = async (documentId, filename) => {
    try {
      const response = await api.get(`/documents/${documentId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Document downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download document');
    }
  };

  const getPermissionLevelColor = (level) => {
    switch (level) {
      case 'VIEW':
        return 'default';
      case 'VIEW_DOWNLOAD':
        return 'primary';
      case 'VIEW_DOWNLOAD_SHARE':
        return 'secondary';
      case 'FULL_ACCESS':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPermissionLevelLabel = (level) => {
    switch (level) {
      case 'VIEW':
        return 'View Only';
      case 'VIEW_DOWNLOAD':
        return 'View & Download';
      case 'VIEW_DOWNLOAD_SHARE':
        return 'Can Share';
      case 'FULL_ACCESS':
        return 'Full Access';
      default:
        return level;
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    // Search filter
    const matchesSearch = doc.originalFilename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.documentType?.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory = categoryFilter === 'all' || doc.categoryId === parseInt(categoryFilter);

    // Permission filter
    let matchesPermission = true;
    if (permissionFilter === 'view') matchesPermission = doc.canView;
    if (permissionFilter === 'download') matchesPermission = doc.canDownload;
    if (permissionFilter === 'share') matchesPermission = doc.canShare;

    return matchesSearch && matchesCategory && matchesPermission;
  });

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          My Documents
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Documents shared with you by your family
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Description sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h5">{stats.totalDocuments}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Documents
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Visibility sx={{ fontSize: 40, color: 'info.main' }} />
                <Box>
                  <Typography variant="h5">{stats.canView}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Can View
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Download sx={{ fontSize: 40, color: 'success.main' }} />
                <Box>
                  <Typography variant="h5">{stats.canDownload}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Can Download
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Share sx={{ fontSize: 40, color: 'secondary.main' }} />
                <Box>
                  <Typography variant="h5">{stats.canShare}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Can Share
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="Category"
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Permission</InputLabel>
              <Select
                value={permissionFilter}
                onChange={(e) => setPermissionFilter(e.target.value)}
                label="Permission"
              >
                <MenuItem value="all">All Permissions</MenuItem>
                <MenuItem value="view">Can View</MenuItem>
                <MenuItem value="download">Can Download</MenuItem>
                <MenuItem value="share">Can Share</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Lock sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Documents Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No documents have been shared with you yet, or no documents match your filters.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredDocuments.map((doc) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Description sx={{ fontSize: 48, color: 'primary.main', mr: 2 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom noWrap title={doc.originalFilename}>
                        {doc.originalFilename}
                      </Typography>
                      <Chip
                        label={getPermissionLevelLabel(doc.permissionLevel)}
                        size="small"
                        color={getPermissionLevelColor(doc.permissionLevel)}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {doc.categoryName && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Category fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {doc.categoryIcon} {doc.categoryName}
                        </Typography>
                      </Box>
                    )}

                    {doc.ownerName && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          Owner: {doc.ownerName}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                      {doc.canView && (
                        <Chip label="View" size="small" icon={<Visibility />} variant="outlined" />
                      )}
                      {doc.canDownload && (
                        <Chip label="Download" size="small" icon={<Download />} variant="outlined" />
                      )}
                      {doc.canShare && (
                        <Chip label="Share" size="small" icon={<Share />} variant="outlined" />
                      )}
                    </Box>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Tooltip title={doc.canView ? 'View Document' : 'No permission to view'}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleView(doc)}
                        disabled={!doc.canView}
                        color="primary"
                      >
                        <Visibility />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={doc.canDownload ? 'Download Document' : 'No permission to download'}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleDownload(doc.id, doc.originalFilename)}
                        disabled={!doc.canDownload}
                        color="success"
                      >
                        <Download />
                      </IconButton>
                    </span>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Document Viewer */}
      <DocumentViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        document={viewingDocument}
      />
    </Container>
  );
};

export default MyDocuments;