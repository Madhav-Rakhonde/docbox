import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Alert,
  Divider,
} from '@mui/material';
import { PersonAdd, People } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import MemberCard from '../components/Family/MemberCard';
import AddMemberDialog from '../components/Family/AddMemberDialog';
import api from '../services/api';

const Family = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
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

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/family-members');
      if (response.data.success) {
        setMembers(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load family members:', error);
      toast.error('Failed to load family members');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Real edit handler - NO MORE "COMING SOON"!
  const handleEdit = (member) => {
    setSelectedMember(member);
    setFormData({
      name: member.name || '',
      relationship: member.relationship || '',
      dateOfBirth: member.dateOfBirth || '',
      email: member.email || '',
      phoneNumber: member.phoneNumber || '',
      role: member.role || 'PROFILE_ONLY',
      username: member.username || '',
      password: '',
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (member) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMember) return;

    try {
      const response = await api.delete(`/family-members/${selectedMember.id}`);
      if (response.data.success) {
        toast.success('Family member removed successfully');
        setDeleteDialogOpen(false);
        setSelectedMember(null);
        loadMembers();
      } else {
        toast.error(response.data.message || 'Failed to remove member');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  // ✅ FIXED: Real permissions handler - NO MORE "COMING SOON"!
  const handleManagePermissions = (member) => {
    navigate(`/permissions?member=${member.id}`);
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
      if (!selectedMember && !formData.password) {
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

  const handleEditSubmit = async () => {
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
        role: formData.role,
      };

      if (formData.role === 'SUB_ACCOUNT') {
        payload.username = formData.username.trim();
        if (formData.password) {
          payload.password = formData.password;
        }
      }

      const response = await api.put(`/family-members/${selectedMember.id}`, payload);
      
      if (response.data.success) {
        toast.success('Family member updated successfully!');
        setEditDialogOpen(false);
        setSelectedMember(null);
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
        loadMembers();
      }
    } catch (error) {
      console.error('Failed to update family member:', error);
      const message = error.response?.data?.message || 'Failed to update family member';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Family Members
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage family members and their document access
        </Typography>
      </Box>

      {/* Add Member Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setAddDialogOpen(true)}
          size="large"
        >
          Add Family Member
        </Button>
      </Box>

      {/* Members Grid */}
      {members.length > 0 ? (
        <Grid container spacing={3}>
          {members.map((member) => (
            <Grid item xs={12} sm={6} md={4} key={member.id}>
              <MemberCard
                member={member}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onManagePermissions={handleManagePermissions}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            border: 2,
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <People sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No family members yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add family members to share and manage documents together
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Your First Member
          </Button>
        </Box>
      )}

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={loadMembers}
      />

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Family Member</DialogTitle>
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
                  helperText={formErrors.password || 'Leave blank to keep current password'}
                  fullWidth
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
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEditSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            Update Member
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Remove Family Member?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove {selectedMember?.name}? They will lose access to
            shared documents.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Family;