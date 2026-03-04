import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Divider,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  Email,
  Phone,
  Cake,
  Badge,
  SupervisorAccount,
  MoreVert,
  Security,
  Lock,
  LockOpen,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const FamilyMembers = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    dateOfBirth: '',
    email: '',
    phoneNumber: '',
    role: 'PROFILE_ONLY',
    username: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const relationships = [
    'Father',
    'Mother',
    'Spouse',
    'Son',
    'Daughter',
    'Brother',
    'Sister',
    'Grandfather',
    'Grandmother',
    'Uncle',
    'Aunt',
    'Cousin',
    'Child',
    'Other',
  ];

  const roles = [
    { value: 'PROFILE_ONLY', label: 'Profile Only (No Login)', description: 'Can be linked to documents but cannot login' },
    { value: 'SUB_ACCOUNT', label: 'Sub Account (Can Login)', description: 'Can login and view their documents' },
  ];

  useEffect(() => {
    loadMembers();
  }, []);

  // ✅ FIX: Derive role from backend response - userId presence = SUB_ACCOUNT
  const deriveRole = (m) => {
    if (m.role === 'PRIMARY_ACCOUNT') return 'PRIMARY_ACCOUNT';
    // Backend family_members has userId field - if present, it's a SUB_ACCOUNT
    if (m.userId || m.user_id) return 'SUB_ACCOUNT';
    return 'PROFILE_ONLY';
  };

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/family-members');
      if (response.data.success) {
        const raw = response.data.data || [];
        const normalized = raw.map((m) => ({ ...m, role: deriveRole(m) }));
        setMembers(normalized);
      }
    } catch (error) {
      console.error('Failed to load family members:', error);
      toast.error('Failed to load family members');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, member) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const handleEditClick = () => {
    handleMenuClose();
    handleOpenDialog(selectedMember);
  };

  const handleManagePermissionsClick = () => {
    handleMenuClose();
    navigate(`/permissions?member=${selectedMember.id}`);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    handleDelete(selectedMember.id);
  };

  const handleOpenDialog = (member = null) => {
    if (member) {
      setEditingMember(member);
      const memberRole = deriveRole(member);

      // ✅ FIX: Pre-fill email and username when editing
      setFormData({
        name: member.name || '',
        relationship: member.relationship || '',
        dateOfBirth: member.dateOfBirth || '',
        email: member.email || '',              // ← FIX: Show existing email
        phoneNumber: member.phoneNumber || '',
        role: memberRole,
        username: member.username || '',         // ← FIX: Show existing username
        password: '',                            // Leave blank - user can change if needed
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: '',
        relationship: '',
        dateOfBirth: '',
        email: '',
        phoneNumber: '',
        role: 'PROFILE_ONLY',
        username: '',
        password: '',
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMember(null);
    setFormData({
      name: '',
      relationship: '',
      dateOfBirth: '',
      email: '',
      phoneNumber: '',
      role: 'PROFILE_ONLY',
      username: '',
      password: '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.relationship) {
      errors.relationship = 'Relationship is required';
    }

    if (formData.role === 'SUB_ACCOUNT') {
      if (!formData.username.trim()) {
        errors.username = 'Username is required for sub accounts';
      }
      if (!editingMember && !formData.password) {
        errors.password = 'Password is required for new sub accounts';
      }
      if (formData.password && formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      errors.phoneNumber = 'Phone number must be 10 digits';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: formData.name.trim(),
        relationship: formData.relationship,
        dateOfBirth: formData.dateOfBirth || null,
        email: formData.email.trim() || null,
        phoneNumber: formData.phoneNumber.trim() || null,
        // ✅ CRITICAL FIX: Send BOTH role fields backend might expect
        role: formData.role,
        accountType: formData.role,  // Some backends use this
        isSubAccount: formData.role === 'SUB_ACCOUNT',
      };

      if (formData.role === 'SUB_ACCOUNT') {
        payload.username = formData.username.trim();
        // Only send password if user entered one
        if (formData.password && formData.password.trim()) {
          payload.password = formData.password;
        }
      }

      let response;
      if (editingMember) {
        response = await api.put(`/family-members/${editingMember.id}`, payload);

        if (response.data.success) {
          toast.success('Family member updated successfully!');
          handleCloseDialog();
          // ✅ FIX: Force full reload to get fresh data from backend
          await loadMembers();
        } else {
          toast.error(response.data.message || 'Failed to update family member');
        }
      } else {
        response = await api.post('/family-members', payload);

        if (response.data.success) {
          toast.success('Family member added successfully!');
          handleCloseDialog();
          await loadMembers();
        } else {
          toast.error(response.data.message || 'Failed to add family member');
        }
      }
    } catch (error) {
      console.error('Failed to save family member:', error);
      const message = error.response?.data?.message || 'Failed to save family member';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this family member?')) {
      return;
    }

    try {
      await api.delete(`/family-members/${memberId}`);
      toast.success('Family member deleted successfully!');
      loadMembers();
    } catch (error) {
      console.error('Failed to delete family member:', error);
      toast.error('Failed to delete family member');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'PRIMARY_ACCOUNT':
        return 'primary';
      case 'SUB_ACCOUNT':
        return 'secondary';
      case 'PROFILE_ONLY':
        return 'default';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'PRIMARY_ACCOUNT':
        return 'Primary Account';
      case 'SUB_ACCOUNT':
        return 'Can Login';
      case 'PROFILE_ONLY':
        return 'Profile Only';
      default:
        return role;
    }
  };

  const getMemberRole = (member) => deriveRole(member);

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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            Family Members
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your family members and their access to documents
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          size="large"
        >
          Add Family Member
        </Button>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Profile Only:</strong> Members without login access - their info is stored for document organization only.
          <br />
          <strong>Sub Account:</strong> Members who can login and view documents shared with them.
        </Typography>
      </Alert>

      {/* Members Grid */}
      {members.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <SupervisorAccount sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Family Members
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Add family members to organize and share documents with them
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
              Add First Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {members.map((member) => {
            const memberRole = getMemberRole(member);
            return (
              <Grid item xs={12} sm={6} md={4} key={member.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {/* Three-dot menu */}
                  <IconButton
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={(e) => handleMenuOpen(e, member)}
                  >
                    <MoreVert />
                  </IconButton>

                  <CardContent sx={{ flex: 1, pt: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Avatar sx={{ width: 56, height: 56, mr: 2, bgcolor: 'primary.main' }}>
                        {member.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {member.name}
                        </Typography>
                        <Chip
                          label={member.relationship}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Badge fontSize="small" color="action" />
                        <Chip
                          label={getRoleLabel(memberRole)}
                          size="small"
                          color={getRoleColor(memberRole)}
                          icon={memberRole === 'SUB_ACCOUNT' ? <LockOpen fontSize="small" /> : <Lock fontSize="small" />}
                        />
                      </Box>

                      {member.email ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {member.email}
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            No email
                          </Typography>
                        </Box>
                      )}

                      {member.phoneNumber && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {member.phoneNumber}
                          </Typography>
                        </Box>
                      )}

                      {member.dateOfBirth && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Cake fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {new Date(member.dateOfBirth).toLocaleDateString('en-IN')}
                          </Typography>
                        </Box>
                      )}

                      {member.username && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            @{member.username}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>

                  <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Added: {member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                    </Typography>
                    {memberRole === 'SUB_ACCOUNT' && (
                      <Chip label="Active" size="small" color="success" />
                    )}
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleManagePermissionsClick}>
          <ListItemIcon>
            <Security fontSize="small" />
          </ListItemIcon>
          <ListItemText>Manage Permissions</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Remove Member</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMember ? 'Edit Family Member' : 'Add Family Member'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            {/* Name */}
            <TextField
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!formErrors.name}
              helperText={formErrors.name}
              fullWidth
              required
            />

            {/* Relationship */}
            <FormControl fullWidth required error={!!formErrors.relationship}>
              <InputLabel>Relationship</InputLabel>
              <Select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                label="Relationship"
              >
                {relationships.map((rel) => (
                  <MenuItem key={rel} value={rel}>
                    {rel}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.relationship && (
                <FormHelperText>{formErrors.relationship}</FormHelperText>
              )}
            </FormControl>

            {/* Date of Birth */}
            <TextField
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            {/* Role */}
            <FormControl fullWidth required>
              <InputLabel>Account Type</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                label="Account Type"
              >
                {roles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    <Box>
                      <Typography variant="body1">{role.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {role.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Sub Account Fields */}
            {formData.role === 'SUB_ACCOUNT' && (
              <>
                <Alert severity="info">
                  Sub accounts can login and view documents shared with them
                </Alert>

                <TextField
                  label="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  error={!!formErrors.username}
                  helperText={formErrors.username || 'Used for login'}
                  fullWidth
                  required
                />

                <TextField
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  error={!!formErrors.password}
                  helperText={
                    formErrors.password ||
                    (editingMember ? 'Leave blank to keep current password' : 'Minimum 6 characters')
                  }
                  fullWidth
                  required={!editingMember}
                />
              </>
            )}

            <Divider />

            {/* Contact Info */}
            <Typography variant="subtitle2" color="text.secondary">
              Contact Information (Optional)
            </Typography>

            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={!!formErrors.email}
              helperText={formErrors.email}
              fullWidth
            />

            <TextField
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              error={!!formErrors.phoneNumber}
              helperText={formErrors.phoneNumber || 'Format: 10 digits'}
              fullWidth
            />
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
            {editingMember ? 'Update' : 'Add'} Member
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FamilyMembers;