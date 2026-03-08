import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, IconButton, Alert,
  FormControl, InputLabel, Select, MenuItem, FormHelperText, Divider, CircularProgress,
} from '@mui/material';
import { Close, PersonAdd } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

const relationships = [
  'Spouse','Child','Parent','Sibling','Grandparent','Grandchild',
  'Father','Mother','Son','Daughter','Brother','Sister',
  'Uncle','Aunt','Cousin','Other',
];

const accountTypes = [
  { value: 'profile_only', label: 'Profile Only (No Login)',  description: 'Can be linked to documents but cannot login' },
  { value: 'sub_account',  label: 'Sub Account (Can Login)',   description: 'Can login and view their documents using email' },
];

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    '& fieldset': { borderColor: '#E2E8F0' },
    '&:hover fieldset': { borderColor: '#6366F1' },
    '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: '1.5px' },
  },
};

const selectSx = {
  borderRadius: '10px',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366F1' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366F1', borderWidth: '1.5px' },
};

const SectionLabel = ({ children }) => (
  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B',
    textTransform: 'uppercase', letterSpacing: '0.07em', mb: -0.5 }}>
    {children}
  </Typography>
);

const AddMemberDialog = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phoneNumber: '', relationship: '',
    dateOfBirth: '', accountType: 'profile_only', password: '',
  });

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const validateForm = () => {
    if (!formData.name.trim())     { toast.error('Name is required'); return false; }
    if (!formData.relationship)    { toast.error('Relationship is required'); return false; }
    if (formData.accountType === 'sub_account') {
      if (!formData.email.trim())  { toast.error('Email is required for sub accounts'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { toast.error('Please enter a valid email'); return false; }
      if (!formData.password)      { toast.error('Password is required for sub accounts'); return false; }
      if (formData.password.length < 6) { toast.error('Password must be at least 6 characters'); return false; }
    }
    if (formData.email && formData.accountType !== 'sub_account' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email'); return false;
    }
    if (formData.phoneNumber && !/^\+?\d{10,15}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      toast.error('Please enter a valid phone number'); return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const payload = {
      name: formData.name.trim(), relationship: formData.relationship,
      dateOfBirth: formData.dateOfBirth || null, accountType: formData.accountType,
    };
    if (formData.accountType === 'sub_account') {
      payload.email = formData.email.trim();
      payload.password = formData.password;
      payload.phoneNumber = formData.phoneNumber.trim() || null;
    } else {
      if (formData.email)       payload.email = formData.email.trim();
      if (formData.phoneNumber) payload.phoneNumber = formData.phoneNumber.trim();
    }
    try {
      setLoading(true);
      const response = await api.post('/family-members', payload);
      if (response.data.success) { toast.success('Family member added!'); handleClose(); onSuccess?.(); }
      else toast.error(response.data.message || 'Failed to add member');
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to add member'); }
    finally { setLoading(false); }
  };

  const handleClose = () => {
    setFormData({ name:'', email:'', phoneNumber:'', relationship:'', dateOfBirth:'', accountType:'profile_only', password:'' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}>

      <DialogTitle sx={{ pt: 3, px: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: '9px', background: 'rgba(99,102,241,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PersonAdd sx={{ fontSize: 16, color: '#6366F1' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>
              Add Family Member
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small"
            sx={{ color: '#94A3B8', '&:hover': { background: '#F1F5F9' } }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.825rem' }}>
            Add a family member to share documents and collaborate
          </Alert>

          <SectionLabel>Basic Information</SectionLabel>

          <TextField fullWidth label="Full Name *" name="name"
            value={formData.name} onChange={handleChange} sx={fieldSx} />

          <FormControl fullWidth required>
            <InputLabel>Relationship</InputLabel>
            <Select name="relationship" value={formData.relationship}
              onChange={handleChange} label="Relationship" sx={selectSx}>
              {relationships.map((rel) => (
                <MenuItem key={rel} value={rel} sx={{ fontSize: '0.875rem' }}>{rel}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField fullWidth label="Date of Birth" name="dateOfBirth" type="date"
            value={formData.dateOfBirth} onChange={handleChange}
            InputLabelProps={{ shrink: true }} sx={fieldSx} />

          <SectionLabel>Account Type</SectionLabel>

          <FormControl fullWidth required>
            <InputLabel>Account Type</InputLabel>
            <Select name="accountType" value={formData.accountType}
              onChange={handleChange} label="Account Type" sx={selectSx}>
              {accountTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Box>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A' }}>
                      {type.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                      {type.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Choose whether this person can login or just have a profile</FormHelperText>
          </FormControl>

          {/* Sub-account fields */}
          {formData.accountType === 'sub_account' && (
            <>
              <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.8rem' }}>
                Sub accounts can login using their email and view shared documents
              </Alert>
              <TextField fullWidth label="Email *" name="email" type="email"
                value={formData.email} onChange={handleChange}
                helperText="Used for login" sx={fieldSx} />
              <TextField fullWidth label="Password *" name="password" type="password"
                value={formData.password} onChange={handleChange}
                helperText="Minimum 6 characters" sx={fieldSx} />
              <TextField fullWidth label="Phone Number" name="phoneNumber"
                value={formData.phoneNumber} onChange={handleChange}
                placeholder="+919876543210" helperText="Optional · 10 digits" sx={fieldSx} />
            </>
          )}

          {/* Profile-only optional fields */}
          {formData.accountType === 'profile_only' && (
            <>
              <Divider />
              <SectionLabel>Contact Information (Optional)</SectionLabel>
              <TextField fullWidth label="Email" name="email" type="email"
                value={formData.email} onChange={handleChange}
                helperText="Optional – for contact or invitations" sx={fieldSx} />
              <TextField fullWidth label="Phone Number" name="phoneNumber"
                value={formData.phoneNumber} onChange={handleChange}
                placeholder="+919876543210" sx={fieldSx} />
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading}
          sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}
          sx={{ borderRadius: '8px', fontWeight: 600,
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' } }}>
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Add Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMemberDialog;