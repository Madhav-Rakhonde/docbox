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
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Toolbar,
  alpha,
} from '@mui/material';
import {
  LockReset,
  Security,
  Description,
  Category as CategoryIcon,
  Search,
  DeleteSweep,
  ArrowBack,
  PersonOff,
  CheckBox,
  CheckBoxOutlineBlank,
  Warning,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const RevokePermissions = () => {
  const navigate = useNavigate();

  const [tabValue, setTabValue] = useState(0);
  const [documentPermissions, setDocumentPermissions] = useState([]);
  const [categoryPermissions, setCategoryPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  // Selection for bulk revoke
  const [selectedDocPerms, setSelectedDocPerms] = useState([]);
  const [selectedCatPerms, setSelectedCatPerms] = useState([]);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: null,       // 'single' | 'bulk' | 'member'
    permType: null,   // 'document' | 'category'
    permId: null,
    memberName: null,
  });

  const permissionLevels = [
    { value: 'VIEW_ONLY', label: 'View Only' },
    { value: 'VIEW_DOWNLOAD', label: 'View & Download' },
    { value: 'VIEW_DOWNLOAD_SHARE', label: 'Can Share' },
    { value: 'FULL_ACCESS', label: 'Full Access' },
  ];

  useEffect(() => {
    loadAllPermissions();
  }, []);

  const loadAllPermissions = async () => {
    setLoading(true);
    try {
      await Promise.all([loadDocumentPermissions(), loadCategoryPermissions()]);
    } catch (e) {
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentPermissions = async () => {
    try {
      // Try new granted endpoint first, fall back to original
      let response;
      try {
        response = await api.get('/permissions/granted/documents');
      } catch {
        response = await api.get('/permissions/my-permissions');
      }
      if (response.data.success) {
        const data = response.data.data;
        const perms = data.documentPermissions || data || [];
        setDocumentPermissions(Array.isArray(perms) ? perms : []);
      } else {
        setDocumentPermissions([]);
      }
    } catch (e) {
      console.error('Failed to load document permissions:', e);
      setDocumentPermissions([]);
    }
  };

  const loadCategoryPermissions = async () => {
    try {
      let response;
      try {
        response = await api.get('/permissions/granted/categories');
      } catch {
        response = await api.get('/permissions/category-permissions');
      }
      if (response.data.success) {
        const perms = response.data.data || [];
        setCategoryPermissions(Array.isArray(perms) ? perms : []);
      } else {
        setCategoryPermissions([]);
      }
    } catch (e) {
      console.error('Failed to load category permissions:', e);
      setCategoryPermissions([]);
    }
  };

  // ── Revoke single permission ──────────────────────────────────────────────
  const revokeDocumentPermission = async (id) => {
    try {
      setRevoking(true);
      await api.delete(`/permissions/${id}`);
      toast.success('Document permission revoked!');
      setSelectedDocPerms((prev) => prev.filter((s) => s !== id));
      await loadDocumentPermissions();
    } catch (e) {
      toast.error('Failed to revoke permission');
    } finally {
      setRevoking(false);
    }
  };

  const revokeCategoryPermission = async (id) => {
    try {
      setRevoking(true);
      await api.delete(`/permissions/category/${id}`);
      toast.success('Category permission revoked!');
      setSelectedCatPerms((prev) => prev.filter((s) => s !== id));
      await loadCategoryPermissions();
    } catch (e) {
      toast.error('Failed to revoke permission');
    } finally {
      setRevoking(false);
    }
  };

  // ── Bulk revoke selected ──────────────────────────────────────────────────
  const revokeSelectedDocuments = async () => {
    try {
      setRevoking(true);
      await Promise.all(selectedDocPerms.map((id) => api.delete(`/permissions/${id}`)));
      toast.success(`${selectedDocPerms.length} document permission(s) revoked!`);
      setSelectedDocPerms([]);
      await loadDocumentPermissions();
    } catch (e) {
      toast.error('Failed to revoke some permissions');
    } finally {
      setRevoking(false);
    }
  };

  const revokeSelectedCategories = async () => {
    try {
      setRevoking(true);
      await Promise.all(selectedCatPerms.map((id) => api.delete(`/permissions/category/${id}`)));
      toast.success(`${selectedCatPerms.length} category permission(s) revoked!`);
      setSelectedCatPerms([]);
      await loadCategoryPermissions();
    } catch (e) {
      toast.error('Failed to revoke some permissions');
    } finally {
      setRevoking(false);
    }
  };

  // ── Revoke ALL permissions for a specific member ──────────────────────────
  const revokeAllForMember = async (userId) => {
    try {
      setRevoking(true);
      const docIds = documentPermissions
        .filter((p) => p.userId === userId)
        .map((p) => p.id);
      const catIds = categoryPermissions
        .filter((p) => p.userId === userId)
        .map((p) => p.id);

      await Promise.all([
        ...docIds.map((id) => api.delete(`/permissions/${id}`)),
        ...catIds.map((id) => api.delete(`/permissions/category/${id}`)),
      ]);

      toast.success(`All permissions revoked for this member!`);
      await loadAllPermissions();
    } catch (e) {
      toast.error('Failed to revoke permissions');
    } finally {
      setRevoking(false);
    }
  };

  // ── Confirm dialog handler ────────────────────────────────────────────────
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

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleDocPerm = (id) => {
    setSelectedDocPerms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleCatPerm = (id) => {
    setSelectedCatPerms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const selectAllDoc = (filtered) => {
    const ids = filtered.map((p) => p.id);
    setSelectedDocPerms((prev) =>
      ids.every((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };
  const selectAllCat = (filtered) => {
    const ids = filtered.map((p) => p.id);
    setSelectedCatPerms((prev) =>
      ids.every((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const applyFilters = (list, type) => {
    return list.filter((p) => {
      const name = (p.userFullName || p.userEmail || '').toLowerCase();
      const docName = type === 'document' ? (p.documentName || '').toLowerCase() : '';
      const catName = type === 'category' ? (p.categoryName || '').toLowerCase() : '';
      const level = p.permissionLevel || p.defaultPermissionLevel || '';

      const matchSearch =
        !searchText ||
        name.includes(searchText.toLowerCase()) ||
        docName.includes(searchText.toLowerCase()) ||
        catName.includes(searchText.toLowerCase());

      const matchMember = !filterMember || name.includes(filterMember.toLowerCase());
      const matchLevel = !filterLevel || level === filterLevel;

      return matchSearch && matchMember && matchLevel;
    });
  };

  // ── Unique members list ───────────────────────────────────────────────────
  const allMembers = [
    ...new Map(
      [...documentPermissions, ...categoryPermissions].map((p) => [
        p.userId,
        { id: p.userId, name: p.userFullName || p.userEmail || 'Unknown' },
      ])
    ).values(),
  ];

  // ── Per-member summary ────────────────────────────────────────────────────
  const memberSummary = allMembers.map((m) => ({
    ...m,
    docCount: documentPermissions.filter((p) => p.userId === m.id).length,
    catCount: categoryPermissions.filter((p) => p.userId === m.id).length,
  }));

  const getPermissionColor = (level) => {
    switch (level) {
      case 'VIEW_ONLY': return 'default';
      case 'VIEW_DOWNLOAD': return 'primary';
      case 'VIEW_DOWNLOAD_SHARE': return 'secondary';
      case 'FULL_ACCESS': return 'success';
      default: return 'default';
    }
  };
  const getPermissionLabel = (level) => {
    const p = permissionLevels.find((x) => x.value === level);
    return p ? p.label : level;
  };

  const filteredDocPerms = applyFilters(documentPermissions, 'document');
  const filteredCatPerms = applyFilters(categoryPermissions, 'category');
  const allDocSelected =
    filteredDocPerms.length > 0 && filteredDocPerms.every((p) => selectedDocPerms.includes(p.id));
  const allCatSelected =
    filteredCatPerms.length > 0 && filteredCatPerms.every((p) => selectedCatPerms.includes(p.id));

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
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/permissions')}
          sx={{ mb: 2 }}
        >
          Back to Permissions
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LockReset sx={{ fontSize: 36, color: 'error.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={600}>
              Revoke Permissions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Remove access you've previously granted to family members
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Warning Banner */}
      <Alert severity="warning" sx={{ mb: 4 }} icon={<Warning />}>
        Revoking a permission immediately removes the family member's access. This action cannot be undone automatically — you would need to re-grant the permission.
      </Alert>

      {/* Member Overview Cards */}
      {memberSummary.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            Members with Active Permissions
          </Typography>
          <Grid container spacing={2}>
            {memberSummary.map((member) => (
              <Grid item xs={12} sm={6} md={4} key={member.id}>
                <Card variant="outlined" sx={{ position: 'relative' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {member.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {member.docCount} document{member.docCount !== 1 ? 's' : ''} •{' '}
                          {member.catCount} categor{member.catCount !== 1 ? 'ies' : 'y'}
                        </Typography>
                      </Box>
                      <Tooltip title={`Revoke ALL permissions for ${member.name}`}>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() =>
                            setConfirmDialog({
                              open: true,
                              type: 'member',
                              userId: member.id,
                              memberName: member.name,
                            })
                          }
                          disabled={revoking}
                        >
                          <PersonOff />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                      {member.docCount > 0 && (
                        <Chip
                          icon={<Description sx={{ fontSize: 14 }} />}
                          label={`${member.docCount} docs`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      {member.catCount > 0 && (
                        <Chip
                          icon={<CategoryIcon sx={{ fontSize: 14 }} />}
                          label={`${member.catCount} cats`}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
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
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by member name or document..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
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
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Permission Level</InputLabel>
              <Select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                label="Filter by Permission Level"
              >
                <MenuItem value="">All Levels</MenuItem>
                {permissionLevels.map((p) => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => { setSearchText(''); setFilterMember(''); setFilterLevel(''); }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab
            label={`Document Permissions (${documentPermissions.length})`}
            icon={<Description />}
            iconPosition="start"
          />
          <Tab
            label={`Category Permissions (${categoryPermissions.length})`}
            icon={<CategoryIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* ── DOCUMENT PERMISSIONS TAB ── */}
      {tabValue === 0 && (
        <Paper>
          {/* Bulk Action Toolbar */}
          {selectedDocPerms.length > 0 && (
            <Toolbar
              sx={{
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ flex: 1 }} color="error" fontWeight={600}>
                {selectedDocPerms.length} permission(s) selected
              </Typography>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteSweep />}
                onClick={() =>
                  setConfirmDialog({ open: true, type: 'bulk', permType: 'document' })
                }
                disabled={revoking}
              >
                Revoke Selected
              </Button>
            </Toolbar>
          )}

          {filteredDocPerms.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Security sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6">No Document Permissions</Typography>
              <Typography variant="body2" color="text.secondary">
                {documentPermissions.length === 0
                  ? 'You have not granted any document permissions yet.'
                  : 'No permissions match your current filters.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allDocSelected}
                        indeterminate={
                          selectedDocPerms.length > 0 && !allDocSelected
                        }
                        onChange={() => selectAllDoc(filteredDocPerms)}
                      />
                    </TableCell>
                    <TableCell><strong>Family Member</strong></TableCell>
                    <TableCell><strong>Document</strong></TableCell>
                    <TableCell><strong>Category</strong></TableCell>
                    <TableCell><strong>Permission Level</strong></TableCell>
                    <TableCell><strong>Granted On</strong></TableCell>
                    <TableCell align="center"><strong>Revoke</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDocPerms.map((perm) => (
                    <TableRow
                      key={perm.id}
                      hover
                      selected={selectedDocPerms.includes(perm.id)}
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: (theme) => alpha(theme.palette.error.main, 0.04),
                        },
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedDocPerms.includes(perm.id)}
                          onChange={() => toggleDocPerm(perm.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {perm.userFullName || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {perm.userEmail || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{perm.documentName || 'Unknown'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {perm.categoryName || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getPermissionLabel(perm.permissionLevel)}
                          color={getPermissionColor(perm.permissionLevel)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {perm.grantedAt
                            ? new Date(perm.grantedAt).toLocaleDateString('en-IN')
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Revoke this permission">
                          <IconButton
                            color="error"
                            size="small"
                            disabled={revoking}
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                type: 'single',
                                permType: 'document',
                                permId: perm.id,
                                memberName: perm.userFullName || perm.userEmail,
                              })
                            }
                          >
                            <LockReset />
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

      {/* ── CATEGORY PERMISSIONS TAB ── */}
      {tabValue === 1 && (
        <Paper>
          {/* Bulk Action Toolbar */}
          {selectedCatPerms.length > 0 && (
            <Toolbar
              sx={{
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ flex: 1 }} color="error" fontWeight={600}>
                {selectedCatPerms.length} permission(s) selected
              </Typography>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteSweep />}
                onClick={() =>
                  setConfirmDialog({ open: true, type: 'bulk', permType: 'category' })
                }
                disabled={revoking}
              >
                Revoke Selected
              </Button>
            </Toolbar>
          )}

          {filteredCatPerms.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Security sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6">No Category Permissions</Typography>
              <Typography variant="body2" color="text.secondary">
                {categoryPermissions.length === 0
                  ? 'You have not granted any category permissions yet.'
                  : 'No permissions match your current filters.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allCatSelected}
                        indeterminate={
                          selectedCatPerms.length > 0 && !allCatSelected
                        }
                        onChange={() => selectAllCat(filteredCatPerms)}
                      />
                    </TableCell>
                    <TableCell><strong>Family Member</strong></TableCell>
                    <TableCell><strong>Category</strong></TableCell>
                    <TableCell><strong>Permission Level</strong></TableCell>
                    <TableCell><strong>Granted On</strong></TableCell>
                    <TableCell align="center"><strong>Revoke</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCatPerms.map((perm) => (
                    <TableRow
                      key={perm.id}
                      hover
                      selected={selectedCatPerms.includes(perm.id)}
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: (theme) => alpha(theme.palette.error.main, 0.04),
                        },
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedCatPerms.includes(perm.id)}
                          onChange={() => toggleCatPerm(perm.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {perm.userFullName || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {perm.userEmail || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{perm.categoryIcon || '📁'}</span>
                          <Typography variant="body2">{perm.categoryName || 'Unknown'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getPermissionLabel(perm.permissionLevel || perm.defaultPermissionLevel)}
                          color={getPermissionColor(perm.permissionLevel || perm.defaultPermissionLevel)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {perm.createdAt
                            ? new Date(perm.createdAt).toLocaleDateString('en-IN')
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Revoke this permission">
                          <IconButton
                            color="error"
                            size="small"
                            disabled={revoking}
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                type: 'single',
                                permType: 'category',
                                permId: perm.id,
                                memberName: perm.userFullName || perm.userEmail,
                              })
                            }
                          >
                            <LockReset />
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

      {/* ── CONFIRM DIALOG ── */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <Warning color="error" /> Confirm Revoke
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.type === 'single' && (
              <>
                Are you sure you want to revoke the{' '}
                <strong>{confirmDialog.permType}</strong> permission for{' '}
                <strong>{confirmDialog.memberName || 'this member'}</strong>?
              </>
            )}
            {confirmDialog.type === 'bulk' && (
              <>
                Are you sure you want to revoke{' '}
                <strong>
                  {confirmDialog.permType === 'document'
                    ? selectedDocPerms.length
                    : selectedCatPerms.length}
                </strong>{' '}
                selected {confirmDialog.permType} permission(s)?
              </>
            )}
            {confirmDialog.type === 'member' && (
              <>
                Are you sure you want to revoke <strong>ALL</strong> permissions for{' '}
                <strong>{confirmDialog.memberName}</strong>? This includes all document and category permissions.
              </>
            )}
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }} icon={false}>
            This will immediately remove the member's access.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDialog({ open: false })}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirm}
            disabled={revoking}
            startIcon={revoking ? <CircularProgress size={18} color="inherit" /> : <LockReset />}
          >
            {revoking ? 'Revoking...' : 'Yes, Revoke'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RevokePermissions;