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
  });

  const relationships = [
    'Spouse',
    'Child',
    'Parent',
    'Sibling',
    'Grandparent',
    'Grandchild',
    'Other',
  ];

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    // Required field validation
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    // Email validation (optional but if present must be valid)
    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      toast.error('Please enter a valid email');
      return;
    }

    // Phone validation (optional)
    if (
      formData.phoneNumber &&
      !/^\+?\d{10,15}$/.test(formData.phoneNumber.replace(/\s/g, ''))
    ) {
      toast.error('Please enter a valid phone number');
      return;
    }

    const payload = {
      name: formData.name.trim(),              // ✅ BACKEND EXPECTS THIS
      email: formData.email.trim() || null,
      phoneNumber: formData.phoneNumber.trim() || null,
      relationship: formData.relationship || null,
    };

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
        <Alert severity="info" sx={{ mb: 2 }}>
          Add a family member to share documents and collaborate
        </Alert>

        <TextField
          fullWidth
          label="Full Name *"
          name="name"
          value={formData.name}
          onChange={handleChange}
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          margin="normal"
          helperText="Optional – used for contact or invitations"
        />

        <TextField
          fullWidth
          label="Phone Number"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          margin="normal"
          placeholder="+919876543210"
        />

        <TextField
          select
          fullWidth
          label="Relationship"
          name="relationship"
          value={formData.relationship}
          onChange={handleChange}
          margin="normal"
        >
          {relationships.map((rel) => (
            <MenuItem key={rel} value={rel}>
              {rel}
            </MenuItem>
          ))}
        </TextField>
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
