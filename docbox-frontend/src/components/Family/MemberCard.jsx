import React, { useState } from 'react';
import {
  Box, Typography, IconButton, Avatar,
  Menu, MenuItem, ListItemIcon, ListItemText, Divider,
} from '@mui/material';
import {
  MoreVert, Email, Phone, Edit, Delete, Security,
  CheckCircle, Pending, LockOpen, Lock,
} from '@mui/icons-material';

const getInitials = (name) =>
  (name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const RolePill = ({ isSubAccount }) => (
  <Box sx={{
    display: 'inline-flex', alignItems: 'center', gap: 0.5,
    px: 1, py: 0.25, borderRadius: '5px',
    background: isSubAccount ? 'rgba(16,185,129,0.1)' : '#F1F5F9',
    border: `1px solid ${isSubAccount ? 'rgba(16,185,129,0.25)' : '#E2E8F0'}`,
  }}>
    {isSubAccount
      ? <LockOpen sx={{ fontSize: 11, color: '#10B981' }} />
      : <Lock sx={{ fontSize: 11, color: '#94A3B8' }} />}
    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700,
      color: isSubAccount ? '#10B981' : '#94A3B8' }}>
      {isSubAccount ? 'Can Login' : 'Profile Only'}
    </Typography>
  </Box>
);

const DetailRow = ({ icon: Icon, value }) =>
  value ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
      <Icon sx={{ fontSize: 13, color: '#94A3B8', flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.78rem', color: '#64748B',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </Typography>
    </Box>
  ) : null;

const MemberCard = ({ member, onEdit, onDelete, onManagePermissions }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen  = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleAction    = (action) => { handleMenuClose(); action(); };

  const isSubAccount  = member.isSubAccount || member.accountType === 'sub_account' || member.user;
  const displayEmail  = member.user?.email || member.email || 'No email';
  const displayPhone  = member.user?.phoneNumber || member.phoneNumber;
  const accountStatus = member.user?.isActive ? 'Active' : (member.status || 'Active');

  const avatarBg = isSubAccount
    ? 'linear-gradient(135deg, #10B981, #059669)'
    : 'linear-gradient(135deg, #6366F1, #818CF8)';

  return (
    <>
      <Box sx={{
        borderRadius: '14px', border: '1px solid #E2E8F0', background: 'white',
        overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
      }}>
        {/* Accent strip */}
        <Box sx={{ height: 3, background: isSubAccount
          ? 'linear-gradient(90deg, #10B981, #34D399)'
          : 'linear-gradient(90deg, #6366F1, #818CF8)' }} />

        <Box sx={{ p: 2.5, flex: 1 }}>
          {/* Header row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 44, height: 44, background: avatarBg, fontWeight: 700, fontSize: '0.95rem' }}>
                {getInitials(member.name || member.fullName)}
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', lineHeight: 1.2 }}>
                  {member.name || member.fullName || 'Unknown'}
                </Typography>
                <Box sx={{ display: 'inline-flex', mt: 0.25, px: 1, py: 0.15, borderRadius: '4px',
                  background: 'rgba(99,102,241,0.08)' }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: '#6366F1' }}>
                    {member.relationship || 'Family'}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <IconButton size="small" onClick={handleMenuOpen}
              sx={{ color: '#94A3B8', '&:hover': { background: '#F1F5F9', color: '#0F172A' } }}>
              <MoreVert sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* Role + Status badges */}
          <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
            <RolePill isSubAccount={isSubAccount} />
            {member.user && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5,
                px: 1, py: 0.25, borderRadius: '5px', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                <CheckCircle sx={{ fontSize: 10, color: '#10B981' }} />
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#10B981' }}>
                  {accountStatus}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Contact rows */}
          <DetailRow icon={Email} value={displayEmail} />
          <DetailRow icon={Phone} value={displayPhone} />
          {member.dateOfBirth && (
            <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', mt: 0.5 }}>
              Born {new Date(member.dateOfBirth).toLocaleDateString()}
            </Typography>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 2.5, pb: 2, borderTop: '1px solid #F1F5F9', pt: 1.5 }}>
          <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>
            Added {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'Unknown'}
          </Typography>
        </Box>
      </Box>

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
        PaperProps={{ sx: { borderRadius: '12px', border: '1px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(15,23,42,0.1)', minWidth: 180 } }}>
        <MenuItem onClick={() => handleAction(() => onEdit(member))} sx={{ fontSize: '0.875rem' }}>
          <ListItemIcon><Edit sx={{ fontSize: 16, color: '#6366F1' }} /></ListItemIcon>
          <ListItemText>Edit Details</ListItemText>
        </MenuItem>
        {isSubAccount && (
          <MenuItem onClick={() => handleAction(() => onManagePermissions(member))} sx={{ fontSize: '0.875rem' }}>
            <ListItemIcon><Security sx={{ fontSize: 16, color: '#10B981' }} /></ListItemIcon>
            <ListItemText>Manage Permissions</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => handleAction(() => onDelete(member))} sx={{ fontSize: '0.875rem', color: '#EF4444' }}>
          <ListItemIcon><Delete sx={{ fontSize: 16, color: '#EF4444' }} /></ListItemIcon>
          <ListItemText>Remove Member</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default MemberCard;