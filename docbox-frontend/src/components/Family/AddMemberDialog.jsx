import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Divider,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

const AddMemberDialog = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    relationship: '',
    dateOfBirth: '',
    accountType: 'profile_only',
    password: '',
  });

  const relationships = [
    'Spouse',
    'Child',
    'Parent',
    'Sibling',
    'Grandparent',
    'Grandchild',
    'Father',
    'Mother',
    'Son',
    'Daughter',
    'Brother',
    'Sister',
    'Uncle',
    'Aunt',
    'Cousin',
    'Other',
  ];

  const accountTypes = [
    {
      value: 'profile_only',
      label: 'Profile Only (No Login)',
      description: 'Can be linked to documents but cannot login',
    },
    {
      value: 'sub_account',
      label: 'Sub Account (Can Login)',
      description: 'Can login and view their documents using email',
    },
  ];

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateForm = () => {
    // Required field validation
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return false;
    }

    if (!formData.relationship) {
      toast.error('Relationship is required');
      return false;
    }

    // Sub-account specific validation
    if (formData.accountType === 'sub_account') {
      if (!formData.email.trim()) {
        toast.error('Email is required for sub accounts');
        return false;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        toast.error('Please enter a valid email');
        return false;
      }

      if (!formData.password) {
        toast.error('Password is required for sub accounts');
        return false;
      }

      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return false;
      }
    }

    // Optional email validation for profile_only
    if (
      formData.email &&
      formData.accountType !== 'sub_account' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      toast.error('Please enter a valid email');
      return false;
    }

    // Phone validation (optional)
    if (
      formData.phoneNumber &&
      !/^\+?\d{10,15}$/.test(formData.phoneNumber.replace(/\s/g, ''))
    ) {
      toast.error('Please enter a valid phone number');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const payload = {
      name: formData.name.trim(),
      relationship: formData.relationship,
      dateOfBirth: formData.dateOfBirth || null,
      accountType: formData.accountType,
    };

    // ✅ Only include email/password/phone for sub_account
    if (formData.accountType === 'sub_account') {
      payload.email = formData.email.trim();
      payload.password = formData.password;
      payload.phoneNumber = formData.phoneNumber.trim() || null;
    } else {
      // For profile_only, email and phone are optional
      if (formData.email) {
        payload.email = formData.email.trim();
      }
      if (formData.phoneNumber) {
        payload.phoneNumber = formData.phoneNumber.trim();
      }
    }

    try {
      setLoading(true);
      const response = await api.post('/family-members', payload);

      if (response.data.success) {
        toast.success('Family member added successfully!');
        handleClose();
        onSuccess?.();
      } else {
        toast.error(response.data.message || 'Failed to add member');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      relationship: '',
      dateOfBirth: '',
      accountType: 'profile_only',
      password: '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Add Family Member</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {/* Basic Information */}
          <Alert severity="info">
            Add a family member to share documents and collaborate
          </Alert>

          <TextField
            fullWidth
            label="Full Name *"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <FormControl fullWidth required>
            <InputLabel>Relationship</InputLabel>
            <Select
              name="relationship"
              value={formData.relationship}
              onChange={handleChange}
              label="Relationship"
            >
              {relationships.map((rel) => (
                <MenuItem key={rel} value={rel}>
                  {rel}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Date of Birth"
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />

          {/* Account Type Selection */}
          <FormControl fullWidth required>
            <InputLabel>Account Type</InputLabel>
            <Select
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
              label="Account Type"
            >
              {accountTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Box>
                    <Typography variant="body1">{type.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {type.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Choose whether this person can login or just have a profile
            </FormHelperText>
          </FormControl>

          {/* Sub Account Specific Fields */}
          {formData.accountType === 'sub_account' && (
            <>
              <Alert severity="info">
                Sub accounts can login using their email and view documents shared with them
              </Alert>

              <TextField
                fullWidth
                label="Email *"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                helperText="Used for login (username will be email)"
              />

              <TextField
                fullWidth
                label="Password *"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                helperText="Minimum 6 characters"
              />

              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+919876543210"
                helperText="Optional - Format: 10 digits"
              />
            </>
          )}

          {/* Profile Only Optional Contact Info */}
          {formData.accountType === 'profile_only' && (
            <>
              <Divider />
              
              <Typography variant="subtitle2" color="text.secondary">
                Contact Information (Optional)
              </Typography>

              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                helperText="Optional – used for contact or invitations"
              />

              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+919876543210"
              />
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Adding...' : 'Add Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMemberDialog;