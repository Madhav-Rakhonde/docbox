import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Avatar,
  Box,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MoreVert,
  Email,
  Phone,
  Edit,
  Delete,
  Security,
  CheckCircle,
  Pending,
  LockOpen,
  Lock,
  PersonAdd,
  Person,
} from '@mui/icons-material';

const MemberCard = ({ member, onEdit, onDelete, onManagePermissions }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    handleMenuClose();
    action();
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircle />;
      case 'pending':
        return <Pending />;
      default:
        return null;
    }
  };

  // ✅ Determine if member is a sub-account
  const isSubAccount = member.isSubAccount || member.accountType === 'sub_account' || member.user;

  // ✅ Get display email
  const displayEmail = member.user?.email || member.email || 'No email';

  // ✅ Get display phone
  const displayPhone = member.user?.phoneNumber || member.phoneNumber;

  // ✅ Get account status
  const accountStatus = member.user?.isActive ? 'Active' : (member.status || 'Active');

  return (
    <>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: isSubAccount ? 'success.main' : 'primary.main',
                fontSize: '1.25rem',
              }}
            >
              {getInitials(member.name || member.fullName || 'U')}
            </Avatar>
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVert />
            </IconButton>
          </Box>

          <Typography variant="h6" gutterBottom noWrap>
            {member.name || member.fullName || 'Unknown'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={member.relationship || 'Family'}
              size="small"
              color="primary"
              variant="outlined"
            />
            
            {/* ✅ Account Type Indicator */}
            {isSubAccount ? (
              <Chip
                icon={<LockOpen />}
                label="Can Login"
                size="small"
                color="success"
                variant="outlined"
              />
            ) : (
              <Chip
                icon={<Lock />}
                label="Profile Only"
                size="small"
                color="default"
                variant="outlined"
              />
            )}

            {/* Status Chip */}
            {member.user && (
              <Chip
                icon={getStatusIcon(accountStatus)}
                label={accountStatus}
                size="small"
                color={getStatusColor(accountStatus)}
              />
            )}
          </Box>

          {/* Email */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Email fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" noWrap>
              {displayEmail}
            </Typography>
          </Box>

          {/* Phone */}
          {displayPhone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Phone fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {displayPhone}
              </Typography>
            </Box>
          )}

          {/* Date of Birth */}
          {member.dateOfBirth && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Born: {new Date(member.dateOfBirth).toLocaleDateString()}
            </Typography>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Added: {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'Unknown'}
          </Typography>
        </CardActions>
      </Card>

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleAction(() => onEdit(member))}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Details</ListItemText>
        </MenuItem>
        
        {isSubAccount && (
          <MenuItem onClick={() => handleAction(() => onManagePermissions(member))}>
            <ListItemIcon>
              <Security fontSize="small" />
            </ListItemIcon>
            <ListItemText>Manage Permissions</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem onClick={() => handleAction(() => onDelete(member))} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Remove Member</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default MemberCard;