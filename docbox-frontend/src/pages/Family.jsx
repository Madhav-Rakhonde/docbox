import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button, Grid,
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, CircularProgress, TextField, MenuItem,
  FormControl, InputLabel, Select, FormHelperText,
  Alert, Divider,
} from '@mui/material';
import { PersonAdd, People } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import MemberCard from '../components/Family/MemberCard';
import AddMemberDialog from '../components/Family/AddMemberDialog';
import api from '../services/api';

const relationships = [
  'Father','Mother','Spouse','Son','Daughter','Brother','Sister',
  'Grandfather','Grandmother','Uncle','Aunt','Cousin','Child','Other',
];

const accountTypes = [
  { value: 'profile_only', label: 'Profile Only (No Login)',  description: 'Can be linked to documents but cannot login' },
  { value: 'sub_account',  label: 'Sub Account (Can Login)',  description: 'Can login and view their documents using email' },
];

const Family = () => {
  const navigate = useNavigate();
  const [members, setMembers]                 = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [addDialogOpen, setAddDialogOpen]     = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen]   = useState(false);
  const [selectedMember, setSelectedMember]   = useState(null);
  const [formData, setFormData] = useState({
    name: '', relationship: '', dateOfBirth: '',
    email: '', phoneNumber: '', accountType: 'profile_only', password: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/family-members');
      if (response.data.success) setMembers(response.data.data || []);
    } catch { toast.error('Failed to load family members'); }
    finally { setLoading(false); }
  };

  const handleEdit = (member) => {
    setSelectedMember(member);
    setFormData({
      name: member.name || '', relationship: member.relationship || '',
      dateOfBirth: member.dateOfBirth || '', email: member.user?.email || '',
      phoneNumber: member.user?.phoneNumber || '',
      accountType: member.accountType || 'profile_only', password: '',
    });
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (member) => { setSelectedMember(member); setDeleteDialogOpen(true); };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/family-members/${selectedMember.id}`);
      toast.success('Family member removed');
      setDeleteDialogOpen(false);
      setSelectedMember(null);
      loadMembers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove');
    }
  };

  const handleManagePermissions = (member) => { navigate(`/permissions?member=${member.id}`); };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.relationship) errors.relationship = 'Relationship is required';
    if (formData.accountType === 'sub_account') {
      if (!formData.email.trim()) errors.email = 'Email is required for sub accounts';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
      if (!selectedMember && !formData.password) errors.password = 'Password is required for new sub accounts';
      if (formData.password && formData.password.length < 6) errors.password = 'Minimum 6 characters';
    }
    if (formData.email && formData.accountType !== 'sub_account' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = 'Invalid email format';
    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, '')))
      errors.phoneNumber = 'Phone must be 10 digits';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async () => {
    if (!validateForm()) { toast.error('Please fix the errors'); return; }
    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(), relationship: formData.relationship,
        dateOfBirth: formData.dateOfBirth || null, accountType: formData.accountType,
      };
      if (formData.accountType === 'sub_account') {
        payload.email = formData.email.trim();
        payload.phoneNumber = formData.phoneNumber.trim() || null;
        if (formData.password) payload.password = formData.password;
      }
      const response = await api.put(`/family-members/${selectedMember.id}`, payload);
      if (response.data.success) {
        toast.success('Family member updated!');
        setEditDialogOpen(false);
        setSelectedMember(null);
        setFormData({ name:'',relationship:'',dateOfBirth:'',email:'',phoneNumber:'',accountType:'profile_only',password:'' });
        loadMembers();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally { setSubmitting(false); }
  };

  const setField = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

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
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: { xs: '1.75rem', sm: '2.25rem' },
            fontWeight: 400, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.25,
          }}>
            Family
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
            Manage family members and their document access
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAdd sx={{ fontSize: 16 }} />}
          onClick={() => setAddDialogOpen(true)}
          sx={{
            borderRadius: '10px', px: 2.5, py: 1.1, fontWeight: 600,
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)', transform: 'translateY(-1px)', boxShadow: '0 6px 16px rgba(99,102,241,0.35)' },
          }}
        >
          Add Member
        </Button>
      </Box>

      {/* Members Grid */}
      {members.length > 0 ? (
        <Grid container spacing={2.5}>
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
        <Box sx={{
          textAlign: 'center', py: 10,
          border: '2px dashed #E2E8F0', borderRadius: '16px',
          background: '#FAFBFC',
        }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: '20px',
            background: 'rgba(99,102,241,0.08)', mx: 'auto', mb: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <People sx={{ fontSize: 32, color: '#6366F1' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', mb: 0.5 }}>
            No family members yet
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8', mb: 3, maxWidth: 340, mx: 'auto' }}>
            Add family members to share and manage documents together
          </Typography>
          <Button
            variant="contained" startIcon={<PersonAdd sx={{ fontSize: 16 }} />}
            onClick={() => setAddDialogOpen(true)}
            sx={{
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' },
            }}
          >
            Add Your First Member
          </Button>
        </Box>
      )}

      {/* Add Member Dialog */}
      <AddMemberDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} onSuccess={loadMembers} />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}>
        <DialogTitle sx={{ pt: 3, px: 3, fontWeight: 700 }}>Edit Family Member</DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
            <TextField
              label="Full Name" value={formData.name} onChange={setField('name')}
              error={!!formErrors.name} helperText={formErrors.name} fullWidth required
            />
            <FormControl fullWidth required error={!!formErrors.relationship}>
              <InputLabel>Relationship</InputLabel>
              <Select value={formData.relationship} onChange={setField('relationship')} label="Relationship">
                {relationships.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
              {formErrors.relationship && <FormHelperText>{formErrors.relationship}</FormHelperText>}
            </FormControl>
            <TextField
              label="Date of Birth" type="date" value={formData.dateOfBirth}
              onChange={setField('dateOfBirth')} InputLabelProps={{ shrink: true }} fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>Account Type</InputLabel>
              <Select value={formData.accountType} onChange={setField('accountType')} label="Account Type">
                {accountTypes.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    <Box>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>{t.label}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{t.description}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Choose whether this person can login or just have a profile</FormHelperText>
            </FormControl>

            {formData.accountType === 'sub_account' && (
              <>
                <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.85rem' }}>
                  Sub accounts can login using their email and view shared documents
                </Alert>
                <TextField label="Email" type="email" value={formData.email} onChange={setField('email')}
                  error={!!formErrors.email} helperText={formErrors.email || 'Used for login'} fullWidth required />
                <TextField label="Password" type="password" value={formData.password} onChange={setField('password')}
                  error={!!formErrors.password} helperText={formErrors.password || 'Leave blank to keep current'} fullWidth required={!selectedMember} />
                <TextField label="Phone Number" value={formData.phoneNumber} onChange={setField('phoneNumber')}
                  error={!!formErrors.phoneNumber} helperText={formErrors.phoneNumber || 'Optional — 10 digits'} fullWidth />
              </>
            )}

            {formData.accountType === 'profile_only' && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contact Info (Optional)
                </Typography>
                <TextField label="Email" type="email" value={formData.email} onChange={setField('email')}
                  error={!!formErrors.email} helperText={formErrors.email} fullWidth />
                <TextField label="Phone Number" value={formData.phoneNumber} onChange={setField('phoneNumber')}
                  error={!!formErrors.phoneNumber} helperText={formErrors.phoneNumber || '10 digits'} fullWidth />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setEditDialogOpen(false)}
            sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleEditSubmit} disabled={submitting}
            sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' } }}>
            {submitting ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Update Member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}>
        <DialogTitle sx={{ pt: 3, px: 3, fontWeight: 700 }}>Remove Family Member?</DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <DialogContentText sx={{ color: '#475569', fontSize: '0.9rem' }}>
            Are you sure you want to remove <strong style={{ color: '#0F172A' }}>{selectedMember?.name}</strong>? They will lose access to shared documents.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}
            sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained"
            sx={{ borderRadius: '8px', background: '#EF4444', '&:hover': { background: '#DC2626' } }}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Family;