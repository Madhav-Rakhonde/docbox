import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button, Paper,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, CircularProgress,
  Alert, Card, CardContent, Grid, Tabs, Tab,
  TextField, InputAdornment, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions,
  Tooltip, FormControl, InputLabel, Select, MenuItem,
  Checkbox, Toolbar, alpha, Divider,
} from '@mui/material';
import {
  LockReset, Security, Description,
  Category as CategoryIcon, Search, DeleteSweep,
  ArrowBack, PersonOff, Warning,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ─── Permission config ─────────────────────────────────────────────────────
const PERM_LEVELS = [
  { value: 'VIEW_ONLY',           label: 'View Only' },
  { value: 'VIEW_DOWNLOAD',       label: 'View & Download' },
  { value: 'VIEW_DOWNLOAD_SHARE', label: 'Can Share' },
  { value: 'FULL_ACCESS',         label: 'Full Access' },
];

const PERM_CONFIG = {
  VIEW_ONLY:             { color: '#64748B', bg: '#F8FAFC' },
  VIEW_DOWNLOAD:         { color: '#3B82F6', bg: '#EFF6FF' },
  VIEW_DOWNLOAD_SHARE:   { color: '#6366F1', bg: '#EEF2FF' },
  FULL_ACCESS:           { color: '#10B981', bg: '#ECFDF5' },
};

const PermChip = ({ level }) => {
  const c = PERM_CONFIG[level] || PERM_CONFIG.VIEW_ONLY;
  const label = PERM_LEVELS.find((p) => p.value === level)?.label || level;
  return (
    <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.3, borderRadius: '6px', background: c.bg, border: `1px solid ${c.color}25` }}>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: c.color }}>{label}</Typography>
    </Box>
  );
};

const thSx = {
  fontSize: '0.72rem', fontWeight: 700, color: '#64748B',
  textTransform: 'uppercase', letterSpacing: '0.07em', background: '#F8FAFC',
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const RevokePermissions = () => {
  const navigate = useNavigate();

  const [tabValue, setTabValue]                     = useState(0);
  const [documentPermissions, setDocumentPermissions] = useState([]);
  const [categoryPermissions, setCategoryPermissions] = useState([]);
  const [loading, setLoading]                       = useState(true);
  const [revoking, setRevoking]                     = useState(false);

  // Filters
  const [searchText, setSearchText]     = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [filterLevel, setFilterLevel]   = useState('');

  // Selection
  const [selectedDocPerms, setSelectedDocPerms] = useState([]);
  const [selectedCatPerms, setSelectedCatPerms] = useState([]);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, permType: null, permId: null, memberName: null });

  useEffect(() => { loadAllPermissions(); }, []);

  const loadAllPermissions = async () => {
    setLoading(true);
    try { await Promise.all([loadDocumentPermissions(), loadCategoryPermissions()]); }
    catch { toast.error('Failed to load permissions'); }
    finally { setLoading(false); }
  };

  const loadDocumentPermissions = async () => {
    try {
      let response;
      try { response = await api.get('/permissions/granted/documents'); }
      catch { response = await api.get('/permissions/my-permissions'); }
      if (response.data.success) {
        const data = response.data.data;
        const perms = data.documentPermissions || data || [];
        setDocumentPermissions(Array.isArray(perms) ? perms : []);
      } else setDocumentPermissions([]);
    } catch { setDocumentPermissions([]); }
  };

  const loadCategoryPermissions = async () => {
    try {
      let response;
      try { response = await api.get('/permissions/granted/categories'); }
      catch { response = await api.get('/permissions/category-permissions'); }
      if (response.data.success) {
        const perms = response.data.data || [];
        setCategoryPermissions(Array.isArray(perms) ? perms : []);
      } else setCategoryPermissions([]);
    } catch { setCategoryPermissions([]); }
  };

  const revokeDocumentPermission = async (id) => {
    try {
      setRevoking(true);
      await api.delete(`/permissions/${id}`);
      toast.success('Document permission revoked!');
      setSelectedDocPerms((prev) => prev.filter((s) => s !== id));
      await loadDocumentPermissions();
    } catch { toast.error('Failed to revoke permission'); }
    finally { setRevoking(false); }
  };

  const revokeCategoryPermission = async (id) => {
    try {
      setRevoking(true);
      await api.delete(`/permissions/category/${id}`);
      toast.success('Category permission revoked!');
      setSelectedCatPerms((prev) => prev.filter((s) => s !== id));
      await loadCategoryPermissions();
    } catch { toast.error('Failed to revoke permission'); }
    finally { setRevoking(false); }
  };

  const revokeSelectedDocuments = async () => {
    try {
      setRevoking(true);
      await Promise.all(selectedDocPerms.map((id) => api.delete(`/permissions/${id}`)));
      toast.success(`${selectedDocPerms.length} document permission(s) revoked!`);
      setSelectedDocPerms([]);
      await loadDocumentPermissions();
    } catch { toast.error('Failed to revoke some permissions'); }
    finally { setRevoking(false); }
  };

  const revokeSelectedCategories = async () => {
    try {
      setRevoking(true);
      await Promise.all(selectedCatPerms.map((id) => api.delete(`/permissions/category/${id}`)));
      toast.success(`${selectedCatPerms.length} category permission(s) revoked!`);
      setSelectedCatPerms([]);
      await loadCategoryPermissions();
    } catch { toast.error('Failed to revoke some permissions'); }
    finally { setRevoking(false); }
  };

  const revokeAllForMember = async (userId) => {
    try {
      setRevoking(true);
      const docIds = documentPermissions.filter((p) => p.userId === userId).map((p) => p.id);
      const catIds = categoryPermissions.filter((p) => p.userId === userId).map((p) => p.id);
      await Promise.all([
        ...docIds.map((id) => api.delete(`/permissions/${id}`)),
        ...catIds.map((id) => api.delete(`/permissions/category/${id}`)),
      ]);
      toast.success('All permissions revoked!');
      await loadAllPermissions();
    } catch { toast.error('Failed to revoke permissions'); }
    finally { setRevoking(false); }
  };

  const handleConfirm = async () => {
    const { type, permType, permId, userId } = confirmDialog;
    setConfirmDialog({ open: false });
    if (type === 'single') {
      if (permType === 'document') await revokeDocumentPermission(permId);
      else await revokeCategoryPermission(permId);
    } else if (type === 'bulk') {
      if (permType === 'document') await revokeSelectedDocuments();
      else await revokeSelectedCategories();
    } else if (type === 'member') {
      await revokeAllForMember(userId);
    }
  };

  const toggleDocPerm = (id) => setSelectedDocPerms((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleCatPerm = (id) => setSelectedCatPerms((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const selectAllDoc  = (filtered) => {
    const ids = filtered.map((p) => p.id);
    setSelectedDocPerms((prev) => ids.every((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };
  const selectAllCat  = (filtered) => {
    const ids = filtered.map((p) => p.id);
    setSelectedCatPerms((prev) => ids.every((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };

  const applyFilters = (list, type) =>
    list.filter((p) => {
      const name    = (p.userFullName || p.userEmail || '').toLowerCase();
      const docName = type === 'document' ? (p.documentName || '').toLowerCase() : '';
      const catName = type === 'category' ? (p.categoryName || '').toLowerCase() : '';
      const level   = p.permissionLevel || p.defaultPermissionLevel || '';
      const matchSearch = !searchText || name.includes(searchText.toLowerCase()) || docName.includes(searchText.toLowerCase()) || catName.includes(searchText.toLowerCase());
      const matchMember = !filterMember || name.includes(filterMember.toLowerCase());
      const matchLevel  = !filterLevel  || level === filterLevel;
      return matchSearch && matchMember && matchLevel;
    });

  const allMembers = [
    ...new Map(
      [...documentPermissions, ...categoryPermissions].map((p) => [
        p.userId, { id: p.userId, name: p.userFullName || p.userEmail || 'Unknown' },
      ])
    ).values(),
  ];

  const memberSummary = allMembers.map((m) => ({
    ...m,
    docCount: documentPermissions.filter((p) => p.userId === m.id).length,
    catCount: categoryPermissions.filter((p) => p.userId === m.id).length,
  }));

  const filteredDocPerms = applyFilters(documentPermissions, 'document');
  const filteredCatPerms = applyFilters(categoryPermissions, 'category');
  const allDocSelected   = filteredDocPerms.length > 0 && filteredDocPerms.every((p) => selectedDocPerms.includes(p.id));
  const allCatSelected   = filteredCatPerms.length > 0 && filteredCatPerms.every((p) => selectedCatPerms.includes(p.id));

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
        <Button startIcon={<ArrowBack sx={{ fontSize: 16 }} />} onClick={() => navigate('/permissions')}
          sx={{ mb: 2, borderRadius: '8px', color: '#475569', '&:hover': { background: '#F1F5F9' } }}>
          Back to Permissions
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LockReset sx={{ fontSize: 24, color: '#EF4444' }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: "'DM Serif Display', serif", fontSize: { xs: '1.75rem', sm: '2.25rem' },
              fontWeight: 400, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.25 }}>
              Revoke Permissions
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
              Remove access you've previously granted to family members
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Warning */}
      <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px', fontSize: '0.875rem', border: '1px solid #FDE68A' }}
        icon={<Warning sx={{ fontSize: 18 }} />}>
        Revoking a permission immediately removes the family member's access. This cannot be undone automatically — you would need to re-grant the permission.
      </Alert>

      {/* Member Overview */}
      {memberSummary.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', mb: 1.5 }}>
            Members with Active Permissions
          </Typography>
          <Grid container spacing={2}>
            {memberSummary.map((member) => (
              <Grid item xs={12} sm={6} md={4} key={member.id}>
                <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0',
                  transition: 'box-shadow 200ms', '&:hover': { boxShadow: '0 4px 12px rgba(15,23,42,0.08)' } }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>{member.name}</Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8', mt: 0.25 }}>
                          {member.docCount} doc{member.docCount !== 1 ? 's' : ''} · {member.catCount} {member.catCount !== 1 ? 'categories' : 'category'}
                        </Typography>
                      </Box>
                      <Tooltip title={`Revoke ALL permissions for ${member.name}`}>
                        <IconButton size="small" color="error" disabled={revoking}
                          onClick={() => setConfirmDialog({ open: true, type: 'member', userId: member.id, memberName: member.name })}
                          sx={{ '&:hover': { background: '#FEF2F2' } }}>
                          <PersonOff sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5, flexWrap: 'wrap' }}>
                      {member.docCount > 0 && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.25, borderRadius: '4px', background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                          <Description sx={{ fontSize: 11, color: '#6366F1' }} />
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#6366F1' }}>{member.docCount} docs</Typography>
                        </Box>
                      )}
                      {member.catCount > 0 && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.25, borderRadius: '4px', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                          <CategoryIcon sx={{ fontSize: 11, color: '#10B981' }} />
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#10B981' }}>{member.catCount} cats</Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: '14px', border: '1px solid #E2E8F0' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField fullWidth size="small" placeholder="Search by member name or document..."
              value={searchText} onChange={(e) => setSearchText(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Permission Level</InputLabel>
              <Select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} label="Filter by Permission Level">
                <MenuItem value="">All Levels</MenuItem>
                {PERM_LEVELS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button fullWidth variant="outlined" onClick={() => { setSearchText(''); setFilterMember(''); setFilterLevel(''); }}
              sx={{ borderRadius: '8px', borderColor: '#E2E8F0', color: '#475569', '&:hover': { borderColor: '#6366F1', color: '#6366F1' } }}>
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper elevation={0} sx={{ mb: 2.5, borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}
          sx={{ px: 1,
            '& .MuiTabs-indicator': { background: '#EF4444', borderRadius: 2, height: 2.5 },
            '& .MuiTab-root': { fontSize: '0.82rem', fontWeight: 600, textTransform: 'none', minHeight: 48,
              color: '#64748B', '&.Mui-selected': { color: '#EF4444' } },
          }}>
          <Tab label={`Document Permissions (${documentPermissions.length})`} icon={<Description sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label={`Category Permissions (${categoryPermissions.length})`} icon={<CategoryIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ── DOCUMENT PERMISSIONS ── */}
      {tabValue === 0 && (
        <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {selectedDocPerms.length > 0 && (
            <Toolbar sx={{ bgcolor: (t) => alpha(t.palette.error.main, 0.06), borderBottom: '1px solid #F1F5F9', minHeight: '52px !important' }}>
              <Typography sx={{ flex: 1, fontWeight: 700, fontSize: '0.875rem', color: '#EF4444' }}>
                {selectedDocPerms.length} permission(s) selected
              </Typography>
              <Button variant="contained" color="error" size="small" startIcon={<DeleteSweep sx={{ fontSize: 16 }} />}
                onClick={() => setConfirmDialog({ open: true, type: 'bulk', permType: 'document' })}
                disabled={revoking} sx={{ borderRadius: '8px', fontSize: '0.8rem' }}>
                Revoke Selected
              </Button>
            </Toolbar>
          )}

          {filteredDocPerms.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '50%', background: '#F1F5F9', mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Security sx={{ fontSize: 24, color: '#94A3B8' }} />
              </Box>
              <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.25 }}>No Document Permissions</Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>
                {documentPermissions.length === 0 ? 'You have not granted any document permissions yet.' : 'No permissions match your filters.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ background: '#F8FAFC' }}>
                      <Checkbox size="small" checked={allDocSelected}
                        indeterminate={selectedDocPerms.length > 0 && !allDocSelected}
                        onChange={() => selectAllDoc(filteredDocPerms)}
                        sx={{ color: '#CBD5E1', '&.Mui-checked': { color: '#EF4444' }, '&.MuiCheckbox-indeterminate': { color: '#EF4444' } }} />
                    </TableCell>
                    <TableCell sx={thSx}>Family Member</TableCell>
                    <TableCell sx={thSx}>Document</TableCell>
                    <TableCell sx={thSx}>Category</TableCell>
                    <TableCell sx={thSx}>Permission</TableCell>
                    <TableCell sx={thSx}>Granted On</TableCell>
                    <TableCell sx={{ ...thSx, textAlign: 'center' }}>Revoke</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDocPerms.map((perm) => (
                    <TableRow key={perm.id} hover selected={selectedDocPerms.includes(perm.id)}
                      sx={{ '&.Mui-selected': { bgcolor: (t) => alpha(t.palette.error.main, 0.03) } }}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={selectedDocPerms.includes(perm.id)} onChange={() => toggleDocPerm(perm.id)}
                          sx={{ color: '#CBD5E1', '&.Mui-checked': { color: '#EF4444' } }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>{perm.userFullName || 'Unknown'}</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>{perm.userEmail || ''}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.875rem', color: '#0F172A' }}>{perm.documentName || 'Unknown'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>{perm.categoryName || '—'}</Typography>
                      </TableCell>
                      <TableCell><PermChip level={perm.permissionLevel} /></TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                          {perm.grantedAt ? new Date(perm.grantedAt).toLocaleDateString('en-IN') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Revoke this permission">
                          <IconButton size="small" color="error" disabled={revoking}
                            onClick={() => setConfirmDialog({ open: true, type: 'single', permType: 'document', permId: perm.id, memberName: perm.userFullName || perm.userEmail })}
                            sx={{ '&:hover': { background: '#FEF2F2' } }}>
                            <LockReset sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ── CATEGORY PERMISSIONS ── */}
      {tabValue === 1 && (
        <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {selectedCatPerms.length > 0 && (
            <Toolbar sx={{ bgcolor: (t) => alpha(t.palette.error.main, 0.06), borderBottom: '1px solid #F1F5F9', minHeight: '52px !important' }}>
              <Typography sx={{ flex: 1, fontWeight: 700, fontSize: '0.875rem', color: '#EF4444' }}>
                {selectedCatPerms.length} permission(s) selected
              </Typography>
              <Button variant="contained" color="error" size="small" startIcon={<DeleteSweep sx={{ fontSize: 16 }} />}
                onClick={() => setConfirmDialog({ open: true, type: 'bulk', permType: 'category' })}
                disabled={revoking} sx={{ borderRadius: '8px', fontSize: '0.8rem' }}>
                Revoke Selected
              </Button>
            </Toolbar>
          )}

          {filteredCatPerms.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '50%', background: '#F1F5F9', mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Security sx={{ fontSize: 24, color: '#94A3B8' }} />
              </Box>
              <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.25 }}>No Category Permissions</Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8' }}>
                {categoryPermissions.length === 0 ? 'You have not granted any category permissions yet.' : 'No permissions match your filters.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ background: '#F8FAFC' }}>
                      <Checkbox size="small" checked={allCatSelected}
                        indeterminate={selectedCatPerms.length > 0 && !allCatSelected}
                        onChange={() => selectAllCat(filteredCatPerms)}
                        sx={{ color: '#CBD5E1', '&.Mui-checked': { color: '#EF4444' }, '&.MuiCheckbox-indeterminate': { color: '#EF4444' } }} />
                    </TableCell>
                    <TableCell sx={thSx}>Family Member</TableCell>
                    <TableCell sx={thSx}>Category</TableCell>
                    <TableCell sx={thSx}>Permission</TableCell>
                    <TableCell sx={thSx}>Granted On</TableCell>
                    <TableCell sx={{ ...thSx, textAlign: 'center' }}>Revoke</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCatPerms.map((perm) => (
                    <TableRow key={perm.id} hover selected={selectedCatPerms.includes(perm.id)}
                      sx={{ '&.Mui-selected': { bgcolor: (t) => alpha(t.palette.error.main, 0.03) } }}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={selectedCatPerms.includes(perm.id)} onChange={() => toggleCatPerm(perm.id)}
                          sx={{ color: '#CBD5E1', '&.Mui-checked': { color: '#EF4444' } }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>{perm.userFullName || 'Unknown'}</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>{perm.userEmail || ''}</Typography>
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
                          {perm.createdAt ? new Date(perm.createdAt).toLocaleDateString('en-IN') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Revoke this permission">
                          <IconButton size="small" color="error" disabled={revoking}
                            onClick={() => setConfirmDialog({ open: true, type: 'single', permType: 'category', permId: perm.id, memberName: perm.userFullName || perm.userEmail })}
                            sx={{ '&:hover': { background: '#FEF2F2' } }}>
                            <LockReset sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false })} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}>
        <DialogTitle sx={{ pt: 3, px: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Warning sx={{ fontSize: 18, color: '#EF4444' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>Confirm Revoke</Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <DialogContentText sx={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.7 }}>
            {confirmDialog.type === 'single' && (
              <>Are you sure you want to revoke the <strong>{confirmDialog.permType}</strong> permission for <strong style={{ color: '#0F172A' }}>{confirmDialog.memberName || 'this member'}</strong>?</>
            )}
            {confirmDialog.type === 'bulk' && (
              <>Are you sure you want to revoke <strong style={{ color: '#0F172A' }}>{confirmDialog.permType === 'document' ? selectedDocPerms.length : selectedCatPerms.length}</strong> selected {confirmDialog.permType} permission(s)?</>
            )}
            {confirmDialog.type === 'member' && (
              <>Are you sure you want to revoke <strong style={{ color: '#0F172A' }}>ALL</strong> permissions for <strong style={{ color: '#0F172A' }}>{confirmDialog.memberName}</strong>? This includes all document and category permissions.</>
            )}
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2, borderRadius: '10px', fontSize: '0.83rem' }} icon={false}>
            This will immediately remove the member's access.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setConfirmDialog({ open: false })}
            sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirm} disabled={revoking}
            startIcon={revoking ? <CircularProgress size={16} color="inherit" /> : <LockReset sx={{ fontSize: 16 }} />}
            sx={{ borderRadius: '8px', background: '#EF4444', '&:hover': { background: '#DC2626' } }}>
            {revoking ? 'Revoking…' : 'Yes, Revoke'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RevokePermissions;