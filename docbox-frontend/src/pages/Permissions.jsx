import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Security,
  Visibility,
  Download,
  Share,
  LockOpen,
  Category as CategoryIcon,
  Description,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

const Permissions = () => {
  const [searchParams] = useSearchParams();
  const preSelectedMemberId = searchParams.get('member');
  
  const [tabValue, setTabValue] = useState(0);
  const [documentPermissions, setDocumentPermissions] = useState([]);
  const [categoryPermissions, setCategoryPermissions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('document');
  const [editingPermission, setEditingPermission] = useState(null);
  const [formData, setFormData] = useState({
    familyMemberId: preSelectedMemberId || '',
    documentId: '',
    categoryId: '',
    permissionLevel: 'VIEW_ONLY', // ✅ FIXED: Changed from 'VIEW' to 'VIEW_ONLY'
  });
  const [submitting, setSubmitting] = useState(false);

  // ✅ FIXED: Corrected enum values to match backend
  const permissionLevels = [
    { value: 'VIEW_ONLY', label: 'View Only', description: 'Can only view', icon: <Visibility /> },
    { value: 'VIEW_DOWNLOAD', label: 'View & Download', description: 'Can view and download', icon: <Download /> },
    { value: 'VIEW_DOWNLOAD_SHARE', label: 'Can Share', description: 'Can view, download and share', icon: <Share /> },
    { value: 'FULL_ACCESS', label: 'Full Access', description: 'Complete control', icon: <LockOpen /> },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDocumentPermissions(),
        loadCategoryPermissions(),
        loadCategories(),
        loadFamilyMembers(),
        loadDocuments(),
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load permissions data');
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentPermissions = async () => {
    try {
      const response = await api.get('/permissions/my-permissions');
      if (response.data.success) {
        const perms = response.data.data;
        setDocumentPermissions(Array.isArray(perms) ? perms : []);
      } else {
        setDocumentPermissions([]);
      }
    } catch (error) {
      console.error('Failed to load document permissions:', error);
      setDocumentPermissions([]);
    }
  };

  const loadCategoryPermissions = async () => {
    try {
      const response = await api.get('/permissions/category-permissions');
      if (response.data.success) {
        const perms = response.data.data;
        setCategoryPermissions(Array.isArray(perms) ? perms : []);
      } else {
        setCategoryPermissions([]);
      }
    } catch (error) {
      console.error('Failed to load category permissions:', error);
      setCategoryPermissions([]);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      if (response.data.success) {
        const cats = response.data.data;
        setCategories(Array.isArray(cats) ? cats : []);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  const loadFamilyMembers = async () => {
    try {
      const response = await api.get('/family-members');
      if (response.data.success) {
        const members = response.data.data;
        setFamilyMembers(Array.isArray(members) ? members : []);
      } else {
        setFamilyMembers([]);
      }
    } catch (error) {
      console.error('Failed to load family members:', error);
      setFamilyMembers([]);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await api.get('/documents');
      if (response.data.success) {
        const docs = response.data.data;
        setDocuments(Array.isArray(docs) ? docs : []);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    }
  };

  const handleOpenDialog = (type, permission = null) => {
    setDialogType(type);
    if (permission) {
      setEditingPermission(permission);
      setFormData({
        familyMemberId: permission.familyMemberId || '',
        documentId: permission.documentId || '',
        categoryId: permission.categoryId || '',
        permissionLevel: permission.permissionLevel || permission.defaultPermissionLevel || 'VIEW_ONLY',
      });
    } else {
      setEditingPermission(null);
      setFormData({
        familyMemberId: preSelectedMemberId || '',
        documentId: '',
        categoryId: '',
        permissionLevel: 'VIEW_ONLY',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPermission(null);
    setFormData({
      familyMemberId: preSelectedMemberId || '',
      documentId: '',
      categoryId: '',
      permissionLevel: 'VIEW_ONLY',
    });
  };

  const handleSubmit = async () => {
    if (!formData.familyMemberId) {
      toast.error('Please select a family member');
      return;
    }

    if (dialogType === 'document' && !formData.documentId) {
      toast.error('Please select a document');
      return;
    }

    if (dialogType === 'category' && !formData.categoryId) {
      toast.error('Please select a category');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        familyMemberId: parseInt(formData.familyMemberId),
        permissionLevel: formData.permissionLevel,
      };

      if (dialogType === 'document') {
        payload.documentId = parseInt(formData.documentId);
        
        if (editingPermission) {
          await api.put(`/permissions/${editingPermission.id}`, payload);
          toast.success('Permission updated successfully!');
        } else {
          await api.post('/permissions/grant', payload);
          toast.success('Permission granted successfully!');
        }
        await loadDocumentPermissions();
      } else {
        payload.categoryId = parseInt(formData.categoryId);
        
        if (editingPermission) {
          await api.put(`/permissions/category/${editingPermission.id}`, payload);
          toast.success('Category permission updated successfully!');
        } else {
          await api.post('/permissions/category/grant', payload);
          toast.success('Category permission granted successfully!');
        }
        await loadCategoryPermissions();
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save permission:', error);
      const message = error.response?.data?.message || 'Failed to save permission';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (type, permissionId) => {
    if (!window.confirm('Are you sure you want to revoke this permission?')) {
      return;
    }

    try {
      if (type === 'document') {
        await api.delete(`/permissions/${permissionId}`);
        toast.success('Permission revoked successfully!');
        await loadDocumentPermissions();
      } else {
        await api.delete(`/permissions/category/${permissionId}`);
        toast.success('Category permission revoked successfully!');
        await loadCategoryPermissions();
      }
    } catch (error) {
      console.error('Failed to delete permission:', error);
      toast.error('Failed to revoke permission');
    }
  };

  const getPermissionLevelColor = (level) => {
    switch (level) {
      case 'VIEW_ONLY':
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
    const perm = permissionLevels.find((p) => p.value === level);
    return perm ? perm.label : level;
  };

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
          Permissions Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Control who can access your documents and categories
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Description sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6">{documentPermissions.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Document Permissions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CategoryIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
                <Box>
                  <Typography variant="h6">{categoryPermissions.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Category Permissions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Info Alert */}
      {preSelectedMemberId && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Managing permissions for selected family member (ID: {preSelectedMemberId})
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Document Permissions" icon={<Description />} iconPosition="start" />
          <Tab label="Category Permissions" icon={<CategoryIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Document Permissions Tab */}
      {tabValue === 0 && (
        <Paper>
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Document Permissions</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog('document')}
            >
              Grant Permission
            </Button>
          </Box>
          {documentPermissions.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Security sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Document Permissions
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Grant permissions to family members to access specific documents
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog('document')}>
                Grant First Permission
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Family Member</TableCell>
                    <TableCell>Document</TableCell>
                    <TableCell>Permission Level</TableCell>
                    <TableCell>Granted On</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documentPermissions.map((perm) => (
                    <TableRow key={perm.id}>
                      <TableCell>{perm.familyMemberName || perm.userName || 'Unknown'}</TableCell>
                      <TableCell>{perm.documentName || perm.document?.originalFilename || 'Unknown'}</TableCell>
                      <TableCell>
                        <Chip
                          label={getPermissionLevelLabel(perm.permissionLevel)}
                          color={getPermissionLevelColor(perm.permissionLevel)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {perm.grantedAt || perm.createdAt
                          ? new Date(perm.grantedAt || perm.createdAt).toLocaleDateString('en-IN')
                          : 'N/A'}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog('document', perm)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete('document', perm.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Category Permissions Tab */}
      {tabValue === 1 && (
        <Paper>
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Category Permissions</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog('category')}
            >
              Grant Permission
            </Button>
          </Box>
          {categoryPermissions.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Security sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Category Permissions
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Grant permissions to family members to access entire categories
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog('category')}>
                Grant First Permission
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Family Member</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Permission Level</TableCell>
                    <TableCell>Granted On</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categoryPermissions.map((perm) => (
                    <TableRow key={perm.id}>
                      <TableCell>{perm.familyMemberName || perm.userName || 'Unknown'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{perm.categoryIcon || '📁'}</span>
                          {perm.categoryName || perm.category?.name || 'Unknown'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getPermissionLevelLabel(perm.defaultPermissionLevel || perm.permissionLevel)}
                          color={getPermissionLevelColor(perm.defaultPermissionLevel || perm.permissionLevel)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {perm.createdAt
                          ? new Date(perm.createdAt).toLocaleDateString('en-IN')
                          : 'N/A'}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog('category', perm)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete('category', perm.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Permission Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPermission ? 'Edit Permission' : 'Grant Permission'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            {/* Family Member */}
            <FormControl fullWidth required>
              <InputLabel>Family Member</InputLabel>
              <Select
                value={formData.familyMemberId}
                onChange={(e) => setFormData({ ...formData, familyMemberId: e.target.value })}
                label="Family Member"
                disabled={!!editingPermission}
              >
                {familyMembers.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.name} ({member.relationship})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Document or Category */}
            {dialogType === 'document' ? (
              <FormControl fullWidth required>
                <InputLabel>Document</InputLabel>
                <Select
                  value={formData.documentId}
                  onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                  label="Document"
                  disabled={!!editingPermission}
                >
                  {documents.map((doc) => (
                    <MenuItem key={doc.id} value={doc.id}>
                      {doc.originalFilename || doc.filename}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  label="Category"
                  disabled={!!editingPermission}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Permission Level */}
            <FormControl fullWidth required>
              <InputLabel>Permission Level</InputLabel>
              <Select
                value={formData.permissionLevel}
                onChange={(e) => setFormData({ ...formData, permissionLevel: e.target.value })}
                label="Permission Level"
              >
                {permissionLevels.map((perm) => (
                  <MenuItem key={perm.value} value={perm.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {perm.icon}
                      <Box>
                        <Typography variant="body1">{perm.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {perm.description}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="info">
              {dialogType === 'document'
                ? 'This permission will allow the selected family member to access this specific document.'
                : 'This permission will allow the selected family member to access all documents in this category.'}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {editingPermission ? 'Update' : 'Grant'} Permission
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Permissions;