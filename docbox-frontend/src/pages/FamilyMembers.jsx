import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button, Grid, Card, CardContent,
  IconButton, Avatar, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress, Alert,
  FormControl, InputLabel, Select, FormHelperText, Divider,
  Menu, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  Add, Edit, Delete, Person, Email, Phone, Cake,
  SupervisorAccount, MoreVert, Security, Lock, LockOpen,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const RELATIONSHIPS = [
  'Father','Mother','Spouse','Son','Daughter','Brother','Sister',
  'Grandfather','Grandmother','Uncle','Aunt','Cousin','Child','Other',
];

const ROLES = [
  { value: 'PROFILE_ONLY', label: 'Profile Only (No Login)',  description: 'Can be linked to documents but cannot login' },
  { value: 'SUB_ACCOUNT',  label: 'Sub Account (Can Login)',  description: 'Can login and view their documents' },
];

const ROLE_CONFIG = {
  PRIMARY_ACCOUNT: { label: 'Primary Account', color: '#6366F1', bg: '#EEF2FF' },
  SUB_ACCOUNT:     { label: 'Can Login',        color: '#10B981', bg: '#ECFDF5' },
  PROFILE_ONLY:    { label: 'Profile Only',     color: '#64748B', bg: '#F8FAFC' },
};

const getRoleConfig = (role) => ROLE_CONFIG[role] || ROLE_CONFIG.PROFILE_ONLY;

// ─── Member Card ──────────────────────────────────────────────────────────────
const MemberCard = ({ member, role, onMenuOpen }) => {
  const rc = getRoleConfig(role);
  return (
    <Card elevation={0} sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      borderRadius: '14px', border: '1px solid #E2E8F0', position: 'relative',
      transition: 'transform 200ms ease, box-shadow 200ms ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
    }}>
      {/* Top accent */}
      <Box sx={{ height: 3, background: rc.color, borderRadius: '14px 14px 0 0' }} />

      <IconButton size="small" onClick={(e) => onMenuOpen(e, member)}
        sx={{ position: 'absolute', top: 10, right: 8, color: '#94A3B8', '&:hover': { color: '#475569', background: '#F1F5F9' } }}>
        <MoreVert sx={{ fontSize: 18 }} />
      </IconButton>

      <CardContent sx={{ flex: 1, p: 2.5, pt: 2 }}>
        {/* Avatar + Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar sx={{
            width: 48, height: 48, flexShrink: 0,
            background: `linear-gradient(135deg, ${rc.color}cc, ${rc.color})`,
            fontWeight: 700, fontSize: '1.1rem',
          }}>
            {member.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: 'hidden', flex: 1, pr: 3 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {member.name}
            </Typography>
            <Box sx={{ display: 'inline-flex', mt: 0.25, px: 1, py: 0.2, borderRadius: '4px',
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#6366F1' }}>
                {member.relationship}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* Role chip */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {role === 'SUB_ACCOUNT'
            ? <LockOpen sx={{ fontSize: 14, color: rc.color }} />
            : <Lock sx={{ fontSize: 14, color: rc.color }} />
          }
          <Box sx={{ px: 1, py: 0.2, borderRadius: '4px', background: rc.bg, border: `1px solid ${rc.color}25` }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: rc.color }}>
              {rc.label}
            </Typography>
          </Box>
          {role === 'SUB_ACCOUNT' && (
            <Box sx={{ ml: 'auto', px: 1, py: 0.2, borderRadius: '4px', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#059669', letterSpacing: '0.05em' }}>ACTIVE</Typography>
            </Box>
          )}
        </Box>

        {/* Details */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1.5 }}>
          {[
            { icon: Email, value: member.email || 'No email' },
            member.phoneNumber && { icon: Phone, value: member.phoneNumber },
            member.dateOfBirth && { icon: Cake, value: new Date(member.dateOfBirth).toLocaleDateString('en-IN') },
            member.username && { icon: Person, value: `@${member.username}` },
          ].filter(Boolean).map(({ icon: Icon, value }) => (
            <Box key={value} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon sx={{ fontSize: 13, color: '#CBD5E1', flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.78rem', color: '#64748B',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>

      <Box sx={{ px: 2.5, pb: 2, borderTop: '1px solid #F1F5F9', pt: 1.5 }}>
        <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
          Added {member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-IN') : 'N/A'}
        </Typography>
      </Box>
    </Card>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const FamilyMembers = () => {
  const navigate = useNavigate();
  const [members, setMembers]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [anchorEl, setAnchorEl]           = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '', relationship: '', dateOfBirth: '',
    email: '', phoneNumber: '', role: 'PROFILE_ONLY', username: '', password: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadMembers(); }, []);

  const deriveRole = (m) => {
    if (m.role === 'PRIMARY_ACCOUNT') return 'PRIMARY_ACCOUNT';
    if (m.userId || m.user_id) return 'SUB_ACCOUNT';
    return 'PROFILE_ONLY';
  };

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/family-members');
      if (response.data.success) {
        const raw = response.data.data || [];
        setMembers(raw.map((m) => ({ ...m, role: deriveRole(m) })));
      }
    } catch { toast.error('Failed to load family members'); }
    finally { setLoading(false); }
  };

  const handleMenuOpen = (e, m) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setSelectedMember(m); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedMember(null); };

  const handleEditClick = () => { handleMenuClose(); handleOpenDialog(selectedMember); };
  const handleManagePermissionsClick = () => { handleMenuClose(); navigate(`/permissions?member=${selectedMember.id}`); };
  const handleDeleteClick = () => { handleMenuClose(); handleDelete(selectedMember.id); };

  const handleOpenDialog = (member = null) => {
    if (member) {
      setEditingMember(member);
      const memberRole = deriveRole(member);
      setFormData({ name: member.name || '', relationship: member.relationship || '',
        dateOfBirth: member.dateOfBirth || '', email: member.email || '',
        phoneNumber: member.phoneNumber || '', role: memberRole,
        username: member.username || '', password: '' });
    } else {
      setEditingMember(null);
      setFormData({ name:'',relationship:'',dateOfBirth:'',email:'',phoneNumber:'',role:'PROFILE_ONLY',username:'',password:'' });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false); setEditingMember(null);
    setFormData({ name:'',relationship:'',dateOfBirth:'',email:'',phoneNumber:'',role:'PROFILE_ONLY',username:'',password:'' });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.relationship) errors.relationship = 'Relationship is required';
    if (formData.role === 'SUB_ACCOUNT') {
      if (!formData.username.trim()) errors.username = 'Username is required for sub accounts';
      if (!editingMember && !formData.password) errors.password = 'Password is required for new sub accounts';
      if (formData.password && formData.password.length < 6) errors.password = 'Minimum 6 characters';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) errors.phoneNumber = 'Phone must be 10 digits';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) { toast.error('Please fix the errors'); return; }
    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(), relationship: formData.relationship,
        dateOfBirth: formData.dateOfBirth || null, email: formData.email.trim() || null,
        phoneNumber: formData.phoneNumber.trim() || null, role: formData.role,
        accountType: formData.role, isSubAccount: formData.role === 'SUB_ACCOUNT',
      };
      if (formData.role === 'SUB_ACCOUNT') {
        payload.username = formData.username.trim();
        if (formData.password?.trim()) payload.password = formData.password;
      }
      let response;
      if (editingMember) {
        response = await api.put(`/family-members/${editingMember.id}`, payload);
        if (response.data.success) { toast.success('Updated!'); handleCloseDialog(); await loadMembers(); }
        else toast.error(response.data.message || 'Failed to update');
      } else {
        response = await api.post('/family-members', payload);
        if (response.data.success) { toast.success('Added!'); handleCloseDialog(); await loadMembers(); }
        else toast.error(response.data.message || 'Failed to add');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this family member?')) return;
    try {
      await api.delete(`/family-members/${memberId}`);
      toast.success('Deleted!');
      loadMembers();
    } catch { toast.error('Failed to delete'); }
  };

  const sf = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

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
          <Typography sx={{ fontFamily: "'DM Serif Display', serif", fontSize: { xs: '1.75rem', sm: '2.25rem' },
            fontWeight: 400, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2, mb: 0.25 }}>
            Family Members
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
            Manage your family members and their document access
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add sx={{ fontSize: 16 }} />} onClick={() => handleOpenDialog()}
          sx={{ borderRadius: '10px', px: 2.5, py: 1.1, fontWeight: 600,
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)', transform: 'translateY(-1px)', boxShadow: '0 6px 16px rgba(99,102,241,0.35)' } }}>
          Add Member
        </Button>
      </Box>

      {/* Info */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: '10px', fontSize: '0.85rem' }}>
        <strong>Profile Only:</strong> Stored for document organization — cannot login. &nbsp;
        <strong>Sub Account:</strong> Can login and view documents shared with them.
      </Alert>

      {/* Grid */}
      {members.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, border: '2px dashed #E2E8F0', borderRadius: '16px', background: '#FAFBFC' }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '20px', background: 'rgba(99,102,241,0.08)', mx: 'auto', mb: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SupervisorAccount sx={{ fontSize: 32, color: '#6366F1' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', mb: 0.5 }}>No Family Members</Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#94A3B8', mb: 3, maxWidth: 340, mx: 'auto' }}>
            Add family members to organize and share documents with them
          </Typography>
          <Button variant="contained" startIcon={<Add sx={{ fontSize: 16 }} />} onClick={() => handleOpenDialog()}
            sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
            Add First Member
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {members.map((member) => (
            <Grid item xs={12} sm={6} md={4} key={member.id}>
              <MemberCard member={member} role={deriveRole(member)} onMenuOpen={handleMenuOpen} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
        PaperProps={{ elevation: 3, sx: { borderRadius: '12px', border: '1px solid #E2E8F0', minWidth: 180 } }}>
        <MenuItem onClick={handleEditClick} sx={{ fontSize: '0.875rem', gap: 1.5, borderRadius: '6px', mx: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 'unset' }}><Edit sx={{ fontSize: 16, color: '#6366F1' }} /></ListItemIcon>
          <ListItemText>Edit Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleManagePermissionsClick} sx={{ fontSize: '0.875rem', gap: 1.5, borderRadius: '6px', mx: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 'unset' }}><Security sx={{ fontSize: 16, color: '#10B981' }} /></ListItemIcon>
          <ListItemText>Manage Permissions</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleDeleteClick} sx={{ fontSize: '0.875rem', gap: 1.5, color: '#EF4444', borderRadius: '6px', mx: 0.5, mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 'unset' }}><Delete sx={{ fontSize: 16, color: '#EF4444' }} /></ListItemIcon>
          <ListItemText>Remove Member</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 0.5 } }}>
        <DialogTitle sx={{ pt: 3, px: 3, fontWeight: 700 }}>
          {editingMember ? 'Edit Family Member' : 'Add Family Member'}
        </DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
            <TextField label="Full Name" value={formData.name} onChange={sf('name')}
              error={!!formErrors.name} helperText={formErrors.name} fullWidth required />
            <FormControl fullWidth required error={!!formErrors.relationship}>
              <InputLabel>Relationship</InputLabel>
              <Select value={formData.relationship} onChange={sf('relationship')} label="Relationship">
                {RELATIONSHIPS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
              {formErrors.relationship && <FormHelperText>{formErrors.relationship}</FormHelperText>}
            </FormControl>
            <TextField label="Date of Birth" type="date" value={formData.dateOfBirth}
              onChange={sf('dateOfBirth')} InputLabelProps={{ shrink: true }} fullWidth />
            <FormControl fullWidth required>
              <InputLabel>Account Type</InputLabel>
              <Select value={formData.role} onChange={sf('role')} label="Account Type">
                {ROLES.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    <Box>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 500 }}>{r.label}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{r.description}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {formData.role === 'SUB_ACCOUNT' && (
              <>
                <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.85rem' }}>
                  Sub accounts can login and view documents shared with them
                </Alert>
                <TextField label="Username" value={formData.username} onChange={sf('username')}
                  error={!!formErrors.username} helperText={formErrors.username || 'Used for login'} fullWidth required />
                <TextField label="Password" type="password" value={formData.password} onChange={sf('password')}
                  error={!!formErrors.password}
                  helperText={formErrors.password || (editingMember ? 'Leave blank to keep current' : 'Min. 6 characters')}
                  fullWidth required={!editingMember} />
              </>
            )}

            <Divider sx={{ my: 0.5 }} />
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Contact (Optional)
            </Typography>
            <TextField label="Email" type="email" value={formData.email} onChange={sf('email')}
              error={!!formErrors.email} helperText={formErrors.email} fullWidth />
            <TextField label="Phone Number" value={formData.phoneNumber} onChange={sf('phoneNumber')}
              error={!!formErrors.phoneNumber} helperText={formErrors.phoneNumber || '10 digits'} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={handleCloseDialog} sx={{ borderRadius: '8px', color: '#64748B', '&:hover': { background: '#F1F5F9' } }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}
            sx={{ borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #4338CA)' } }}>
            {submitting ? <CircularProgress size={18} sx={{ color: 'white' }} /> : `${editingMember ? 'Update' : 'Add'} Member`}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FamilyMembers;