import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button, Paper,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, MenuItem,
  CircularProgress, Alert, FormControl, InputLabel, Select,
  Card, CardContent, Grid, Tabs, Tab,
} from '@mui/material';
import {
  Add, Edit, Delete, Security, Visibility, Download,
  Share, LockOpen, Category as CategoryIcon, Description, LockReset,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

// ─── Permission config ─────────────────────────────────────────────────────
const PERM_CONFIG = {
  VIEW_ONLY:             { label: 'View Only',       color: '#64748B', bg: '#F8FAFC' },
  VIEW_DOWNLOAD:         { label: 'View & Download', color: '#3B82F6', bg: '#EFF6FF' },
  VIEW_DOWNLOAD_SHARE:   { label: 'Can Share',       color: '#6366F1', bg: '#EEF2FF' },
  FULL_ACCESS:           { label: 'Full Access',     color: '#10B981', bg: '#ECFDF5' },
};
const getPermConfig = (lvl) => PERM_CONFIG[lvl] || PERM_CONFIG.VIEW_ONLY;

const PermChip = ({ level }) => {
  const c = getPermConfig(level);
  return (
    <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.3, borderRadius: '6px', background: c.bg, border: `1px solid ${c.color}25` }}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: c.color }}>{c.label}</Typography>
    </Box>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, title, subtitle, onAdd, disabled }) => (
  <Box sx={{ py: 8, textAlign: 'center' }}>
    <Box sx={{ width: 60, height: 60, borderRadius: '50%', background: '#F1F5F9', mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon sx={{ fontSize: 26, color: '#94A3B8' }} />
    </Box>
    <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>{title}</Typography>
    <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8', mb: 3 }}>{subtitle}</Typography>
    <Button variant="contained" startIcon={<Add sx={{ fontSize: 16 }} />} onClick={onAdd} disabled={disabled}
      sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
      Grant First Permission
    </Button>
  </Box>
);

// ─── Main ─────────────────────────────────────────────────────────────────
const Permissions = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preSelectedMemberId = searchParams.get('member');

  const [tabValue, setTabValue]                   = useState(0);
  const [documentPermissions, setDocumentPermissions] = useState([]);
  const [categoryPermissions, setCategoryPermissions] = useState([]);
  const [categories, setCategories]               = useState([]);
  const [familyMembers, setFamilyMembers]         = useState([]);
  const [documents, setDocuments]                 = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [dialogOpen, setDialogOpen]               = useState(false);
  const [dialogType, setDialogType]               = useState('document');
  const [editingPermission, setEditingPermission] = useState(null);
  const [formData, setFormData] = useState({
    familyMemberId: preSelectedMemberId || '', documentId: '', categoryId: '', permissionLevel: 'VIEW_ONLY',
  });
  const [submitting, setSubmitting] = useState(false);

  const permissionLevels = [
    { value: 'VIEW_ONLY',           label: 'View Only',       description: 'Can only view',                      icon: <Visibility /> },
    { value: 'VIEW_DOWNLOAD',       label: 'View & Download', description: 'Can view and download',               icon: <Download /> },
    { value: 'VIEW_DOWNLOAD_SHARE', label: 'Can Share',       description: 'Can view, download and share',        icon: <Share /> },
    { value: 'FULL_ACCESS',         label: 'Full Access',     description: 'Complete control',                    icon: <LockOpen /> },
  ];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadDocumentPermissions(), loadCategoryPermissions(), loadCategories(), loadFamilyMembers(), loadDocuments()]);
    } catch { toast.error('Failed to load permissions data'); }
    finally { setLoading(false); }
  };

  const loadDocumentPermissions = async () => {
    try {
      const response = await api.get('/permissions/granted/documents');
      if (response.data.success) { setDocumentPermissions(Array.isArray(response.data.data) ? response.data.data : []); return; }
    } catch { /* fallback */ }
    try {
      const fallback = await api.get('/permissions/my-permissions');
      if (fallback.data.success) {
        const data = fallback.data.data;
        const perms = data.documentPermissions || data || [];
        setDocumentPermissions(Array.isArray(perms) ? perms : []);
      } else setDocumentPermissions([]);
    } catch { setDocumentPermissions([]); }
  };

  const loadCategoryPermissions = async () => {
    try {
      const response = await api.get('/permissions/granted/categories');
      if (response.data.success) { setCategoryPermissions(Array.isArray(response.data.data) ? response.data.data : []); return; }
    } catch { /* fallback */ }
    try {
      const fallback = await api.get('/permissions/category-permissions');
      if (fallback.data.success) setCategoryPermissions(Array.isArray(fallback.data.data) ? fallback.data.data : []);
      else setCategoryPermissions([]);
    } catch { setCategoryPermissions([]); }
  };

  const loadCategories = async () => {
    try {
      const r = await api.get('/categories');
      const data = r.data.success ? r.data.data : r.data;
      setCategories(Array.isArray(data) ? data : []);
    } catch { setCategories([]); }
  };

  const loadFamilyMembers = async () => {
    try {
      const r = await api.get('/family-members');
      if (r.data.success) {
        const members = r.data.data;
        setFamilyMembers((Array.isArray(members) ? members : []).filter(
          (m) => m.isSubAccount || m.accountType === 'sub_account'
        ));
      } else setFamilyMembers([]);
    } catch { setFamilyMembers([]); }
  };

  const loadDocuments = async () => {
    try {
      const r = await api.get('/documents?page=0&size=1000');
      if (r.data.success) {
        const data = r.data.data;
        const docs = data.documents || data.content || data || [];
        setDocuments(Array.isArray(docs) ? docs : []);
      } else setDocuments([]);
    } catch { setDocuments([]); }
  };

  const handleOpenDialog = (type, permission = null) => {
    setDialogType(type);
    if (permission) {
      setEditingPermission(permission);
      setFormData({
        familyMemberId: permission.familyMemberId || permission.userId || '',
        documentId: permission.documentId || '', categoryId: permission.categoryId || '',
        permissionLevel: permission.permissionLevel || permission.defaultPermissionLevel || 'VIEW_ONLY',
      });
    } else {
      setEditingPermission(null);
      setFormData({ familyMemberId: preSelectedMemberId || '', documentId: '', categoryId: '', permissionLevel: 'VIEW_ONLY' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false); setEditingPermission(null);
    setFormData({ familyMemberId: preSelectedMemberId || '', documentId: '', categoryId: '', permissionLevel: 'VIEW_ONLY' });
  };

  const handleSubmit = async () => {
    if (!formData.familyMemberId) { toast.error('Please select a family member'); return; }
    if (dialogType === 'document' && !formData.documentId) { toast.error('Please select a document'); return; }
    if (dialogType === 'category' && !formData.categoryId) { toast.error('Please select a category'); return; }
    try {
      setSubmitting(true);
      const payload = { familyMemberId: parseInt(formData.familyMemberId), permissionLevel: formData.permissionLevel };
      if (dialogType === 'document') {
        payload.documentId = parseInt(formData.documentId);
        if (editingPermission) { await api.put(`/permissions/${editingPermission.id}`, payload); toast.success('Updated!'); }
        else { await api.post('/permissions/grant', payload); toast.success('Permission granted!'); }
        await loadDocumentPermissions();
      } else {
        payload.categoryId = parseInt(formData.categoryId);
        if (editingPermission) { await api.put(`/permissions/category/${editingPermission.id}`, payload); toast.success('Updated!'); }
        else { await api.post('/permissions/category/grant', payload); toast.success('Permission granted!'); }
        await loadCategoryPermissions();
      }
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save permission');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (type, permissionId) => {
    if (!window.confirm('Revoke this permission?')) return;
    try {
      if (type === 'document') { await api.delete(`/permissions/${permissionId}`); await loadDocumentPermissions(); }
      else { await api.delete(`/permissions/category/${permissionId}`); await loadCategoryPermissions(); }
      toast.success('Permission revoked!');
    } catch { toast.error('Failed to revoke permission'); }
  };

  const getPermissionLevelLabel = (level) => permissionLevels.find((p) => p.value === level)?.label || level;

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress sx={{ color: '#6366F1' }} />
        </Box>
      </Container>
    );
  }

  // Table header cell style
  const thSx = { fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', background: '#F8FAFC' };

  return (
    <Container maxWidth="lg" sx={{ animation: 'fadeUp 0.35s ease both' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontFamily: "'DM Serif Display', serif", fontSize: { xs: '1.75rem', sm: '2.25rem' },
            fontWeight: 400, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.25 }}>
            Permissions
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
            Control who can access your documents and categories
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<LockReset sx={{ fontSize: 16 }} />}
          onClick={() => navigate('/permissions/revoke')}
          sx={{ borderRadius: '8px', borderColor: '#F59E0B', color: '#D97706',
            '&:hover': { borderColor: '#D97706', background: '#FFFBEB' } }}>
          Revoke Permissions
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { icon: Description, value: documentPermissions.length, label: 'Document Permissions', color: '#6366F1' },
          { icon: CategoryIcon, value: categoryPermissions.length, label: 'Category Permissions', color: '#10B981' },
        ].map((s) => (
          <Grid item xs={12} sm={6} key={s.label}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: '12px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon sx={{ fontSize: 20, color: s.color }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>{s.value}</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: '#64748B' }}>{s.label}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Alerts */}
      {familyMembers.length === 0 && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: '10px', fontSize: '0.85rem' }}>
          No family members with login access. Add sub-account family members to grant them permissions.
        </Alert>
      )}
      {preSelectedMemberId && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '10px', fontSize: '0.85rem' }}>
          Managing permissions for selected family member (ID: {preSelectedMemberId})
        </Alert>
      )}

      {/* Tabs */}
      <Paper elevation={0} sx={{ mb: 2.5, borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}
          sx={{ px: 1,
            '& .MuiTabs-indicator': { background: '#6366F1', borderRadius: 2, height: 2.5 },
            '& .MuiTab-root': { fontSize: '0.85rem', fontWeight: 600, textTransform: 'none', minHeight: 48, color: '#64748B', '&.Mui-selected': { color: '#6366F1' } },
          }}>
          <Tab label="Document Permissions" icon={<Description sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Category Permissions" icon={<CategoryIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Document Permissions */}
      {tabValue === 0 && (
        <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>Document Permissions</Typography>
            <Button variant="contained" size="small" startIcon={<Add sx={{ fontSize: 14 }} />}
              onClick={() => handleOpenDialog('document')} disabled={familyMembers.length === 0}
              sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontSize: '0.8rem' }}>
              Grant Permission
            </Button>
          </Box>
          {documentPermissions.length === 0 ? (
            <EmptyState icon={Security} title="No Document Permissions"
              subtitle="Grant family members access to specific documents"
              onAdd={() => handleOpenDialog('document')} disabled={familyMembers.length === 0} />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={thSx}>Family Member</TableCell>
                    <TableCell sx={thSx}>Document</TableCell>
                    <TableCell sx={thSx}>Permission</TableCell>
                    <TableCell sx={thSx}>Granted On</TableCell>
                    <TableCell sx={{ ...thSx, textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documentPermissions.map((perm) => (
                    <TableRow key={perm.id}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>
                          {perm.userFullName || perm.userEmail || 'Unknown'}
                        </Typography>
                        {perm.userEmail && perm.userFullName && (
                          <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>{perm.userEmail}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.875rem', color: '#0F172A' }}>{perm.documentName || 'Unknown'}</Typography>
                        {perm.categoryName && <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>{perm.categoryName}</Typography>}
                      </TableCell>
                      <TableCell><PermChip level={perm.permissionLevel} /></TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                          {perm.grantedAt ? new Date(perm.grantedAt).toLocaleDateString('en-IN') : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog('document', perm)}
                          sx={{ color: '#6366F1', '&:hover': { background: 'rgba(99,102,241,0.08)' } }}>
                          <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete('document', perm.id)}
                          sx={{ color: '#EF4444', '&:hover': { background: '#FEF2F2' } }}>
                          <Delete sx={{ fontSize: 16 }} />
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

      {/* Category Permissions */}
      {tabValue === 1 && (
        <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>Category Permissions</Typography>
            <Button variant="contained" size="small" startIcon={<Add sx={{ fontSize: 14 }} />}
              onClick={() => handleOpenDialog('category')} disabled={familyMembers.length === 0}
              sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontSize: '0.8rem' }}>
              Grant Permission
            </Button>
          </Box>
          {categoryPermissions.length === 0 ? (
            <EmptyState icon={CategoryIcon} title="No Category Permissions"
              subtitle="Grant family members access to entire document categories"
              onAdd={() => handleOpenDialog('category')} disabled={familyMembers.length === 0} />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={thSx}>Family Member</TableCell>
                    <TableCell sx={thSx}>Category</TableCell>
                    <TableCell sx={thSx}>Permission</TableCell>
                    <TableCell sx={thSx}>Granted On</TableCell>
                    <TableCell sx={{ ...thSx, textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categoryPermissions.map((perm) => (
                    <TableRow key={perm.id}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>
                          {perm.userFullName || perm.userEmail || 'Unknown'}
                        </Typography>
                        {perm.userEmail && perm.userFullName && (
                          <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>{perm.userEmail}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: '1rem' }}>{perm.categoryIcon || '📁'}</Typography>
                          <Typography sx={{ fontSize: '0.875rem', color: '#0F172A' }}>{perm.categoryName || 'Unknown'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><PermChip level={perm.permissionLevel || perm.defaultPermissionLevel} /></TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                          {perm.createdAt ? new Date(perm.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog('category', perm)}
                          sx={{ color: '#6366F1', '&:hover': { background: 'rgba(99,102,241,0.08)' } }}>
                          <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete('category', perm.id)}
                          sx={{ color: '#EF4444', '&:hover': { background: '#FEF2F2' } }}>
                          <Delete sx={{ fontSize: 16 }} />
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}>
        <DialogTitle sx={{ pt: 3, px: 3, fontWeight: 700 }}>
          {editingPermission ? 'Edit Permission' : 'Grant Permission'}
        </DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
            {editingPermission ? (
              <>
                <Box sx={{ p: 2, borderRadius: '10px', background: '#F8F9FC', border: '1px solid #E2E8F0' }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
                    Editing permission for
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>
                    {editingPermission.userFullName || editingPermission.userEmail || 'Unknown member'}
                  </Typography>
                  {editingPermission.userEmail && editingPermission.userFullName && (
                    <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{editingPermission.userEmail}</Typography>
                  )}
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #E2E8F0' }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.25 }}>
                      {dialogType === 'document' ? 'Document' : 'Category'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem', color: '#0F172A' }}>
                      {dialogType === 'document'
                        ? (editingPermission.documentName || 'Unknown document')
                        : (editingPermission.categoryName || 'Unknown category')}
                    </Typography>
                  </Box>
                </Box>
                <FormControl fullWidth required>
                  <InputLabel>Permission Level</InputLabel>
                  <Select value={formData.permissionLevel}
                    onChange={(e) => setFormData({ ...formData, permissionLevel: e.target.value })}
                    label="Permission Level">
                    {permissionLevels.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ color: getPermConfig(p.value).color }}>{p.icon}</Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>{p.label}</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{p.description}</Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : (
              <>
                <FormControl fullWidth required>
                  <InputLabel>Family Member</InputLabel>
                  <Select value={formData.familyMemberId}
                    onChange={(e) => setFormData({ ...formData, familyMemberId: e.target.value })} label="Family Member">
                    {familyMembers.length === 0
                      ? <MenuItem disabled>No sub-account family members available</MenuItem>
                      : familyMembers.map((m) => (
                          <MenuItem key={m.id} value={m.id}>{m.name} ({m.relationship})</MenuItem>
                        ))}
                  </Select>
                </FormControl>

                {dialogType === 'document' ? (
                  <FormControl fullWidth required>
                    <InputLabel>Document</InputLabel>
                    <Select value={formData.documentId}
                      onChange={(e) => setFormData({ ...formData, documentId: e.target.value })} label="Document">
                      {documents.length === 0
                        ? <MenuItem disabled>No documents available</MenuItem>
                        : documents.map((doc) => (
                            <MenuItem key={doc.id} value={doc.id}>
                              <Box>
                                <Typography sx={{ fontSize: '0.875rem' }}>{doc.originalFilename || doc.filename}</Typography>
                                {doc.category && <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>{doc.category.name}</Typography>}
                              </Box>
                            </MenuItem>
                          ))}
                    </Select>
                  </FormControl>
                ) : (
                  <FormControl fullWidth required>
                    <InputLabel>Category</InputLabel>
                    <Select value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} label="Category">
                      {categories.length === 0
                        ? <MenuItem disabled>No categories available</MenuItem>
                        : categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.icon} {c.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}

                <FormControl fullWidth required>
                  <InputLabel>Permission Level</InputLabel>
                  <Select value={formData.permissionLevel}
                    onChange={(e) => setFormData({ ...formData, permissionLevel: e.target.value })} label="Permission Level">
                    {permissionLevels.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ color: getPermConfig(p.value).color }}>{p.icon}</Box>
                          <Box>
                            <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>{p.label}</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{p.description}</Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.85rem' }}>
                  {dialogType === 'document'
                    ? 'This permission allows the selected member to access this specific document.'
                    : 'This permission allows the selected member to access all documents in this category.'}
                </Alert>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={handleCloseDialog} sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}
            sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
            {submitting ? <CircularProgress size={18} sx={{ color: 'white' }} /> : editingPermission ? 'Update' : 'Grant Permission'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Permissions;